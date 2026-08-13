/**
 * API endpoint: GET /api/clients/[id]/ai/[sessionId]/pdf
 * 
 * Genera y descarga el PDF de recomendaciones de salud para un cliente.
 * Accesible desde el enlace del email (sin autenticación de coach).
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { lookup } from 'node:dns/promises';
import { getHealthFormsCollection, connectMongoose } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { decrypt, safeDecrypt, decryptFileObject } from '@/app/lib/encryption';
import { generateRecommendationPDF } from '@/app/lib/recommendation-pdf';
import type { PDFRecommendationData, PDFRecipeData, PDFExerciseData } from '@/app/lib/recommendation-pdf';
import { translatePDFContent, translateSessionContent, detectLanguage, normalizeClientLang, defaultLLM, LANG_LABELS, SupportedLang } from '@/app/lib/recommendation-translator';
import Coach from '@/app/models/Coach';
import Recipe from '@/app/models/Recipe';
import Exercise from '@/app/models/Exercise';
import { apiHandler } from '@/app/lib/apiHandler';
import { getPresignedUrlForAnalysis } from '@/app/lib/s3';

/**
 * ─── Protección SSRF ───
 * fetchImageBuffer descarga URLs guardadas en DB (S3 presigned, Cloudinary, etc.).
 * Para evitar que una URL maliciosa apunte a metadata de la nube (169.254.169.254),
 * IPs privadas o localhost, validamos: solo https + resolución DNS pública.
 */

/** Devuelve true si la IP es privada/loopback/link-local/metadata/global broadcast. */
function isBlockedIp(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // IPv6: loopback ::1, unspecified ::, link-local fe80::/10, unique local fc00::/7,
  // e IPv4-mapped (::ffff:a.b.c.d)
  if (normalized.includes(':')) {
    if (normalized === '::1' || normalized === '::' || normalized.startsWith('fe80:')) return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4Mapped) return isBlockedIp(v4Mapped[1]);
    return false;
  }

  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  // 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10 (CGNAT), 127.0.0.0/8, 169.254.0.0/16
  // (incluye metadata AWS 169.254.169.254), 172.16.0.0/12, 192.0.0.0/24,
  // 192.168.0.0/16, 198.18.0.0/15 (benchmark), multicast 224.0.0.0/4, reservado 240.0.0.0/4
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 168 || b === 0)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

/** Valida que una URL sea descargable de forma segura (https + IPs públicas). */
async function isSafeFetchUrl(urlStr: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return false;
  }

  // Solo https — nunca http plano ni otros esquemas (file:, gopher:, etc.)
  if (url.protocol !== 'https:') return false;

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return false;
  }

  // IP literal → validar directamente
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) {
    return !isBlockedIp(hostname);
  }

  // Hostname → resolver DNS y exigir que TODAS las IPs sean públicas
  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isBlockedIp(address));
  } catch {
    return false;
  }
}

/**
 * Descarga una imagen (desde S3 o URL pública) y la convierte a JPEG si es necesario,
 * garantizando que PDFKit no crashee por formatos no soportados como WebP.
 */
