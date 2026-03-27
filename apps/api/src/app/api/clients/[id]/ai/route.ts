// apps/api/src/app/api/clients/[id]/ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { requireAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { decrypt, encrypt, isEncrypted, safeDecrypt } from '@/app/lib/encryption';
import { AIService } from '@/app/lib/ai-service';
import { TextractService } from '@/app/lib/textract';
import { ChecklistItem } from '../../../../../../../../packages/types/src/healthForm';
import { EmailService } from '@/app/lib/email-service';

function decryptAISessionCompletely(session: any): any {
  try {
    const decrypted = {
      ...session,
      summary: safeDecrypt(session.summary),
      vision: safeDecrypt(session.vision),
      weeks: session.weeks?.map((week: any) => ({
        weekNumber: week.weekNumber,
        nutrition: {
          focus: safeDecrypt(week.nutrition.focus),
          shoppingList: week.nutrition.shoppingList?.map((item: any) => ({
            item: safeDecrypt(item.item),
            quantity: safeDecrypt(item.quantity),
            priority: item.priority
          })) || []
        },
        exercise: {
          focus: safeDecrypt(week.exercise.focus),
          equipment: week.exercise.equipment?.map((eq: string) => safeDecrypt(eq)) || []
        },
        habits: {
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
    return decrypted;
  } catch (error) {
    console.error('❌ Error desencriptando sesión completa:', error);
    logger.error('AI', 'Error desencriptando sesión completa', error);
    
    // Corrección: Crear error correctamente
    const errorObj = new Error('Error desencriptando sesión completa');
    logger.error('AI', 'Error desencriptando sesión completa', errorObj);
    
    // Fallback: intentar desencriptar lo básico
    return {
      ...session,
      summary: safeDecrypt(session.summary) || 'Error desencriptando',
      vision: safeDecrypt(session.vision) || 'Error desencriptando',
      weeks: [],
      checklist: []
    };
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
      const decryptedSessions = aiProgress.sessions?.map((session: any) => 
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
      // Corrección: Usar error directamente
      loggerWithContext.error('AI', 'Error obteniendo recomendaciones IA', error);
      
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
      loggerWithContext.error('AI', 'Error generando recomendaciones IA', error);
      
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
    let requestBody = null;
    
    try {
      loggerWithContext.info('AI', 'Actualizando recomendaciones IA');
      
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      requestBody = await request.json();
      console.log('📦 Body recibido en PUT:', requestBody);
      
      const { action, sessionId, data } = requestBody;
      
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

      let operationResult: any;
      let message = '';

      switch (action) {
        case 'update_checklist':
          console.log('🔄 UPDATE_CHECKLIST: Iniciando...', {
            sessionId,
            checklistItemsCount: data?.checklistItems?.length || 0
          });
          
          // ✅ Directamente retornamos aquí, no necesitamos almacenar el resultado
          const updateChecklistResult = await updateChecklist(id, sessionId, data.checklistItems, requestId);
          return NextResponse.json(updateChecklistResult);
        
        case 'update_session_fields':
          console.log('📝 UPDATE_SESSION_FIELDS: Iniciando...', {
            sessionId,
            fields: data?.fields ? Object.keys(data.fields) : []
          });
          operationResult = await updateSessionFields(id, sessionId, data?.fields || {}, requestId);
          message = 'Campos de sesión actualizados';
          break;

        case 'approve_session':
          console.log('✅ APPROVE_SESSION: Iniciando...', { sessionId });

          console.log('🔍 DEBUG: Estado antes de aprobar', {
            clientId: id,
            sessionId,
            action: 'approve_session'
          });

           // Depuración rápida
          const debugInfo = await debugSessionStatus(id, sessionId);
          console.log('🔍 DEBUG Session Status:', debugInfo);

          try {
            operationResult = await approveSession(id, sessionId, requestId);
            
            if (!operationResult) {
              // ✅ CORRECCIÓN: Crear un error correctamente
              const error = new Error('Falló la aprobación de sesión');
              // Agregar propiedades adicionales usando 'as any'
              (error as any).sessionId = sessionId;
              (error as any).possibleReasons = [
                'Sesión no encontrada',
                'Sesión no está en estado draft', 
                'Cliente no encontrado'
              ];
              
              loggerWithContext.error('AI', 'Falló la aprobación de sesión', error);
              
              return NextResponse.json(
                { 
                  success: false, 
                  message: 'No se pudo aprobar la sesión. Verifica que la sesión esté en estado "draft".',
                  requestId
                },
                { status: 400 } // Cambia a 400 Bad Request
              );
            }
            
            message = 'Sesión aprobada exitosamente';
          } catch (error: any) {
            loggerWithContext.error('AI', 'Error en approve_session', error);
            return NextResponse.json(
              { 
                success: false, 
                message: `Error aprobando sesión: ${error.message}`,
                requestId
              },
              { status: 500 }
            );
          }
          break;

        case 'send_to_client':
          console.log('📤 SEND_TO_CLIENT: Iniciando...', { sessionId });
          operationResult = await sendToClient(id, sessionId, requestId);
          message = 'Recomendaciones enviadas al cliente';
          break;

        case 'regenerate_session':
          console.log('🔄 REGENERATE_SESSION: Iniciando...', { 
            sessionId,
            hasCoachNotes: !!data?.coachNotes,
            notesLength: data?.coachNotes?.length || 0
          });
          operationResult = await regenerateSession(id, sessionId, data?.coachNotes || '', requestId);
          message = 'Sesión regenerada';
          break;
        
        case 'generate_shopping_list':
          console.log('🛒 GENERATE_SHOPPING_LIST: Iniciando...', { sessionId, weekNumber: data?.weekNumber });
          operationResult = await generateShoppingList(id, sessionId, data?.weekNumber, requestId);
          message = 'Lista de compras actualizada';
          break;

        default:
          loggerWithContext.warn('AI', 'Acción no válida', { action });
          return NextResponse.json(
            { success: false, message: 'Acción no válida' },
            { status: 400 }
          );
      }

      // ⚠️ CORRECCIÓN: Usar la variable correcta `operationResult`
      if (!operationResult) {
        loggerWithContext.error('AI', 'No se pudo realizar la actualización');
        return NextResponse.json(
          { success: false, message: 'No se pudo realizar la actualización' },
          { status: 500 }
        );
      }

      console.log(`✅ ${action} completado exitosamente`);
      return NextResponse.json({
        success: true,
        message,
        requestId
      });

    } catch (error: any) {
      console.error('💥 ERROR en endpoint PUT:', error.message);
      logger.error('AI', 'Error en endpoint PUT', error);
      
      loggerWithContext.error('AI', 'Error actualizando recomendaciones IA', error);
      
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
    if (typeof value === 'string' && key !== 'documents' && key !== 'processedDocuments') {
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

  // ✅ NUEVO: Preparar DOCUMENTOS PROCESADOS (estructura separada)
  const processedDocs = [];
  if (client.medicalData?.processedDocuments && Array.isArray(client.medicalData.processedDocuments)) {
    loggerWithContext.debug('AI', 'Procesando documentos procesados para IA', {
      documentCount: client.medicalData.processedDocuments.length
    });
    
    try {
      for (const procDoc of client.medicalData.processedDocuments) {
        try {
          // Solo usar documentos con buen nivel de confianza y completados
          const extractionStatus = procDoc.metadata?.extractionStatus || 'pending';
          const confidence = procDoc.confidence || 0;
          
          if (extractionStatus === 'completed' && confidence > 50) {
            const docTitle = safeDecrypt(procDoc.title || '');
            const docContent = safeDecrypt(procDoc.content || '');
            
            processedDocs.push({
              title: docTitle,
              content: docContent.substring(0, 2000), // Limitar longitud para no saturar el prompt
              processedAt: procDoc.processedAt,
              confidence,
              type: procDoc.metadata?.documentType || 'unknown',
              source: 'textract',
              pageCount: procDoc.metadata?.pageCount || 1,
              language: procDoc.metadata?.language || 'es'
            });
            
            loggerWithContext.debug('AI', 'Documento procesado incluido', {
              title: docTitle.substring(0, 50),
              confidence,
              contentLength: docContent.length
            });
          } else {
            loggerWithContext.debug('AI', 'Documento procesado excluido por baja confianza o estado', {
              extractionStatus,
              confidence
            });
          }
        } catch (error) {
          loggerWithContext.error('AI', 'Error desencriptando documento procesado', error as Error);
        }
      }
    } catch (error) {
      loggerWithContext.error('AI', 'Error procesando documentos procesados para IA', error as Error);
    }
  } else {
    loggerWithContext.debug('AI', 'No hay documentos procesados disponibles');
  }

  // ✅ COMPATIBILIDAD: Si no hay documentos procesados, intentar con documentos originales (estructura antigua)
  const legacyDocuments = [];
  if (processedDocs.length === 0 && client.medicalData?.documents) {
    loggerWithContext.debug('AI', 'Usando documentos originales (estructura antigua) para compatibilidad', {
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
            
            // Solo incluir si tiene análisis de Textract
            if (decryptedDoc.textractAnalysis?.extractedText) {
              const content = safeDecrypt(decryptedDoc.textractAnalysis.extractedText || '');
              
              legacyDocuments.push({
                title: docName,
                content: content.substring(0, 2000),
                type: decryptedDoc.textractAnalysis.documentType || 'unknown',
                source: 'textract_legacy',
                confidence: decryptedDoc.textractAnalysis.confidence || 0
              });
              
              loggerWithContext.debug('AI', 'Documento legacy procesado', {
                documentName: docName,
                hasTextractAnalysis: true
              });
            } else {
              loggerWithContext.debug('AI', 'Documento sin textractAnalysis, omitiendo', {
                documentName: docName
              });
            }
          } catch (error) {
            loggerWithContext.error('AI', 'Error procesando documento legacy individual', error as Error);
          }
        }
      }
    } catch (error) {
      loggerWithContext.error('AI', 'Error procesando documentos legacy para IA', error as Error);
    }
  }

  // Combinar documentos (preferir procesados sobre legacy)
  const allDocuments = [...processedDocs, ...legacyDocuments];

  // Preparar historial de checklist si existe
  const previousChecklistStatus = [];
  if (client.aiProgress?.sessions) {
    for (const session of client.aiProgress.sessions) {
      if (session.checklist && Array.isArray(session.checklist)) {
        // Filtrar solo items completados para mostrar progreso
        const completedItems = session.checklist
        .filter((item: { completed: any; }) => item.completed)
        .map((item: { description: any; completedDate: any; }) => ({
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

  // Preparar historial de documentos procesados para contexto
  const documentHistory = [];
  if (client.medicalData?.processedDocuments && Array.isArray(client.medicalData.processedDocuments)) {
    const recentProcessed = client.medicalData.processedDocuments
      .sort((a: any, b: any) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime())
      .slice(0, 5); // Solo los 5 más recientes
    
    for (const doc of recentProcessed) {
      documentHistory.push({
        processedAt: doc.processedAt,
        processedBy: doc.processedBy,
        confidence: doc.confidence,
        status: doc.metadata?.extractionStatus || 'unknown'
      });
    }
  }

  loggerWithContext.debug('AI', 'Entrada para IA preparada', {
    personalDataKeys: Object.keys(personalData),
    medicalDataKeys: Object.keys(medicalData),
    processedDocsCount: processedDocs.length,
    legacyDocsCount: legacyDocuments.length,
    totalDocs: allDocuments.length,
    documentHistoryCount: documentHistory.length
  });

  return {
    personalData,
    medicalData,
    documents: allDocuments, // ✅ Ahora incluye documentos procesados y legacy
    documentHistory, // ✅ Historial de procesamientos
    previousChecklistStatus,
    previousSessions: client.aiProgress?.sessions || [],
    // Información adicional para el prompt
    meta: {
      totalProcessedDocuments: processedDocs.length,
      totalLegacyDocuments: legacyDocuments.length,
      hasDocumentHistory: documentHistory.length > 0,
      lastDocumentProcessed: client.medicalData?.lastDocumentProcessed
    }
  };
}

async function reprocessClientDocuments(clientId: string, documents: any[], requestId: string) {
  const loggerWithContext = requestId ? logger.withContext({ requestId, clientId }) : logger;
  
  loggerWithContext.info('TEXTRACT', 'Reprocesando documentos con estructura separada');
  
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
    
    // Por cada documento, procesar con Textract y guardar en processedDocuments
    const processingPromises = docsArray.map(async (doc, index) => {
      try {
        // Extraer info del documento
        const originalName = safeDecrypt(doc.name || '');
        const s3Key = safeDecrypt(doc.key);
        
        // Procesar con Textract
        const docType = TextractService.determineDocumentType(originalName);
        const analysis = await TextractService.processMedicalDocument(s3Key, docType);
        
        // Crear processed document
        const processedDoc: any = {
          id: `reproc_${Date.now()}_${index}`,
          originalName: encrypt(originalName),
          s3Key: encrypt(s3Key),
          title: encrypt(`Reprocesado: ${originalName}`),
          content: encrypt(analysis.extractedText || ''),
          processedAt: new Date(),
          processedBy: 'textract',
          confidence: analysis.status === 'completed' ? analysis.confidence : 0,
          metadata: {
            extractionStatus: analysis.status,
            documentType: analysis.documentType,
            reprocessed: true,
            originalUploadDate: doc.uploadedAt
          }
        };
        
        return processedDoc;
      } catch (error) {
        loggerWithContext.error('TEXTRACT', `Error reprocesando documento ${index}`, error as Error);
        return null;
      }
    });

    const processedDocs = (await Promise.all(processingPromises)).filter(doc => doc !== null);
    
    if (processedDocs.length > 0) {
      const healthForms = await getHealthFormsCollection();
      
      // Agregar al array de processedDocuments
      const result = await healthForms.updateOne(
        { _id: new ObjectId(clientId) },
        {
          $push: {
            'medicalData.processedDocuments': { $each: processedDocs }
          },
          $set: {
            'medicalData.lastDocumentProcessed': new Date(),
            updatedAt: new Date()
          }
        } as any
      );
      
      loggerWithContext.info('TEXTRACT', 'Documentos reprocesados en estructura separada', {
        clientId,
        processedCount: processedDocs.length
      });
    }
    
  } catch (error) {
    loggerWithContext.error('TEXTRACT', 'Error general reprocesando documentos', error as Error);
  }
}

async function updateChecklist(
  clientId: string,
  sessionId: string,
  checklistItems: ChecklistItem[],
  requestId: string
): Promise<any> {
  const loggerWithContext = logger.withContext({ requestId, clientId });

  loggerWithContext.info('AI', '🚀 Iniciando actualización de checklist', {
    sessionId,
    itemCount: checklistItems.length,
    completedCount: checklistItems.filter(item => item.completed).length
  });

  try {
    const healthForms = await getHealthFormsCollection();

    // 1. Obtener el cliente y la sesión actual
    const client = await healthForms.findOne({
      _id: new ObjectId(clientId),
      'aiProgress.sessions.sessionId': sessionId
    });

    if (!client || !client.aiProgress) {
      throw new Error('Cliente o sesión no encontrada');
    }

    const sessionIndex = client.aiProgress.sessions.findIndex(
      (s: any) => s.sessionId === sessionId
    );

    if (sessionIndex === -1) {
      throw new Error('Sesión no encontrada');
    }

    // 2. Encriptar el checklist recibido (viene desencriptado del frontend)
    const encryptedChecklistItems: ChecklistItem[] = checklistItems.map((item) => ({
      ...item,
      description: encrypt(item.description),
      details: item.details ? {
        ...item.details,
        recipe: item.details.recipe ? {
          ...item.details.recipe,
          ingredients: item.details.recipe.ingredients.map(ing => ({
            name: encrypt(ing.name),
            quantity: encrypt(ing.quantity),
            notes: ing.notes ? encrypt(ing.notes) : undefined
          })),
          preparation: encrypt(item.details.recipe.preparation),
          tips: item.details.recipe.tips ? encrypt(item.details.recipe.tips) : undefined
        } : undefined,
        frequency: item.details.frequency ? encrypt(item.details.frequency) : undefined,
        duration: item.details.duration ? encrypt(item.details.duration) : undefined,
        equipment: item.details.equipment?.map(eq => encrypt(eq))
      } : undefined
    }));

    // 3. Actualizar SOLO el campo checklist de la sesión (NO weeks)
    const updateResult = await healthForms.updateOne(
      {
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      {
        $set: {
          'aiProgress.sessions.$.checklist': encryptedChecklistItems,
          'aiProgress.sessions.$.updatedAt': new Date(),
          'aiProgress.lastEvaluation': new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error('No se pudo actualizar la base de datos');
    }

    // 4. Obtener el cliente actualizado y devolver la sesión desencriptada
    const updatedClient = await healthForms.findOne({
      _id: new ObjectId(clientId)
    });

    if (!updatedClient?.aiProgress) {
      throw new Error('No se pudo obtener el cliente actualizado');
    }

    const updatedSessionIndex = updatedClient.aiProgress.sessions.findIndex(
      (s: any) => s.sessionId === sessionId
    );

    const updatedSession = updatedClient.aiProgress.sessions[updatedSessionIndex];
    const decryptedSession = decryptAISessionCompletely(updatedSession);

    const completedItems = decryptedSession.checklist?.filter((item: any) => item.completed).length || 0;
    const totalItems = decryptedSession.checklist?.length || 0;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      success: true,
      data: {
        session: decryptedSession,
        progress,
        completedItems,
        totalItems
      }
    };

  } catch (error: any) {
    loggerWithContext.error('AI', '💥 Error actualizando checklist', error);
    return {
      success: false,
      message: error.message
    };
  }
}

async function approveSession(clientId: string, sessionId: string, requestId: string): Promise<boolean> {
  const loggerWithContext = logger.withContext({ requestId, clientId });
  
  loggerWithContext.info('AI', '✅ Aprobando sesión (sin enviar email)', { sessionId });
  
  try {
    const healthForms = await getHealthFormsCollection();
    
    // 1. Primero buscar el cliente
    const client = await healthForms.findOne({ 
      _id: new ObjectId(clientId)
    });

    if (!client || !client.aiProgress) {
      loggerWithContext.warn('AI', 'Cliente o progreso de IA no encontrado', {
        clientId,
        hasClient: !!client,
        hasAIProgress: !!client?.aiProgress
      });
      return false;
    }

    // 2. Verificar que la sesión existe y está en estado 'draft'
    const sessionIndex = client.aiProgress.sessions.findIndex(
      (s: any) => s.sessionId === sessionId
    );

    if (sessionIndex === -1) {
      loggerWithContext.warn('AI', 'Sesión no encontrada', {
        clientId,
        sessionId,
        availableSessions: client.aiProgress.sessions?.map((s: any) => ({
          sessionId: s.sessionId,
          status: s.status
        }))
      });
      return false;
    }

    const targetSession = client.aiProgress.sessions[sessionIndex];
    
    if (targetSession.status !== 'draft') {
      loggerWithContext.warn('AI', 'Sesión no está en estado draft', { 
        sessionId, 
        currentStatus: targetSession.status,
        requiredStatus: 'draft'
      });
      return false;
    }

    // 3. Actualizar solo el estado a 'approved'
    const result = await healthForms.updateOne(
      { 
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      {
        $set: {
          'aiProgress.sessions.$.status': 'approved',
          'aiProgress.sessions.$.approvedAt': new Date(),
          'aiProgress.sessions.$.updatedAt': new Date(),
          'aiProgress.updatedAt': new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      loggerWithContext.info('AI', '✅ Sesión aprobada exitosamente (email NO enviado)', { 
        sessionId,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      });
      return true;
    } else {
      loggerWithContext.warn('AI', 'No se modificó ningún documento al aprobar sesión', { 
        sessionId,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      });
      return false;
    }
    
  } catch (error: any) {
    loggerWithContext.error('AI', '❌ Error aprobando sesión', error);
    return false;
  }
}

async function sendToClient(clientId: string, sessionId: string, requestId: string): Promise<boolean> {
  const loggerWithContext = logger.withContext({ requestId, clientId });
  
  loggerWithContext.info('AI', '📤 Enviando sesión al cliente via email', { sessionId });
  
  try {
    const healthForms = await getHealthFormsCollection();
    
    // 1. Obtener el cliente completo
    const client = await healthForms.findOne({ 
      _id: new ObjectId(clientId),
      'aiProgress.sessions.sessionId': sessionId
    });

    if (!client || !client.aiProgress) {
      loggerWithContext.warn('AI', 'Cliente o progreso de IA no encontrado');
      return false;
    }

    // 2. Encontrar la sesión específica
    const sessionIndex = client.aiProgress.sessions.findIndex(
      (s: any) => s.sessionId === sessionId
    );

    if (sessionIndex === -1) {
      loggerWithContext.warn('AI', 'Sesión no encontrada', { sessionId });
      return false;
    }

    const session = client.aiProgress.sessions[sessionIndex];
    
    // 3. Verificar que la sesión esté aprobada
    if (session.status !== 'approved') {
      loggerWithContext.warn('AI', 'Sesión no está aprobada', { 
        sessionId, 
        currentStatus: session.status,
        requiredStatus: 'approved'
      });
      return false;
    }

    // 4. Desencriptar la sesión completa para el email
    const decryptedSession = decryptAISessionCompletely(session);
    
    // 5. Obtener y desencriptar el email del cliente
    let clientEmail = '';
    let clientName = 'Cliente';
    
    try {
      if (client.personalData?.email) {
        clientEmail = safeDecrypt(client.personalData.email);
      }
      
      if (client.personalData?.name) {
        clientName = safeDecrypt(client.personalData.name);
      }
    } catch (error) {
      loggerWithContext.warn('AI', 'Error desencriptando datos personales', error as Error);
      
      // Intentar usar datos sin desencriptar si falla
      clientEmail = client.personalData?.email || '';
      clientName = client.personalData?.name || 'Cliente';
    }

    // 6. Validar que el cliente tenga email
    if (!clientEmail || !clientEmail.includes('@')) {
      loggerWithContext.error('AI', 'Email del cliente inválido o no encontrado', undefined, {
        clientEmail,
        clientId,
        sessionId
      });
      return false;
    }

    // 7. Enviar email con el plan mensual usando EmailService
    let emailSent = false;
    let emailError: any = null;
    
    try {
      loggerWithContext.info('EMAIL', '✉️ Iniciando envío de email de plan mensual', {
        clientEmail,
        clientName,
        monthNumber: session.monthNumber
      });
      
      const emailService = EmailService.getInstance();
      
      // Verificar configuración del email
      const configCheck = await emailService.testConfiguration();
      loggerWithContext.debug('EMAIL', 'Configuración del servicio de email', configCheck);
      
      if (!configCheck.configured) {
        loggerWithContext.warn('EMAIL', 'Servicio de email no configurado correctamente', {
          issues: configCheck.issues,
          fromEmail: configCheck.fromEmail
        });
      }
      
      emailSent = await emailService.sendMonthlyPlanEmail(
        clientEmail,
        clientName,
        decryptedSession,
        session.monthNumber,
        { clientId, sessionId, requestId }
      );
      
      if (emailSent) {
        loggerWithContext.info('EMAIL', '✅ Email enviado exitosamente', {
          clientEmail,
          clientName,
          monthNumber: session.monthNumber
        });
      } else {
        loggerWithContext.warn('EMAIL', '❌ Email no se pudo enviar', {
          clientEmail,
          clientName
        });
      }
      
    } catch (err: any) {
      emailError = err;
      loggerWithContext.error('EMAIL', 'Error enviando email', err);
    }

    // 8. Determinar el estado final basado en el éxito del email
    const newStatus = emailSent ? 'sent' : 'approved'; // Si falla el email, mantener como aprobado
    const updateData: any = {
      $set: {
        'aiProgress.sessions.$.status': newStatus,
        'aiProgress.sessions.$.updatedAt': new Date(),
        'aiProgress.sessions.$.emailSent': emailSent,
        'aiProgress.sessions.$.emailSentAt': emailSent ? new Date() : undefined
      }
    };

    if (emailError) {
      updateData.$set['aiProgress.sessions.$.emailError'] = emailError.message;
    }

    // 9. Actualizar la sesión en la base de datos
    const result = await healthForms.updateOne(
      { 
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      updateData
    );

    if (result.modifiedCount > 0) {
      if (emailSent) {
        loggerWithContext.info('AI', '✅ Sesión enviada al cliente exitosamente', { 
          sessionId, 
          clientEmail,
          clientName,
          monthNumber: session.monthNumber 
        });
      } else {
        loggerWithContext.warn('AI', '⚠️ Sesión NO se pudo enviar al cliente (email falló)', { 
          sessionId,
          clientEmail,
          clientName,
          emailError: emailError?.message || 'Servicio de email no configurado'
        });
      }
      return emailSent; // Retorna true solo si el email se envió
    } else {
      loggerWithContext.warn('AI', 'No se modificó ningún documento al enviar sesión', { sessionId });
      return false;
    }
    
  } catch (error: any) {
    loggerWithContext.error('AI', '💥 Error enviando sesión al cliente', error);
    return false;
  }
}

async function regenerateSession(clientId: string, sessionId: string, coachNotes: string, requestId: string): Promise<boolean> {
  const loggerWithContext = logger.withContext({ requestId, clientId });
  
  loggerWithContext.info('AI_REGEN', '🚀 Iniciando proceso de regeneración', { 
    sessionId,
    hasCoachNotes: !!coachNotes && coachNotes.trim().length > 0,
    notesLength: coachNotes?.length || 0
  });
  
  try {
    const healthForms = await getHealthFormsCollection();
    
    // 1. Obtener el cliente y la sesión actual
    loggerWithContext.debug('AI_REGEN', 'Buscando cliente y sesión', { clientId, sessionId });
    
    const client = await healthForms.findOne({ 
      _id: new ObjectId(clientId),
      'aiProgress.sessions.sessionId': sessionId
    });

    if (!client || !client.aiProgress) {
      loggerWithContext.error('AI_REGEN', 'Cliente o progreso de IA no encontrado', undefined, {
        clientId,
        hasClient: !!client,
        hasAIProgress: !!client?.aiProgress
      });
      return false;
    }

    // 2. Encontrar la sesión específica
    const sessionIndex = client.aiProgress.sessions.findIndex(
      (s: any) => s.sessionId === sessionId
    );

    if (sessionIndex === -1) {
      loggerWithContext.error('AI_REGEN', 'Sesión no encontrada', undefined, { sessionId });
      return false;
    }

    const existingSession = client.aiProgress.sessions[sessionIndex];
    
    // 3. ✅ VERIFICAR QUE LA SESIÓN ESTÉ EN ESTADO 'draft'
    loggerWithContext.debug('AI_REGEN', 'Verificando estado de sesión', {
      sessionId,
      currentStatus: existingSession.status,
      allowed: existingSession.status === 'draft'
    });
    
    if (existingSession.status !== 'draft') {
      loggerWithContext.error('AI_REGEN', '❌ No se puede regenerar - sesión no está en estado draft', undefined, {
        sessionId,
        currentStatus: existingSession.status,
        allowedStatuses: ['draft']
      });
      throw new Error(`Solo se pueden regenerar sesiones en estado 'draft'. Estado actual: '${existingSession.status}'`);
    }

    loggerWithContext.info('AI_REGEN', '✅ Sesión validada para regeneración', {
      sessionId,
      monthNumber: existingSession.monthNumber,
      status: existingSession.status
    });

    // 4. Preparar datos para la IA incluyendo notas del coach
    loggerWithContext.info('AI_REGEN', '🔄 Preparando datos para regeneración');
    
    const aiInput = await prepareAIInput(client, requestId);
    
    // Agregar notas del coach si las hay
    if (coachNotes && coachNotes.trim().length > 0) {
      aiInput.coachNotes = coachNotes;
      loggerWithContext.debug('AI_REGEN', 'Notas del coach incluidas', {
        notesLength: coachNotes.length,
        preview: coachNotes.substring(0, 100) + (coachNotes.length > 100 ? '...' : '')
      });
    } else {
      loggerWithContext.debug('AI_REGEN', 'No hay notas del coach, regenerando sin modificaciones');
    }
    
    // Agregar sesiones anteriores (excluyendo la actual si es necesario)
    if (client.aiProgress.sessions && client.aiProgress.sessions.length > 0) {
      const otherSessions = client.aiProgress.sessions.filter(
        (s: any, idx: number) => idx !== sessionIndex
      );
      aiInput.previousSessions = otherSessions;
      loggerWithContext.debug('AI_REGEN', 'Sesiones anteriores incluidas', {
        count: otherSessions.length
      });
    }

    // 5. Generar NUEVAS recomendaciones con la IA
    loggerWithContext.info('AI_REGEN', '🤖 Llamando a IA para generar nuevas recomendaciones', {
      monthNumber: existingSession.monthNumber,
      hasPreviousSessions: aiInput.previousSessions?.length || 0
    });
    
    const newRecommendations = await AIService.analyzeClientAndGenerateRecommendations(
      aiInput, 
      existingSession.monthNumber,
      { 
        requestId, 
        clientId,
        isRegeneration: true, // <-- Nuevo flag
        previousSessionId: sessionId // <-- ID de la sesión anterior
      }
    );

    loggerWithContext.info('AI_REGEN', '✅ Nuevas recomendaciones generadas', {
      newSessionId: newRecommendations.sessionId,
      monthNumber: newRecommendations.monthNumber,
      weekCount: newRecommendations.weeks?.length || 0,
      summaryLength: newRecommendations.summary?.length || 0
    });

    // 6. Actualizar la sesión en la base de datos (REEMPLAZAR)
    // Mantener el mismo sessionId? O crear uno nuevo? 
    // Vamos a crear uno nuevo para mantener historial de regeneraciones
    const updateData: any = {
      $set: {
        'aiProgress.sessions.$.sessionId': newRecommendations.sessionId, // Nuevo ID
        'aiProgress.sessions.$.summary': newRecommendations.summary,
        'aiProgress.sessions.$.vision': newRecommendations.vision,
        'aiProgress.sessions.$.baselineMetrics': newRecommendations.baselineMetrics,
        'aiProgress.sessions.$.weeks': newRecommendations.weeks,
        'aiProgress.sessions.$.checklist': newRecommendations.checklist,
        'aiProgress.sessions.$.status': 'draft', // Mantener en draft
        'aiProgress.sessions.$.updatedAt': new Date(),
        'aiProgress.sessions.$.regeneratedAt': new Date(),
        'aiProgress.sessions.$.regenerationCount': (existingSession.regenerationCount || 0) + 1,
        'aiProgress.currentSessionId': newRecommendations.sessionId,
        'aiProgress.lastEvaluation': new Date(),
        updatedAt: new Date()
      }
    };

    // Agregar notas del coach si las hay
    if (coachNotes && coachNotes.trim().length > 0) {
      updateData.$set['aiProgress.sessions.$.coachNotes'] = coachNotes;
      updateData.$set['aiProgress.sessions.$.lastCoachNotes'] = coachNotes;
    }

    // Agregar historial de regeneración
    const regenerationHistory = {
      timestamp: new Date(),
      previousSessionId: existingSession.sessionId,
      coachNotes: coachNotes || null,
      triggeredBy: 'coach'
    };

    updateData.$push = {
      'aiProgress.sessions.$.regenerationHistory': regenerationHistory
    };

    const result = await healthForms.updateOne(
      { 
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      updateData
    );

    loggerWithContext.debug('AI_REGEN', 'Resultado de actualización en BD', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      oldSessionId: sessionId,
      newSessionId: newRecommendations.sessionId
    });

    if (result.modifiedCount > 0) {
      loggerWithContext.info('AI_REGEN', '🎉 Regeneración completada exitosamente', {
        oldSessionId: sessionId,
        newSessionId: newRecommendations.sessionId,
        monthNumber: existingSession.monthNumber,
        regenerationNumber: (existingSession.regenerationCount || 0) + 1
      });
      return true;
    } else {
      loggerWithContext.error('AI_REGEN', '❌ No se modificó ningún documento', undefined, {
        sessionId,
        matchedCount: result.matchedCount
      });
      return false;
    }
    
  } catch (error: any) {
    loggerWithContext.error('AI_REGEN', '💥 Error en proceso de regeneración', error);
    
    // Enviar error específico si es por estado incorrecto
    if (error.message.includes("estado 'draft'")) {
      throw error; // Propagar error específico
    }
    
    return false;
  }
}

async function debugSessionStatus(clientId: string, targetSessionId: string): Promise<any> {
  try {
    const healthForms = await getHealthFormsCollection();
    const client = await healthForms.findOne({ 
      _id: new ObjectId(clientId)
    });

    if (!client?.aiProgress) {
      return { error: 'Cliente sin progreso de IA' };
    }

    const sessions = client.aiProgress.sessions || [];
    
    return {
      clientId,
      totalSessions: sessions.length,
      targetSession: sessions.find((s: any) => s.sessionId === targetSessionId),
      allSessions: sessions.map((s: any) => ({
        sessionId: s.sessionId,
        monthNumber: s.monthNumber,
        status: s.status,
        updatedAt: s.updatedAt
      }))
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

async function updateSessionFields(
  clientId: string,
  sessionId: string,
  fields: { summary?: string; vision?: string },
  requestId: string
): Promise<any> {
  const loggerWithContext = logger.withContext({ requestId, clientId });

  loggerWithContext.info('AI', 'Actualizando campos de sesión', { sessionId, fields });

  try {
    const healthForms = await getHealthFormsCollection();

    // Construir objeto de actualización dinámico
    const updateFields: any = {};
    if (fields.summary !== undefined) {
      updateFields['aiProgress.sessions.$.summary'] = encrypt(fields.summary);
    }
    if (fields.vision !== undefined) {
      updateFields['aiProgress.sessions.$.vision'] = encrypt(fields.vision);
    }
    updateFields['aiProgress.sessions.$.updatedAt'] = new Date();
    updateFields['aiProgress.updatedAt'] = new Date();
    updateFields['updatedAt'] = new Date();

    const result = await healthForms.updateOne(
      {
        _id: new ObjectId(clientId),
        'aiProgress.sessions.sessionId': sessionId
      },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      throw new Error('No se pudo actualizar la sesión');
    }

    // Obtener la sesión actualizada para devolverla
    const updatedClient = await healthForms.findOne({ _id: new ObjectId(clientId) });
    const updatedSession = updatedClient?.aiProgress?.sessions?.find(
      (s: any) => s.sessionId === sessionId
    );

    if (!updatedSession) {
      throw new Error('Sesión no encontrada después de actualizar');
    }

    const decryptedSession = decryptAISessionCompletely(updatedSession);

    return {
      success: true,
      data: {
        session: decryptedSession
      }
    };

  } catch (error: any) {
    loggerWithContext.error('AI', 'Error actualizando campos de sesión', error);
    return {
      success: false,
      message: error.message
    };
  }
}

async function generateShoppingList(
  clientId: string,
  sessionId: string,
  weekNumber: number,
  requestId: string
): Promise<any> {
  const loggerWithContext = logger.withContext({ requestId, clientId });

  try {
    const healthForms = await getHealthFormsCollection();
    const client = await healthForms.findOne({ _id: new ObjectId(clientId) });

    if (!client || !client.aiProgress) {
      throw new Error('Cliente no encontrado');
    }

    const sessionIndex = client.aiProgress.sessions.findIndex((s: any) => s.sessionId === sessionId);
    if (sessionIndex === -1) throw new Error('Sesión no encontrada');

    const session = client.aiProgress.sessions[sessionIndex];
    const weekIndex = session.weeks.findIndex((w: any) => w.weekNumber === weekNumber);
    if (weekIndex === -1) throw new Error('Semana no encontrada');

    // Obtener items de nutrición de la semana y desencriptarlos
    const nutritionItems = session.checklist
      .filter((item: any) => item.weekNumber === weekNumber && item.category === 'nutrition')
      .map((item: any) => ({
        ...item,
        description: safeDecrypt(item.description),
        recipeId: item.recipeId,
        frequency: item.frequency || 1,
        details: item.details ? {
          recipe: item.details.recipe ? {
            ingredients: item.details.recipe.ingredients.map((ing: any) => ({
              name: safeDecrypt(ing.name),
              quantity: safeDecrypt(ing.quantity),
              notes: ing.notes ? safeDecrypt(ing.notes) : undefined
            })),
            preparation: safeDecrypt(item.details.recipe.preparation),
            tips: item.details.recipe.tips ? safeDecrypt(item.details.recipe.tips) : undefined
          } : undefined
        } : undefined
      }));

    console.log('nutritionItems:', JSON.stringify(nutritionItems, null, 2));
    // Llamar al servicio con los items completos
    const shoppingList = await AIService.generateShoppingListFromItems(nutritionItems);
    console.log('shoppingList generada:', shoppingList);

    // Actualizar la semana con la nueva lista
    const updatePath = `aiProgress.sessions.${sessionIndex}.weeks.${weekIndex}.nutrition.shoppingList`;
    const result = await healthForms.updateOne(
      { _id: new ObjectId(clientId) },
      { $set: { [updatePath]: shoppingList } }
    );
    console.log('Resultado de update:', result);

    if (result.matchedCount === 0) {
      throw new Error('Cliente no encontrado');
    }

    return { success: true, shoppingList };
  } catch (error: any) {
    loggerWithContext.error('AI', 'Error generando lista de compras', error);
    return { success: false, message: error.message };
  }
}