// apps/api/src/app/api/clients/[id]/ai/routes.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { requireAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { decrypt, encrypt, isEncrypted, safeDecrypt } from '@/app/lib/encryption';
import { AIService } from '@/app/lib/ai-service';
import { TextractService } from '@/app/lib/textract';
import { ChecklistItem } from '../../../../../../../../packages/types/src/healthForm';

function decryptAISessionCompletely(session: any): any {
  try {
    return {
      ...session,
      summary: safeDecrypt(session.summary),
      vision: safeDecrypt(session.vision),
      weeks: session.weeks?.map((week: any) => ({
        weekNumber: week.weekNumber,
        nutrition: {
          focus: safeDecrypt(week.nutrition.focus),
          checklistItems: week.nutrition.checklistItems?.map((item: any) => ({
            ...item,
            description: safeDecrypt(item.description),
            details: item.details ? {
              ...item.details,
              recipe: item.details.recipe ? {
                ...item.details.recipe,
                ingredients: item.details.recipe.ingredients?.map((ing: any) => ({
                  name: safeDecrypt(ing.name),
                  quantity: safeDecrypt(ing.quantity),
                  notes: ing.notes ? safeDecrypt(ing.notes) : undefined
                })) || [],
                preparation: safeDecrypt(item.details.recipe.preparation),
                tips: item.details.recipe.tips ? safeDecrypt(item.details.recipe.tips) : undefined
              } : undefined,
              frequency: item.details.frequency ? safeDecrypt(item.details.frequency) : undefined,
              duration: item.details.duration ? safeDecrypt(item.details.duration) : undefined,
              equipment: item.details.equipment?.map((eq: string) => safeDecrypt(eq))
            } : undefined
          })) || [],
          shoppingList: week.nutrition.shoppingList?.map((item: any) => ({
            item: safeDecrypt(item.item),
            quantity: safeDecrypt(item.quantity),
            priority: item.priority
          })) || []
        },
        exercise: {
          focus: safeDecrypt(week.exercise.focus),
          checklistItems: week.exercise.checklistItems?.map((item: any) => ({
            ...item,
            description: safeDecrypt(item.description),
            details: item.details ? {
              frequency: item.details.frequency ? safeDecrypt(item.details.frequency) : undefined,
              duration: item.details.duration ? safeDecrypt(item.details.duration) : undefined,
              equipment: item.details.equipment?.map((eq: string) => safeDecrypt(eq))
            } : undefined
          })) || [],
          equipment: week.exercise.equipment?.map((eq: string) => safeDecrypt(eq)) || []
        },
        habits: {
          checklistItems: week.habits.checklistItems?.map((item: any) => ({
            ...item,
            description: safeDecrypt(item.description)
          })) || [],
          trackingMethod: week.habits.trackingMethod ? safeDecrypt(week.habits.trackingMethod) : undefined,
          motivationTip: week.habits.motivationTip ? safeDecrypt(week.habits.motivationTip) : undefined
        }
      })) || [],
      checklist: session.checklist?.map((item: any) => ({
        ...item,
        description: safeDecrypt(item.description),
        details: item.details ? {
          ...item.details,
          recipe: item.details.recipe ? {
            ...item.details.recipe,
            ingredients: item.details.recipe.ingredients?.map((ing: any) => ({
              name: safeDecrypt(ing.name),
              quantity: safeDecrypt(ing.quantity),
              notes: ing.notes ? safeDecrypt(ing.notes) : undefined
            })) || [],
            preparation: safeDecrypt(item.details.recipe.preparation),
            tips: item.details.recipe.tips ? safeDecrypt(item.details.recipe.tips) : undefined
          } : undefined,
          frequency: item.details.frequency ? safeDecrypt(item.details.frequency) : undefined,
          duration: item.details.duration ? safeDecrypt(item.details.duration) : undefined,
          equipment: item.details.equipment?.map((eq: string) => safeDecrypt(eq))
        } : undefined
      })) || []
    };
  } catch (error) {
    logger.error('AI', 'Error desencriptando sesión completa', error as Error);
    return session;
  }
}