async function fetchImageBuffer(urlOrKey: string | undefined): Promise<Buffer | undefined> {
  if (!urlOrKey) return undefined;
  try {
    let finalUrl = urlOrKey;
    // Si no empieza con http, asumimos que es una key de S3
    if (!urlOrKey.startsWith('http')) {
      finalUrl = await getPresignedUrlForAnalysis(urlOrKey);
    }

    // Protección SSRF: solo https + IPs públicas
    if (!(await isSafeFetchUrl(finalUrl))) {
      logger.warn('PDF', `Imagen ignorada por validación SSRF: ${finalUrl?.substring(0, 120)}`);
      return undefined;
    }

    const resp = await fetch(finalUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return undefined;
    
    let buf = Buffer.from(await resp.arrayBuffer());
    
    // Validar Magic Bytes para JPEG o PNG (los únicos nativos de PDFKit)
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    
    if (!isJpeg && !isPng) {
      try {
        // Usa sharp (integrado en el entorno de Next) para convertir WebP/AVIF a JPEG
        const sharp = (await import('sharp')).default;
        buf = await sharp(buf).jpeg().toBuffer();
      } catch (e) {
        // Si no se puede convertir, descartamos el buffer para evitar el "Unknown image format"
        return undefined;
      }
    }
    return buf;
  } catch (err) {
    return undefined;
  }
}

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { id: clientId, sessionId } = await params;
  const requestId = crypto.randomUUID();
  const loggerWithContext = logger.withContext({ requestId, clientId, sessionId, endpoint: 'pdf' });

  try {
    loggerWithContext.info('PDF', '📄 Iniciando generación de PDF de recomendaciones');

    const healthForms = await getHealthFormsCollection();
    await connectMongoose();

    // ── 1. Obtener cliente y sesión ──
    const client = await healthForms.findOne({
      _id: new ObjectId(clientId),
      'aiProgress.sessions.sessionId': sessionId,
    });

    if (!client || !client.aiProgress) {
      loggerWithContext.warn('PDF', 'Cliente o progreso no encontrado');
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const session = (() => {
      const raw = client.aiProgress.sessions.find(
        (s: any) => s.sessionId === sessionId
      );
      if (!raw) return null;
      return raw.toObject ? raw.toObject() : JSON.parse(JSON.stringify(raw));
    })();

    if (!session) {
      loggerWithContext.warn('PDF', 'Sesión no encontrada');
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // ── 2. Desencriptar datos de la sesión ──
    const summary = safeDecrypt(session.summary) || '';
    const vision = safeDecrypt(session.vision) || '';
    const medicalSummary = safeDecrypt(session.medicalSummary) || '';
    const medicalComparativeAnalysis = safeDecrypt(session.medicalComparativeAnalysis) || '';
    const labResults = (session.labResults || []).map((lab: any) => ({
      name: safeDecrypt(lab.name) || lab.name,
      value: safeDecrypt(lab.value) || lab.value,
      range: safeDecrypt(lab.range) || lab.range,
      status: safeDecrypt(lab.status) || lab.status,
    }));
    
    const weeks = (session.weeks || []).map((week: any) => ({
      weekNumber: week.weekNumber,
      nutrition: {
        focus: safeDecrypt(week.nutrition?.focus || ''),
        shoppingList: (week.nutrition?.shoppingList || []).map((item: any) => ({
          item: safeDecrypt(item.item) || item.item || '',
          quantity: safeDecrypt(item.quantity) || item.quantity || '',
          priority: item.priority,
        })),
      },
      exercise: {
        focus: safeDecrypt(week.exercise?.focus || ''),
        equipment: (week.exercise?.equipment || []).map((eq: string) => safeDecrypt(eq)),
      },
      habits: {
        trackingMethod: week.habits?.trackingMethod ? safeDecrypt(week.habits.trackingMethod) : undefined,
        motivationTip: week.habits?.motivationTip ? safeDecrypt(week.habits.motivationTip) : undefined,
      },
    }));

    const checklist = (session.checklist || []).map((item: any) => ({
      id: item.id || item._id?.toString() || '',
      description: safeDecrypt(item.description) || '',
      weekNumber: item.weekNumber || 1,
      category: safeDecrypt(item.category) || 'nutrition',
      type: safeDecrypt(item.type),
      recipeId: item.recipeId,
      details: item.details ? {
        recipe: item.details.recipe ? {
          ingredients: (item.details.recipe.ingredients || []).map((ing: any) => {
            if (typeof ing === 'string') return safeDecrypt(ing) || ing;
            if (!ing) return '';
            return {
              name: safeDecrypt(ing.name) || ing.name || '',
              quantity: safeDecrypt(ing.quantity) || ing.quantity || '',
              notes: ing.notes ? safeDecrypt(ing.notes) : undefined,
            };
          }),
          preparation: safeDecrypt(item.details.recipe.preparation) || '',
          tips: item.details.recipe.tips ? safeDecrypt(item.details.recipe.tips) : undefined,
        } : undefined,
        macros: item.details.macros,
        calories: item.details.calories,
        sets: item.details.sets,
        repetitions: item.details.repetitions,
        timeUnderTension: item.details.timeUnderTension,
        frequency: item.details.frequency,
        duration: item.details.duration,
        equipment: item.details.equipment?.map((eq: string) => safeDecrypt(eq)),
        progression: item.details.progression,
      } : undefined,
    }));

    // ── 3. Datos del cliente ──
    let clientName = 'Cliente';
    let clientSex = '';
    let clientAge = '';
    let clientWeight = '';
    let clientHeight = '';
    let clientPhotoBuffer: Buffer | null = null;

    try {
      if (client.personalData?.name) clientName = safeDecrypt(client.personalData.name);
      if (client.personalData?.gender) clientSex = safeDecrypt(client.personalData.gender);
      if (client.personalData?.age) clientAge = safeDecrypt(client.personalData.age);
      if (client.personalData?.weight) clientWeight = safeDecrypt(client.personalData.weight);
      if (client.personalData?.height) clientHeight = safeDecrypt(client.personalData.height);

      if (client.personalData?.profilePhoto) {
        const decryptedPhoto = decryptFileObject(client.personalData.profilePhoto);
        const clientPhotoUrlOrKey = decryptedPhoto?.key || decryptedPhoto?.url;
        clientPhotoBuffer = (await fetchImageBuffer(clientPhotoUrlOrKey || undefined)) || null;
      }
    } catch (err) {}

    // ── 4. Recopilar recipes ──
    const recipeIdSet = new Set<string>();
    for (const item of checklist) {
      if (item.category === 'nutrition' && item.recipeId) {
        recipeIdSet.add(item.recipeId);
      }
    }
    const recipeIds = Array.from(recipeIdSet);

    const recipes: Record<string, PDFRecipeData> = {};
    for (const rid of recipeIds) {
      try {
        const r = await Recipe.findById(rid);
        if (r) {
          let urlOrKey: string | undefined = undefined;
          if (r.image?.key) {
              urlOrKey = safeDecrypt(r.image.key) || r.image.key;
          } else if (typeof r.image === 'string') {
              urlOrKey = safeDecrypt(r.image) || r.image;
          } else if (r.image?.url) {
              urlOrKey = safeDecrypt(r.image.url) || r.image.url;
          }

          const imageBuffer = await fetchImageBuffer(urlOrKey);

          recipes[rid] = {
            title: safeDecrypt(r.title) || r.title,
            imageUrl: urlOrKey,
            imageBuffer,
            ingredients: (r.ingredients || []).map((ing: any) => {
              if (typeof ing === 'string') return safeDecrypt(ing) || ing;
              if (!ing) return '';
              return {
                name: safeDecrypt(ing.name) || ing.name || '',
                quantity: typeof ing.quantity === 'string' ? safeDecrypt(ing.quantity) : (ing.quantity || ''),
                notes: ing.notes ? safeDecrypt(ing.notes) : undefined,
              };
            }),
            instructions: (r.instructions || []).map((inst: string) => safeDecrypt(inst) || inst),
            macros: {
              protein: r.nutrition?.protein,
              carbs: r.nutrition?.carbs,
              fat: r.nutrition?.fat,
              calories: r.nutrition?.calories,
            },
            cookTime: r.cookTime,
            difficulty: r.difficulty,
          };
        }
      } catch (err) {
        loggerWithContext.warn('PDF', `Error cargando receta ${rid}`, err as Error);
      }
    }

    // ── 5. Recopilar datos de ejercicios ──
    // La sesión puede estar TRADUCIDA al idioma del cliente: la descripción
    // ("Lunes: Press banca") ya no matchea el nombre original en la DB.
    // Por eso matcheamos por ID (item.recipeId = exerciseId) cuando existe,
    // y solo caemos al match por nombre para sesiones viejas sin ID.
    const exerciseNameSet = new Set<string>();
    const exerciseIdSet = new Set<string>();
    for (const item of checklist) {
      if (item.category === 'exercise') {
        if (item.recipeId) exerciseIdSet.add(item.recipeId);
        exerciseNameSet.add(item.description);
      }
    }
    const exerciseNames = Array.from(exerciseNameSet);
    const exerciseIds = Array.from(exerciseIdSet);

    const exercises: Record<string, PDFExerciseData> = {};
    const allExercises = await Exercise.find({}).lean();
    const decryptedExercises = allExercises.map((ex: any) => ({
      ...ex,
      _name: safeDecrypt(ex.name) || ex.name,
      _description: safeDecrypt(ex.description) || ex.description,
    }));

    const findExerciseById = (id: string) =>
      decryptedExercises.find((ex: any) => ex._id?.toString() === id);

    for (const exName of exerciseNames) {
      try {
        const idMatch = findExerciseById(exName) ||
          (() => {
            // fallback: buscar por ID dentro de los items del checklist
            const item = checklist.find((i: any) => i.description === exName && i.category === 'exercise');
            return item?.recipeId ? findExerciseById(item.recipeId) : undefined;
          })();
        const exMatch = idMatch || decryptedExercises.find((ex: any) =>
          ex._name.toLowerCase().includes(exName.toLowerCase()) ||
          exName.toLowerCase().includes(ex._name.toLowerCase())
        );
        if (exMatch) {
          const ex = exMatch;
          
          let demoUrlOrKey: string | undefined = ex.demo?.key ? (safeDecrypt(ex.demo.key) || ex.demo.key) : undefined;
          if (!demoUrlOrKey && ex.demo?.url && ex.demo?.type !== 'placeholder' && ex.demo?.type !== 'youtube_search') {
              demoUrlOrKey = safeDecrypt(ex.demo.url) || ex.demo.url;
          }
          const demoBuffer = await fetchImageBuffer(demoUrlOrKey);

          exercises[exName] = {
            name: ex._name,
            description: ex._description,
            demoUrl: demoUrlOrKey,
            demoBuffer,
            instructions: (ex.instructions || []).map((inst: string) => safeDecrypt(inst) || inst),
            sets: ex.sets || 3,
            repetitions: safeDecrypt(ex.repetitions) || ex.repetitions || '',
            timeUnderTension: safeDecrypt(ex.timeUnderTension) || ex.timeUnderTension,
            restBetweenSets: safeDecrypt(ex.restBetweenSets) || ex.restBetweenSets,
            equipment: (ex.equipment || []).map((eq: string) => safeDecrypt(eq) || eq),
            muscleGroups: (ex.muscleGroups || []).map((mg: string) => safeDecrypt(mg) || mg),
            difficulty: safeDecrypt(ex.difficulty) || ex.difficulty,
          };
        }
      } catch (err) {}
    }

    // ── 6. FASE DE TRADUCCIÓN: el PDF sale SIEMPRE en el idioma del cliente ──
    // Las recetas/ejercicios de la DB pueden estar en CUALQUIER idioma (los
    // sube cada coach en el suyo). Detectamos el idioma real del contenido y
    // traducimos al idioma del cliente solo si difieren. La sesión generada
    // con FASE 4 ya viene traducida (session.translation.targetLang); las
    // sesiones anteriores (sin translation) se traducen aquí al vuelo.
    const clientLang = safeDecrypt((client.personalData as any)?.language) ||
      (client.personalData as any)?.language ||
      'es';
    const targetLang = normalizeClientLang(clientLang);
    const sessionAlreadyTranslated =
      (session.translation as any)?.targetLang === targetLang &&
      targetLang !== 'es';

    let summaryOut = summary;
    let visionOut = vision;
    let medicalSummaryOut = medicalSummary;
    let medicalComparativeAnalysisOut = medicalComparativeAnalysis;
    let labResultsOut = labResults;
    let weeksOut = weeks;
    let checklistOut = checklist;
    let structuredMedicalAnalysisOut = session.structuredMedicalAnalysis ? {
      ...session.structuredMedicalAnalysis,
      exams: (session.structuredMedicalAnalysis.exams || []).map((exam: any) => ({
        ...exam,
        intro: safeDecrypt(exam.intro) || '',
        analysis: safeDecrypt(exam.analysis) || '',
        table: (exam.table || []).map((row: any) => ({
          biomarcador: safeDecrypt(row.biomarcador) || row.biomarcador,
          valor: safeDecrypt(row.valor) || row.valor,
          rango_normal: safeDecrypt(row.rango_normal) || row.rango_normal,
          estado: safeDecrypt(row.estado) || row.estado,
        })),
      })),
      supplements: (session.structuredMedicalAnalysis.supplements || []).map((supp: any) => ({
        name: safeDecrypt(supp.name) || supp.name,
        dosage: safeDecrypt(supp.dosage) || supp.dosage,
        timing: safeDecrypt(supp.timing) || supp.timing,
        rationale: safeDecrypt(supp.rationale) || supp.rationale,
        contraindications: safeDecrypt(supp.contraindications) || supp.contraindications,
      })),
    } : undefined;

    if (targetLang !== 'es' && !sessionAlreadyTranslated) {
      loggerWithContext.info('PDF', '🌍 Traduciendo sesión (generación anterior) al idioma del cliente', {
        targetLang,
      });
      const translatedSession = await translateSessionContent(
        {
          summary: summaryOut,
          vision: visionOut,
          medicalSummary: medicalSummaryOut,
          medicalComparativeAnalysis: medicalComparativeAnalysisOut,
          structuredMedicalAnalysis: structuredMedicalAnalysisOut,
          weeks: weeksOut,
          checklist: checklistOut,
          labResults: labResultsOut,
        },
        targetLang,
        LANG_LABELS.es, // la sesión de generación anterior está en español
        defaultLLM
      );
      summaryOut = translatedSession.summary ?? summaryOut;
      visionOut = translatedSession.vision ?? visionOut;
      medicalSummaryOut = translatedSession.medicalSummary ?? medicalSummaryOut;
      medicalComparativeAnalysisOut = translatedSession.medicalComparativeAnalysis ?? medicalComparativeAnalysisOut;
      structuredMedicalAnalysisOut = translatedSession.structuredMedicalAnalysis ?? structuredMedicalAnalysisOut;
      weeksOut = translatedSession.weeks ?? weeksOut;
      checklistOut = translatedSession.checklist ?? checklistOut;
      labResultsOut = translatedSession.labResults ?? labResultsOut;
    }

    // Recetas y ejercicios: detectar idioma REAL de origen y traducir si difiere
    const contentTexts: string[] = [];
    for (const rid of Object.keys(recipes)) {
      const r = recipes[rid];
      contentTexts.push(r.title || '');
      (r.ingredients || []).forEach((ing: any) => {
        if (typeof ing === 'string') contentTexts.push(ing);
        else contentTexts.push(ing?.name || '');
      });
      (r.instructions || []).forEach((inst: string) => contentTexts.push(inst));
    }
    for (const exKey of Object.keys(exercises)) {
      const ex = exercises[exKey];
      contentTexts.push(ex.name || '', ex.description || '');
      (ex.instructions || []).forEach((inst: string) => contentTexts.push(inst));
    }
    const contentLang = detectLanguage(contentTexts);

    if (contentLang !== targetLang && Object.keys(recipes).length + Object.keys(exercises).length > 0) {
      loggerWithContext.info('PDF', '🌍 Traduciendo recetas/ejercicios al idioma del cliente', {
        contentLang: `${contentLang} (${LANG_LABELS[contentLang]})`,
        targetLang,
        recipeCount: Object.keys(recipes).length,
        exerciseCount: Object.keys(exercises).length,
      });
      const translatedContent = await translatePDFContent(
        recipes,
        exercises,
        targetLang,
        LANG_LABELS[contentLang],
        defaultLLM
      );
      Object.assign(recipes, translatedContent.recipes);
      Object.assign(exercises, translatedContent.exercises);
    }

    // ── 7. Datos del coach ──
    let coachName = 'Tu asesor';
    let coachEmail = '';
    let coachPhone = '';
    let coachPhotoBuffer: Buffer | null = null;

    try {
      if (client.coachId) {
        const coach = await Coach.findById(client.coachId);
        if (coach) {
          coachName = `${decrypt(coach.firstName)} ${decrypt(coach.lastName)}`.trim();
          coachEmail = decrypt(coach.email);
          coachPhone = coach.phone ? decrypt(coach.phone) : '';

          let coachPhotoUrlOrKey: string | undefined = coach.profilePhoto?.key ? decrypt(coach.profilePhoto.key) : undefined;
          if (!coachPhotoUrlOrKey && coach.profilePhoto?.url) {
              coachPhotoUrlOrKey = decrypt(coach.profilePhoto.url);
          }
          // Usamos || undefined para garantizar que nunca le pasemos un null a la función
          coachPhotoBuffer = (await fetchImageBuffer(coachPhotoUrlOrKey || undefined)) || null;
        }
      }
    } catch (err) {}

    // ── 7. Recopilar tips ──
    const tips: string[] = [];
    for (const item of checklistOut) {
      if (item.details?.recipe?.tips && !tips.includes(item.details.recipe.tips)) {
        tips.push(item.details.recipe.tips);
      }
    }

    const toAdopt = checklistOut.filter((item: any) => item.category === 'habit' && (!item.type || item.type === 'toAdopt')).map((item: any) => item.description);
    const toEliminate = checklistOut.filter((item: any) => item.category === 'habit' && item.type === 'toEliminate').map((item: any) => item.description);
    const motivationTip = weeksOut.find((w: any) => w.habits.motivationTip)?.habits.motivationTip;
    const trackingMethod = weeksOut.find((w: any) => w.habits.trackingMethod)?.habits.trackingMethod;

    const sessions = client.aiProgress.sessions || [];
    const sessionIndex = sessions.findIndex((s: any) => s.sessionId === sessionId);

    // ── 8. Construir JSON y generar PDF ──
    const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:3000';

    const pdfData: PDFRecommendationData = {
      client: { name: clientName, photoBuffer: clientPhotoBuffer, sex: clientSex, age: clientAge, weight: clientWeight, height: clientHeight },
      session: { summary: summaryOut, vision: visionOut, medicalSummary: medicalSummaryOut, medicalComparativeAnalysis: medicalComparativeAnalysisOut, labResults: labResultsOut, structuredMedicalAnalysis: structuredMedicalAnalysisOut, index: sessionIndex },
      checklist: checklistOut,
      weeks: weeksOut,
      recipes,
      exercises,
      habitData: { toAdopt, toEliminate, trackingMethod, motivationTip, tips },
      coach: { name: coachName, email: coachEmail, phone: coachPhone, photoBuffer: coachPhotoBuffer },
      websiteUrl,
    };

    const pdfBuffer = await generateRecommendationPDF(pdfData);

    const filename = encodeURIComponent(`Recomendaciones_${clientName.replace(/\s+/g, '_')}.pdf`);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    loggerWithContext.error('PDF', `❌ Error generando PDF: ${error.message}`, error);
    // SEC (A10): no exponer error.message en producción (podría revelar rutas
    // internas, detalles de LLM/S3). Solo detalle en desarrollo.
    return NextResponse.json({
      error: 'Error generando PDF',
      message: 'No se pudo generar el PDF. Inténtalo de nuevo.',
      ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
    }, { status: 500 });
  }
}

export const maxDuration = 300;

export const GET = apiHandler(getHandler);