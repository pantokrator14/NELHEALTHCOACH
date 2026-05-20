/**
 * API endpoint: GET /api/clients/[id]/ai/[sessionId]/pdf
 * 
 * Genera y descarga el PDF de recomendaciones de salud para un cliente.
 * Accesible desde el enlace del email (sin autenticación de coach).
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection, connectMongoose } from '@/app/lib/database';
import { logger } from '@/app/lib/logger';
import { decrypt, safeDecrypt, decryptFileObject } from '@/app/lib/encryption';
import { generateRecommendationPDF } from '@/app/lib/recommendation-pdf';
import type { PDFRecommendationData, PDFRecipeData, PDFExerciseData } from '@/app/lib/recommendation-pdf';
import Coach from '@/app/models/Coach';
import Recipe from '@/app/models/Recipe';
import Exercise from '@/app/models/Exercise';

export async function GET(
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

    const session = client.aiProgress.sessions.find(
      (s: any) => s.sessionId === sessionId
    );

    if (!session) {
      loggerWithContext.warn('PDF', 'Sesión no encontrada');
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // ── 2. Desencriptar datos de la sesión ──
    const summary = safeDecrypt(session.summary) || '';
    const vision = safeDecrypt(session.vision) || '';
    const medicalSummary = safeDecrypt(session.medicalSummary) || '';
    const medicalComparativeAnalysis = safeDecrypt(session.medicalComparativeAnalysis) || '';
    const labResults = session.labResults || [];
    const weeks = (session.weeks || []).map((week: any) => ({
      weekNumber: week.weekNumber,
      nutrition: {
        focus: safeDecrypt(week.nutrition?.focus || ''),
        shoppingList: (week.nutrition?.shoppingList || []).map((item: any) => ({
          item: safeDecrypt(item.item),
          quantity: safeDecrypt(item.quantity),
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
      category: item.category || 'nutrition',
      type: item.type,
      recipeId: item.recipeId,
      details: item.details ? {
        recipe: item.details.recipe ? {
          ingredients: (item.details.recipe.ingredients || []).map((ing: any) => ({
            name: safeDecrypt(ing.name) || ing.name,
            quantity: safeDecrypt(ing.quantity) || ing.quantity,
            notes: ing.notes ? safeDecrypt(ing.notes) : undefined,
          })),
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
    let clientPhotoBuffer: Buffer | null = null;

    try {
      if (client.personalData?.name) clientName = safeDecrypt(client.personalData.name);
      if (client.personalData?.gender) clientSex = safeDecrypt(client.personalData.gender);
      if (client.personalData?.age) clientAge = safeDecrypt(client.personalData.age);

      // Cliente photo
      if (client.personalData?.profilePhoto) {
        try {
          const decryptedPhoto = decryptFileObject(client.personalData.profilePhoto);
          if (decryptedPhoto?.url) {
            const resp = await fetch(decryptedPhoto.url, { signal: AbortSignal.timeout(10000) });
            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              clientPhotoBuffer = Buffer.from(arrayBuffer);
            }
          }
        } catch (photoErr) {
          loggerWithContext.warn('PDF', 'No se pudo cargar la foto del cliente', photoErr);
        }
      }
    } catch (err) {
      loggerWithContext.warn('PDF', 'Error obteniendo datos del cliente', err as Error);
    }

    // ── 4. Recopilar recipeIds del checklist ──
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
          let imageBuffer: Buffer | undefined;
          if (r.image?.url) {
            try {
              const resp = await fetch(r.image.url, { signal: AbortSignal.timeout(10000) });
              if (resp.ok) {
                const arrayBuffer = await resp.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
              }
            } catch {
              loggerWithContext.warn('PDF', `No se pudo cargar imagen de receta: ${r.title}`);
            }
          }

          recipes[rid] = {
            title: r.title,
            imageUrl: r.image?.url,
            imageBuffer,
            ingredients: r.ingredients || [],
            instructions: r.instructions || [],
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
    const exerciseNameSet = new Set<string>();
    for (const item of checklist) {
      if (item.category === 'exercise') {
        exerciseNameSet.add(item.description);
      }
    }
    const exerciseNames = Array.from(exerciseNameSet);

    const exercises: Record<string, PDFExerciseData> = {};
    for (const exName of exerciseNames) {
      try {
        // Try to find by name (case-insensitive)
        const ex = await Exercise.findOne({
          name: { $regex: new RegExp(exName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        });
        if (ex) {
          let demoBuffer: Buffer | undefined;
          if (ex.demo?.url && ex.demo?.type !== 'placeholder' && ex.demo?.type !== 'youtube_search') {
            try {
              const resp = await fetch(ex.demo.url, { signal: AbortSignal.timeout(10000) });
              if (resp.ok) {
                const arrayBuffer = await resp.arrayBuffer();
                demoBuffer = Buffer.from(arrayBuffer);
              }
            } catch {
              loggerWithContext.warn('PDF', `No se pudo cargar demo de ejercicio: ${ex.name}`);
            }
          }

          exercises[exName] = {
            name: ex.name,
            description: ex.description,
            demoUrl: ex.demo?.url,
            demoBuffer,
            instructions: ex.instructions || [],
            sets: ex.sets || 3,
            repetitions: ex.repetitions || '',
            timeUnderTension: ex.timeUnderTension,
            restBetweenSets: ex.restBetweenSets,
            equipment: ex.equipment || [],
            muscleGroups: ex.muscleGroups || [],
            difficulty: ex.difficulty,
          };
        }
      } catch (err) {
        loggerWithContext.warn('PDF', `Error cargando ejercicio: ${exName}`, err as Error);
      }
    }

    // ── 6. Datos del coach ──
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

          if (coach.profilePhoto?.url) {
            try {
              const photoUrl = decrypt(coach.profilePhoto.url);
              const resp = await fetch(photoUrl, { signal: AbortSignal.timeout(10000) });
              if (resp.ok) {
                const arrayBuffer = await resp.arrayBuffer();
                coachPhotoBuffer = Buffer.from(arrayBuffer);
              }
            } catch {
              loggerWithContext.warn('PDF', 'No se pudo cargar foto del coach');
            }
          }
        }
      }
    } catch (err) {
      loggerWithContext.warn('PDF', 'Error obteniendo datos del coach', err as Error);
    }

    // ── 7. Recopilar tips de hábitos ──
    const tips: string[] = [];
    for (const item of checklist) {
      if (item.details?.recipe?.tips && !tips.includes(item.details.recipe.tips)) {
        tips.push(item.details.recipe.tips);
      }
    }

    // Classification: toAdopt vs toEliminate
    const toAdopt = checklist
      .filter((item: any) => item.category === 'habit' && (!item.type || item.type === 'toAdopt'))
      .map((item: any) => item.description);
    const toEliminate = checklist
      .filter((item: any) => item.category === 'habit' && item.type === 'toEliminate')
      .map((item: any) => item.description);

    // Motivation tip from weeks
    const motivationTip = weeks.find((w: any) => w.habits.motivationTip)?.habits.motivationTip;

    // Tracking method
    const trackingMethod = weeks.find((w: any) => w.habits.trackingMethod)?.habits.trackingMethod;

    // Índice de la sesión (para saber si mostrar análisis comparativo)
    const sessions = client.aiProgress.sessions || [];
    const sessionIndex = sessions.findIndex((s: any) => s.sessionId === sessionId);

    // ── 8. Generar PDF ──
    const websiteUrl = process.env.APP_URL || 'https://nelhealthcoach.com';

    const pdfData: PDFRecommendationData = {
      client: {
        name: clientName,
        photoBuffer: clientPhotoBuffer,
        sex: clientSex,
        age: clientAge,
      },
      session: { summary, vision, medicalSummary, medicalComparativeAnalysis, labResults, index: sessionIndex },
      checklist: checklist.map((item: any) => ({
        ...item,
        details: item.details || undefined,
      })),
      weeks: weeks.map((w: any) => ({
        ...w,
        nutrition: { focus: w.nutrition.focus, shoppingList: w.nutrition.shoppingList || [] },
        exercise: { focus: w.exercise.focus, equipment: w.exercise.equipment || [] },
        habits: { trackingMethod: w.habits.trackingMethod, motivationTip: w.habits.motivationTip },
      })),
      recipes,
      exercises,
      habitData: {
        toAdopt,
        toEliminate,
        trackingMethod,
        motivationTip,
        tips,
      },
      coach: {
        name: coachName,
        email: coachEmail,
        phone: coachPhone,
        photoBuffer: coachPhotoBuffer,
      },
      websiteUrl,
    };

    const pdfBuffer = await generateRecommendationPDF(pdfData);

    loggerWithContext.info('PDF', '✅ PDF generado exitosamente', {
      sizeKB: Math.round(pdfBuffer.length / 1024),
    });

    // ── 9. Retornar PDF ──
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
    loggerWithContext.error('PDF', '❌ Error generando PDF', error);
    return NextResponse.json(
      { error: 'Error generando PDF', message: error.message },
      { status: 500 }
    );
  }
}