// GET: Obtener recomendaciones de IA existentes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = crypto.randomUUID();
  
  const loggerWithContext = logger.withContext({
    requestId,
    clientId: id,
    endpoint: `/api/clients/${id}/ai`,
    method: 'GET'
  });

  return loggerWithContext.time('AI', 'Obtener recomendaciones IA', async () => {
    try {
      loggerWithContext.info('AI', 'Iniciando obtención de progreso de IA');
      
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client) {
        loggerWithContext.warn('AI', 'Cliente no encontrado');
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      loggerWithContext.debug('AI', 'Cliente encontrado', {
        hasAIProgress: !!client.aiProgress,
        aiProgressKeys: client.aiProgress ? Object.keys(client.aiProgress) : []
      });

      // Devolver progreso de IA si existe
      const aiProgress = client.aiProgress;
      
      if (!aiProgress) {
        loggerWithContext.info('AI', 'Cliente sin progreso de IA');
        return NextResponse.json({
          success: true,
          data: {
            hasAIProgress: false,
            message: 'No hay recomendaciones de IA generadas aún'
          }
        });
      }

      loggerWithContext.info('AI', 'Progreso de IA encontrado', {
        sessionCount: aiProgress.sessions?.length || 0,
        overallProgress: aiProgress.overallProgress,
        currentSessionId: aiProgress.currentSessionId
      });

      // Desencriptar sesiones si es necesario
      const decryptedSessions = aiProgress.sessions?.map(session => 
        decryptAISessionCompletely(session)
      ) || [];

      loggerWithContext.info('AI', 'Sesiones completamente desencriptadas', {
        sessionCount: decryptedSessions.length
      });

      return NextResponse.json({
        success: true,
        data: {
          hasAIProgress: true,
          aiProgress: {
            ...aiProgress,
            sessions: decryptedSessions  // ✅ Ahora completamente desencriptadas
          }
        },
        requestId
      });

    } catch (error: any) {
      loggerWithContext.error('AI', 'Error obteniendo recomendaciones IA', error, {
        errorType: error.constructor.name,
        errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error interno del servidor',
          requestId,
          ...(process.env.NODE_ENV === 'development' && { 
            error: error.message
          })
        },
        { status: 500 }
      );
    }
  });
}

// POST: Generar nuevas recomendaciones de IA
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = crypto.randomUUID();
  
  const loggerWithContext = logger.withContext({
    requestId,
    clientId: id,
    endpoint: `/api/clients/${id}/ai`,
    method: 'POST'
  });

  return loggerWithContext.time('AI', 'Generar recomendaciones IA', async () => {
    try {
      loggerWithContext.info('AI', 'Iniciando generación de recomendaciones IA');
      
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      let body;
      try {
        body = await request.json();
        loggerWithContext.debug('AI', 'Cuerpo de la solicitud recibido', {
          bodyKeys: Object.keys(body),
          monthNumber: body.monthNumber,
          reprocessDocuments: body.reprocessDocuments,
          hasCoachNotes: !!body.coachNotes
        });
      } catch (error) {
        loggerWithContext.error('AI', 'Error parseando JSON de la solicitud', error as Error);
        return NextResponse.json(
          { success: false, message: 'Cuerpo de solicitud inválido' },
          { status: 400 }
        );
      }

      const { monthNumber = 1, reprocessDocuments = false, coachNotes = '' } = body;
      
      loggerWithContext.info('AI', 'Parámetros procesados', {
        monthNumber,
        reprocessDocuments,
        coachNotesLength: coachNotes.length
      });

      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client) {
        loggerWithContext.warn('AI', 'Cliente no encontrado');
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      loggerWithContext.debug('AI', 'Cliente encontrado para IA', {
        hasPersonalData: !!client.personalData,
        hasMedicalData: !!client.medicalData,
        documentCount: client.medicalData?.documents?.length || 0,
        existingSessions: client.aiProgress?.sessions?.length || 0
      });

      // 1. Si se solicita, reprocesar documentos con Textract
      if (reprocessDocuments && client.medicalData?.documents) {
        loggerWithContext.info('AI', 'Reprocesando documentos con Textract');
        await reprocessClientDocuments(id, client.medicalData.documents, requestId);
      }

      // 2. Preparar datos para la IA
      const aiInput = await prepareAIInput(client, requestId);
      
      // 3. Agregar notas del coach si las hay
      if (coachNotes) {
        aiInput.coachNotes = coachNotes;
      }

      // 4. Agregar sesiones anteriores si existen
      if (client.aiProgress?.sessions) {
        aiInput.previousSessions = client.aiProgress.sessions;
        aiInput.currentProgress = client.aiProgress;
      }

      // 5. Generar recomendaciones con la IA
      loggerWithContext.info('AI', 'Llamando a servicio de IA');
      const recommendations = await AIService.analyzeClientAndGenerateRecommendations(
        aiInput, 
        monthNumber,
        { requestId, clientId: id }
      );

      loggerWithContext.debug('AI', 'Recomendaciones generadas', {
        sessionId: recommendations.sessionId,
        weekCount: recommendations.weeks.length,
        summaryLength: recommendations.summary?.length || 0
      });

      // 6. Actualizar el cliente con las nuevas recomendaciones
      const updateData: any = {
        $set: {
          updatedAt: new Date()
        }
      };

      // Verificar si ya existe una sesión para este mes
      const existingSessionIndex = client.aiProgress?.sessions?.findIndex(
        (s: any) => s.monthNumber === monthNumber
      );

      loggerWithContext.debug('AI', 'Buscando sesión existente', {
        monthNumber,
        hasAIProgress: !!client.aiProgress,
        sessionsCount: client.aiProgress?.sessions?.length || 0,
        existingSessionIndex
      });

      if (!client.aiProgress || existingSessionIndex === -1) {
        // Primera vez para este mes: crear estructura
        updateData.$set['aiProgress'] = {
          clientId: id,
          currentSessionId: recommendations.sessionId,
          sessions: [recommendations],
          overallProgress: 0,
          lastEvaluation: new Date(),
          nextEvaluation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          metrics: {
            nutritionAdherence: 0,
            exerciseConsistency: 0,
            habitFormation: 0
          }
        };
        
        loggerWithContext.info('AI', 'Creando nueva sesión para mes', { monthNumber });
      } else {
        // ✅ REEMPLAZAR la sesión existente para este mes
        const updatedSessions = [...client.aiProgress.sessions];
        
        // Mantener el mismo sessionId si estamos regenerando?
        // O crear uno nuevo? Vamos a mantener el mes pero nuevo ID
        updatedSessions[existingSessionIndex] = recommendations;
        
        updateData.$set['aiProgress.sessions'] = updatedSessions;
        updateData.$set['aiProgress.currentSessionId'] = recommendations.sessionId;
        updateData.$set['aiProgress.lastEvaluation'] = new Date();
        updateData.$set['aiProgress.nextEvaluation'] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        loggerWithContext.info('AI', 'Reemplazando sesión existente', {
          monthNumber,
          oldSessionId: client.aiProgress.sessions[existingSessionIndex].sessionId,
          newSessionId: recommendations.sessionId
        });
      }

      const result = await healthForms.updateOne(
        { _id: new ObjectId(id) },
        updateData
      );

      loggerWithContext.debug('AI', 'Resultado de actualización en BD', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount
      });

      if (result.modifiedCount === 0 && result.upsertedCount === 0) {
        loggerWithContext.error('AI', 'No se pudo guardar las recomendaciones en BD');
        throw new Error('No se pudo guardar las recomendaciones en la base de datos');
      }

      loggerWithContext.info('AI', 'Recomendaciones de IA guardadas exitosamente', {
        sessionId: recommendations.sessionId,
        monthNumber
      });

      return NextResponse.json({
        success: true,
        data: {
          sessionId: recommendations.sessionId,
          monthNumber,
          summary: recommendations.summary, // Ya desencriptado en ai-service
          vision: recommendations.vision,   // Ya desencriptado en ai-service
          weekCount: recommendations.weeks.length,
          weeks: recommendations.weeks,     // Ya desencriptado en ai-service
          requestId
        }
      });

    } catch (error: any) {
      loggerWithContext.error('AI', 'Error generando recomendaciones IA', error, {
        errorMessage: error.message,
        errorType: error.constructor.name
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error generando recomendaciones',
          requestId,
          ...(process.env.NODE_ENV === 'development' && { 
            error: error.message
          })
        },
        { status: 500 }
      );
    }
  });
}

// PUT: Actualizar checklist o aprobar recomendaciones
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = crypto.randomUUID();
  
  const loggerWithContext = logger.withContext({
    requestId,
    clientId: id,
    endpoint: `/api/clients/${id}/ai`,
    method: 'PUT'
  });

  return loggerWithContext.time('AI', 'Actualizar recomendaciones IA', async () => {
    try {
      loggerWithContext.info('AI', 'Actualizando recomendaciones IA');
      
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      let body;
      try {
        body = await request.json();
      } catch (error) {
        loggerWithContext.error('AI', 'Error parseando JSON de la solicitud', error as Error);
        return NextResponse.json(
          { success: false, message: 'Cuerpo de solicitud inválido' },
          { status: 400 }
        );
      }

      const { action, sessionId, data } = body;
      
      loggerWithContext.info('AI', 'Parámetros de actualización', {
        action,
        sessionId,
        dataKeys: data ? Object.keys(data) : []
      });

      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client || !client.aiProgress) {
        loggerWithContext.warn('AI', 'Cliente o progreso de IA no encontrado');
        return NextResponse.json(
          { success: false, message: 'Cliente o progreso de IA no encontrado' },
          { status: 404 }
        );
      }

      let updateResult;
      let message = '';

      switch (action) {
        case 'update_checklist':
          updateResult = await updateChecklist(id, sessionId, data.checklistItems, requestId);
          message = 'Checklist actualizado';
          break;

        case 'approve_session':
          updateResult = await approveSession(id, sessionId, requestId);
          message = 'Sesión aprobada';
          break;

        case 'send_to_client':
          updateResult = await sendToClient(id, sessionId, requestId);
          message = 'Recomendaciones enviadas al cliente';
          break;

        case 'regenerate_session':
          updateResult = await regenerateSession(id, sessionId, data.coachNotes, requestId);
          message = 'Sesión regenerada';
          break;

        default:
          loggerWithContext.warn('AI', 'Acción no válida', { action });
          return NextResponse.json(
            { success: false, message: 'Acción no válida' },
            { status: 400 }
          );
      }

      if (!updateResult) {
        loggerWithContext.error('AI', 'No se pudo realizar la actualización');
        return NextResponse.json(
          { success: false, message: 'No se pudo realizar la actualización' },
          { status: 500 }
        );
      }

      loggerWithContext.info('AI', message);
      return NextResponse.json({
        success: true,
        message,
        requestId
      });

    } catch (error: any) {
      loggerWithContext.error('AI', 'Error actualizando recomendaciones IA', error, {
        action: (await request.json()).action
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error interno del servidor',
          requestId
        },
        { status: 500 }
      );
    }
  });
}

// Funciones auxiliares
async function prepareAIInput(client: any, requestId: string): Promise<any> {
  const loggerWithContext = logger.withContext({ requestId });
  
  loggerWithContext.debug('AI', 'Preparando entrada para IA');
  
  // Desencriptar datos personales
  const personalData = Object.entries(client.personalData || {}).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      try {
        acc[key] = safeDecrypt(value as string);
      } catch (error) {
        loggerWithContext.warn('AI', `Error desencriptando campo personal: ${key}`, error as Error);
        acc[key] = value;
      }
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  // Desencriptar datos médicos
  const medicalData = Object.entries(client.medicalData || {}).reduce((acc, [key, value]) => {
    if (typeof value === 'string' && key !== 'documents') {
      try {
        acc[key] = safeDecrypt(value as string);
      } catch (error) {
        loggerWithContext.warn('AI', `Error desencriptando campo médico: ${key}`, error as Error);
        acc[key] = value;
      }
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  // Preparar documentos con análisis de Textract
  const documents = [];
  if (client.medicalData?.documents) {
    loggerWithContext.debug('AI', 'Procesando documentos para IA', {
      documentCount: Array.isArray(client.medicalData.documents) ? client.medicalData.documents.length : 1
    });
    
    try {
      let docsArray = client.medicalData.documents;
      
      // Si es un string (encriptado), desencriptar y parsear
      if (typeof docsArray === 'string') {
        const decryptedString = safeDecrypt(docsArray);
        docsArray = JSON.parse(decryptedString);
      }
      
      if (Array.isArray(docsArray)) {
        for (const doc of docsArray) {
          try {
            let decryptedDoc = doc;
            
            // Si el documento está encriptado como string, desencriptarlo
            if (typeof doc === 'string') {
              decryptedDoc = JSON.parse(safeDecrypt(doc));
            }
            
            const docName = safeDecrypt(decryptedDoc.name || '');
            
            documents.push({
              name: docName,
              textractAnalysis: decryptedDoc.textractAnalysis
            });
            
            loggerWithContext.debug('AI', 'Documento procesado', {
              documentName: docName,
              hasTextractAnalysis: !!decryptedDoc.textractAnalysis
            });
          } catch (error) {
            loggerWithContext.error('AI', 'Error procesando documento individual', error as Error);
          }
        }
      }
    } catch (error) {
      loggerWithContext.error('AI', 'Error procesando documentos para IA', error as Error);
    }
  }

  // Preparar historial de checklist si existe
  const previousChecklistStatus = [];
  if (client.aiProgress?.sessions) {
    for (const session of client.aiProgress.sessions) {
      if (session.checklist && Array.isArray(session.checklist)) {
        // Filtrar solo items completados para mostrar progreso
        const completedItems = session.checklist
        .filter(item => item.completed)
        .map(item => ({
          description: safeDecrypt(item.description || ''),
          completed: true,
          completedDate: item.completedDate
        }));
        
        previousChecklistStatus.push({
          month: session.monthNumber,
          completedItems,
          totalItems: session.checklist.length
        });
      }
    }
  }

  loggerWithContext.debug('AI', 'Entrada para IA preparada', {
    personalDataKeys: Object.keys(personalData),
    medicalDataKeys: Object.keys(medicalData),
    documentCount: documents.length
  });

  return {
    personalData,
    medicalData,
    documents,
    previousChecklistStatus, // Enviar historial de checklist
    previousSessions: client.aiProgress?.sessions || []
  };
}

async function reprocessClientDocuments(clientId: string, documents: any[], requestId: string) {
  const loggerWithContext = requestId ? logger.withContext({ requestId, clientId }) : logger;
  
  loggerWithContext.info('TEXTRACT', 'Reprocesando documentos del cliente');
  
  try {
    let docsArray = documents;
    
    // Si es un string (encriptado), desencriptar y parsear
    if (typeof docsArray === 'string') {
      const decryptedString = safeDecrypt(docsArray);
      docsArray = JSON.parse(decryptedString);
    }
    
    if (!Array.isArray(docsArray)) {
      loggerWithContext.error('TEXTRACT', 'Documents no es un array válido');
      return;
    }
    
    const processingPromises = docsArray.map(async (doc, index) => {
      try {
        let documentObj = doc;
        
        // Si el documento está encriptado como string, desencriptarlo
        if (typeof doc === 'string') {
          try {
            const decrypted = safeDecrypt(doc);
            documentObj = JSON.parse(decrypted);
          } catch (parseError) {
            loggerWithContext.warn('TEXTRACT', `Documento ${index} no es JSON válido, usando como está`);
            return doc; // Devolver como está
          }
        }
        
        // Verificar si ya es un objeto con la estructura correcta
        if (documentObj.name && documentObj.key) {
          // Ya tiene estructura correcta, solo reprocesar si es necesario
          const originalName = safeDecrypt(documentObj.name);
          const s3Key = safeDecrypt(documentObj.key);
          
          loggerWithContext.debug('TEXTRACT', `Documento ya estructurado ${index}`, {
            name: originalName,
            hasTextract: !!documentObj.textractAnalysis
          });
          
          // Si ya tiene textractAnalysis, no reprocesar
          if (documentObj.textractAnalysis?.extractedText) {
            return documentObj; // Mantener como está
          }
          
          // Si no tiene textract, procesarlo
          const docType = TextractService.determineDocumentType(originalName);
          const analysis = await TextractService.processMedicalDocument(s3Key, docType);
          
          return {
            ...documentObj,
            textractAnalysis: {
              extractedText: analysis.extractedText,
              extractedData: analysis.extractedData,
              extractionDate: analysis.extractedAt.toISOString(),
              extractionStatus: analysis.status,
              confidence: analysis.status === 'completed' ? analysis.confidence : 0,
              documentType: analysis.documentType
            }
          };
        } else {
          // Es un objeto viejo que necesita estructuración completa
          loggerWithContext.warn('TEXTRACT', `Documento ${index} necesita reestructuración`, {
            hasName: !!documentObj.name,
            hasKey: !!documentObj.key,
            type: typeof documentObj
          });
          
          // Intentar extraer datos del objeto viejo
          const originalName = documentObj.originalname || documentObj.name || `documento-${index}`;
          const s3Key = documentObj.key || documentObj.s3Key;
          
          if (!s3Key) {
            loggerWithContext.error('TEXTRACT', `Documento ${index} sin s3Key`);
            return documentObj;
          }
          
          // Procesar con Textract
          const docType = TextractService.determineDocumentType(originalName);
          const analysis = await TextractService.processMedicalDocument(s3Key, docType);
          
          // Crear nueva estructura
          return {
            name: encrypt(originalName),
            key: encrypt(s3Key),
            type: documentObj.type || 'application/octet-stream',
            size: documentObj.size || 0,
            uploadedAt: documentObj.uploadedAt || new Date(),
            url: documentObj.url || documentObj.location,
            textractAnalysis: {
              extractedText: analysis.extractedText,
              extractedData: analysis.extractedData,
              extractionDate: analysis.extractedAt.toISOString(),
              extractionStatus: analysis.status,
              confidence: analysis.status === 'completed' ? analysis.confidence : 0,
              documentType: analysis.documentType
            }
          };
        }
      } catch (error) {
        loggerWithContext.error('TEXTRACT', `Error reprocesando documento ${index}`, error as Error);
        return doc; // Devolver original si hay error
      }
    });

    const processedDocs = await Promise.all(processingPromises);
    
    // Filtrar documentos nulos
    const validDocs = processedDocs.filter(doc => doc !== null);
    
    // Actualizar en base de datos
    const healthForms = await getHealthFormsCollection();
    const result = await healthForms.updateOne(
      { _id: new ObjectId(clientId) },
      { $set: { 'medicalData.documents': validDocs } }
    );
    
    loggerWithContext.info('TEXTRACT', 'Documentos reprocesados', { 
      clientId, 
      total: processedDocs.length,
      valid: validDocs.length,
      modified: result.modifiedCount
    });
    
  } catch (error) {
    loggerWithContext.error('TEXTRACT', 'Error general reprocesando documentos', error as Error);
  }
}

async function updateChecklist(clientId: string, sessionId: string, checklistItems: ChecklistItem[], requestId: string): Promise<boolean> {
  const loggerWithContext = logger.withContext({ requestId, clientId });
  
  loggerWithContext.info('AI', 'Actualizando checklist', { 
    sessionId,
    itemCount: checklistItems.length,
    completedCount: checklistItems.filter(item => item.completed).length
  });
  
  try {
    const healthForms = await getHealthFormsCollection();
    
    // Actualizar el checklist completo
    const result = await healthForms.updateOne(
      { 
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      {
        $set: {
          'aiProgress.sessions.$.checklist': checklistItems,
          'aiProgress.sessions.$.updatedAt': new Date()
        }
      }
    );
    
    console.log('📝 Update checklist result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    });
    
    if (result.modifiedCount > 0) {
      // Recalcular progreso general
      const completedItems = checklistItems.filter(item => item.completed).length;
      const totalItems = checklistItems.length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      // Actualizar progreso general
      await healthForms.updateOne(
        { _id: new ObjectId(clientId) },
        { 
          $set: { 
            'aiProgress.overallProgress': progress,
            'aiProgress.lastEvaluation': new Date()
          } 
        }
      );
      
      loggerWithContext.info('AI', 'Checklist actualizado exitosamente', { 
        sessionId, 
        progress,
        completedItems,
        totalItems
      });
      
      return true;
    } else {
      loggerWithContext.warn('AI', 'No se modificó ningún documento', { sessionId });
      return false;
    }
  } catch (error) {
    loggerWithContext.error('AI', 'Error actualizando checklist', error as Error);
    return false;
  }
}

async function approveSession(clientId: string, sessionId: string, requestId: string): Promise<boolean> {
  const loggerWithContext = logger.withContext({ requestId, clientId });
  
  loggerWithContext.info('AI', 'Aprobando sesión', { sessionId });
  
  try {
    const healthForms = await getHealthFormsCollection();
    
    const result = await healthForms.updateOne(
      { 
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      {
        $set: {
          'aiProgress.sessions.$.status': 'approved',
          'aiProgress.sessions.$.approvedAt': new Date(),
          'aiProgress.sessions.$.updatedAt': new Date()
        }
      }
    );
    
    loggerWithContext.info('AI', 'Sesión aprobada', { sessionId, modified: result.modifiedCount });
    return result.modifiedCount > 0;
  } catch (error) {
    loggerWithContext.error('AI', 'Error aprobando sesión', error as Error);
    return false;
  }
}

async function sendToClient(clientId: string, sessionId: string, requestId: string): Promise<boolean> {
  const loggerWithContext = logger.withContext({ requestId, clientId });
  
  loggerWithContext.info('AI', 'Enviando sesión al cliente', { sessionId });
  
  try {
    const healthForms = await getHealthFormsCollection();
    
    const result = await healthForms.updateOne(
      { 
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      {
        $set: {
          'aiProgress.sessions.$.status': 'sent',
          'aiProgress.sessions.$.sentAt': new Date(),
          'aiProgress.sessions.$.updatedAt': new Date()
        }
      }
    );
    
    loggerWithContext.info('AI', 'Sesión enviada al cliente', { sessionId });
    return result.modifiedCount > 0;
  } catch (error) {
    loggerWithContext.error('AI', 'Error enviando sesión al cliente', error as Error);
    return false;
  }
}

async function regenerateSession(clientId: string, sessionId: string, coachNotes: string, requestId: string): Promise<boolean> {
  const loggerWithContext = logger.withContext({ requestId, clientId });
  
  loggerWithContext.info('AI', 'Regenerando sesión', { sessionId });
  
  try {
    const healthForms = await getHealthFormsCollection();
    
    const result = await healthForms.updateOne(
      { 
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      {
        $set: {
          'aiProgress.sessions.$.status': 'draft',
          'aiProgress.sessions.$.coachNotes': coachNotes,
          'aiProgress.sessions.$.updatedAt': new Date()
        }
      }
    );
    
    loggerWithContext.info('AI', 'Sesión regenerada', { sessionId, modified: result.modifiedCount });
    return result.modifiedCount > 0;
  } catch (error) {
    loggerWithContext.error('AI', 'Error regenerando sesión', error as Error);
    return false;
  }
}

