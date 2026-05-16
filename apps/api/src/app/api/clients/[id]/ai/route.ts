// apps/api/src/app/api/clients/[id]/ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection, connectMongoose } from '@/app/lib/database';
import { requireAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { decrypt, encrypt, isEncrypted, safeDecrypt } from '@/app/lib/encryption';
import { AIService } from '@/app/lib/ai-service';
import { ChecklistItem, AIRecommendationSession } from '../../../../../../../../packages/types/src/healthForm';
import { EmailService } from '@/app/lib/email-service';
import { generateCompositeRecommendation, CompositeOutputWithIds } from '@/app/lib/composite-recommendation';
import Coach from '@/app/models/Coach';

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

      // Si hay un error de generación pendiente (Inngest falló), incluirlo
      const generationError = aiProgress.generationError || null;
      if (generationError) {
        loggerWithContext.warn('AI', 'Error de generación pendiente encontrado', {
          errorMessage: generationError.message,
          timestamp: generationError.timestamp,
        });
      }

      // Si solo hay error y no sesiones, devolver el error sin intentar desencriptar
      if (!aiProgress.sessions || aiProgress.sessions.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            hasAIProgress: true,
            aiProgress: {
              sessions: [],
              generationError,
              overallProgress: aiProgress.overallProgress || 0,
            },
            generationError,
          },
          requestId,
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
            sessions: decryptedSessions,  // ✅ Ahora completamente desencriptadas
          },
          generationError,
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
          hasCoachNotes: !!body.coachNotes
        });
      } catch (error) {
        loggerWithContext.error('AI', 'Error parseando JSON de la solicitud', error as Error);
        return NextResponse.json(
          { success: false, message: 'Cuerpo de solicitud inválido' },
          { status: 400 }
        );
      }

      const { monthNumber = 1, coachNotes = '' } = body;

      loggerWithContext.info('AI', 'Parámetros procesados', {
        monthNumber,
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

      // 1. Preparar datos para la IA
      const aiInput = await prepareAIInput(client, requestId);

      // 2. Agregar notas del coach si las hay
      if (coachNotes) {
        aiInput.coachNotes = coachNotes;
      }

      // 3. Agregar sesiones anteriores si existen
      if (client.aiProgress?.sessions) {
        aiInput.previousSessions = client.aiProgress.sessions;
        aiInput.currentProgress = client.aiProgress;
      }

      // 4. Generar recomendaciones con prompt compuesto (DIRECTO, sin Inngest)
      loggerWithContext.info('AI', 'Generando recomendaciones con prompt compuesto');

      const {
        mentalHealth,
        healthAssessment,
        documents: processedDocuments,
      } = aiInput;

      const compositeResult = await generateCompositeRecommendation({
        personalData: aiInput.personalData || {},
        medicalData: aiInput.medicalData || {},
        healthAssessment: healthAssessment || {},
        mentalHealth: mentalHealth || {},
        processedDocuments: (processedDocuments || []).map((d: { title?: string; content?: string; documentType?: string; confidence?: number }) => ({
          title: d.title || '',
          content: d.content || '',
          documentType: d.documentType || 'other',
          confidence: d.confidence || 0,
        })),
        previousSessions: aiInput.previousSessions || [],
        coachNotes: aiInput.coachNotes || '',
        monthNumber,
      });

      loggerWithContext.info('AI', 'Recomendaciones generadas exitosamente', {
        weekCount: compositeResult.nutritionPlan?.weeklyPlan?.length || 7,
      });

      // IDs de recetas y ejercicios encontrados en la DB
      const recipeIds: Record<string, string> = compositeResult._recipeIds || {};
      const exerciseIds: Record<string, string> = compositeResult._exerciseIds || {};

      // 6. Construir sesión y guardar en DB
      const sessionId = `session_${Date.now()}_${monthNumber}`;

      // Construir checklist items desde el plan semanal
      const checklistItems: ChecklistItem[] = [];
      const dayTranslations: Record<string, string> = { Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles', Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo' };

      // Items de nutrición (desayuno/almuerzo/cena para cada día)
      if (compositeResult.nutritionPlan?.weeklyPlan) {
        for (const day of compositeResult.nutritionPlan.weeklyPlan) {
          const dayName = dayTranslations[day.day] || day.day;
          for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
            const mealName = meal === 'breakfast' ? 'Desayuno' : meal === 'lunch' ? 'Almuerzo' : 'Cena';
            const recipe = day[meal];
            if (recipe) {
              const recipeId = recipeIds[recipe] || '';
              checklistItems.push({
                id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                description: `${dayName} ${mealName}: ${recipe}`,
                completed: false,
                weekNumber: 1,
                category: 'nutrition',
              type: mealName.toLowerCase(),
              recipeId,
              details: recipeId ? undefined : { recipe: { ingredients: [], preparation: recipe } },
              isRecurring: false,
            } as ChecklistItem);
          }
        }
      }
    }

    // Items de ejercicios
      if (compositeResult.exercisePlan?.weeklyRoutine) {
        for (const day of compositeResult.exercisePlan.weeklyRoutine) {
          const dayName = dayTranslations[day.day] || day.day;
          if (day.exercises) {
            for (const ex of day.exercises) {
              const exerciseId = exerciseIds[ex.name] || '';
              checklistItems.push({
                id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                description: `${dayName}: ${ex.name}`,
                completed: false,
                weekNumber: 1,
                category: 'exercise',
                type: 'ejercicio',
                recipeId: exerciseId,
                details: {
                  duration: `${ex.sets || 3} series x ${ex.repetitions || '12'} reps`,
                  equipment: compositeResult.exercisePlan?.equipment,
                  frequency: day.day,
                },
                isRecurring: false,


              });
            }
          }
        }
      }

      // Items de hábitos (adoptar)
      if (compositeResult.habitPlan?.toAdopt) {
        for (const h of compositeResult.habitPlan.toAdopt) {
          checklistItems.push({
            id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            description: h.habit || 'Nuevo hábito',
            completed: false,
            weekNumber: 1,
            category: 'habit',
            type: 'toAdopt',
            isRecurring: true,
            details: { trigger: h.trigger || undefined },
          } as ChecklistItem);
        }
      }
      if (compositeResult.habitPlan?.toEliminate) {
        for (const h of compositeResult.habitPlan.toEliminate) {
          checklistItems.push({
            id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            description: h.habit ? (h.replacement ? `${h.habit} → ${h.replacement}` : h.habit) : 'Eliminar hábito',
            completed: false,
            weekNumber: 1,
            category: 'habit',
            type: 'toEliminate',
            isRecurring: true,
          } as ChecklistItem);
        }
      }

      // Items de alternativas
      if (compositeResult.alternatives) {
        for (const alt of compositeResult.alternatives) {
          const mealLabel = alt.meal || 'comida';
          const recipeLabel = alt.recipe || 'receta';
          checklistItems.push({
            id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            description: `🔄 Alternativa - ${mealLabel}: ${recipeLabel}`,
            completed: false,
            weekNumber: 1,
            category: 'nutrition',
            type: 'alternativa',
            notes: alt.description || '',
            isRecurring: false,
          });
        }
      }

      // Construir weeks[] con los datos desencriptados
      const shopList = compositeResult.nutritionPlan?.shoppingList || [];
      const exerciseRoutine = compositeResult.exercisePlan?.weeklyRoutine || [];

      const weeks = [{
        weekNumber: 1,
        nutrition: {
          focus: encrypt(`Plan de comidas: ${compositeResult.nutritionPlan?.weeklyPlan?.length || 7} días, 3 comidas al día`),
          shoppingList: shopList.filter((item: { item?: string; quantity?: string }) => item?.item && item?.quantity).map((item: { item?: string; quantity?: string; priority?: string }) => ({
            item: encrypt(item.item!),
            quantity: encrypt(item.quantity!),
            priority: item.priority || 'medium',
          })),
        },
        exercise: {
          focus: encrypt(compositeResult.exercisePlan?.notes || 'Rutina semanal'),
          equipment: (compositeResult.exercisePlan?.equipment || []).map((eq: string) => encrypt(eq || '')),
        },
        habits: {
          trackingMethod: compositeResult.habitPlan?.trackingMethod ? encrypt(compositeResult.habitPlan.trackingMethod) : undefined,
          motivationTip: compositeResult.habitPlan?.motivationTip ? encrypt(compositeResult.habitPlan.motivationTip) : undefined,
        },
      }];

      const encryptedSession = {
        sessionId,
        monthNumber,
        totalWeeks: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        summary: encrypt(compositeResult.clientInsights?.summary || ''),
        vision: encrypt(compositeResult.clientInsights?.vision || compositeResult.clientInsights?.summary || ''),
        baselineMetrics: {
          currentLifestyle: compositeResult.clientInsights?.keyRisks || [],
          targetLifestyle: compositeResult.clientInsights?.targetImprovements || [],
        },
        weeks,
        checklist: checklistItems,
        regenerationCount: 0,
        regenerationHistory: [],
      };

      const updateData: Record<string, unknown> = {
        $set: {
          updatedAt: new Date(),
          'aiProgress': {
            clientId: id,
            currentSessionId: sessionId,
            sessions: [encryptedSession],
            overallProgress: 0,
            lastEvaluation: new Date(),
            nextEvaluation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            metrics: {
              nutritionAdherence: 0,
              exerciseConsistency: 0,
              habitFormation: 0,
            },
          },
        },
      };

      await healthForms.updateOne(
        { _id: new ObjectId(id) },
        updateData
      );

      loggerWithContext.info('AI', 'Recomendaciones guardadas exitosamente', {
        sessionId,
      });

      return NextResponse.json({
        success: true,
        data: {
          sessionId,
          monthNumber,
          status: 'completed',
          message: 'Recomendaciones generadas exitosamente.',
          clientId: id,
          requestId,
        },
      });

    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      loggerWithContext.error('AI', 'Error generando recomendaciones IA', errorObj);

      return NextResponse.json(
        {
          success: false,
          message: 'Error generando recomendaciones',
          requestId,
          ...(process.env.NODE_ENV === 'development' && {
            error: errorObj.message
          })
        },
        { status: 500 }
      );
    }
  });
}

/**
 * Helper function to save and return recommendations (used as fallback).
 */
async function saveAndReturnRecommendations(
  recommendations: Record<string, unknown>,
  healthForms: ReturnType<typeof getHealthFormsCollection> extends Promise<infer T> ? T : never,
  clientId: string,
  monthNumber: number,
  requestId: string,
  loggerWithContext: ReturnType<typeof logger.withContext>,
  client: Record<string, unknown>
): Promise<NextResponse> {
  const updateData: Record<string, unknown> = {
    $set: {
      updatedAt: new Date()
    }
  };

  const aiProgress = client.aiProgress as { sessions?: Array<Record<string, unknown>> } | undefined;
  const sessions = aiProgress?.sessions ?? [];
  const existingSessionIndex = sessions.findIndex((s: Record<string, unknown>) => s.monthNumber === monthNumber);

  if (!aiProgress || existingSessionIndex === -1) {
    (updateData.$set as Record<string, unknown>)['aiProgress'] = {
      clientId,
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
  } else {
    const updatedSessions = [...sessions];
    updatedSessions[existingSessionIndex] = recommendations;
    (updateData.$set as Record<string, unknown>)['aiProgress.sessions'] = updatedSessions;
    (updateData.$set as Record<string, unknown>)['aiProgress.currentSessionId'] = recommendations.sessionId;
    (updateData.$set as Record<string, unknown>)['aiProgress.lastEvaluation'] = new Date();
    (updateData.$set as Record<string, unknown>)['aiProgress.nextEvaluation'] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  const collection = await healthForms;
  const result = await collection.updateOne(
    { _id: new ObjectId(clientId) },
    updateData
  );

  if (result.modifiedCount === 0 && result.upsertedCount === 0) {
    throw new Error('No se pudo guardar las recomendaciones en la base de datos');
  }

  return NextResponse.json({
    success: true,
    data: {
      sessionId: recommendations.sessionId,
      monthNumber,
      summary: recommendations.summary,
      vision: recommendations.vision,
      weekCount: (recommendations.weeks as Array<unknown>)?.length ?? 0,
      weeks: recommendations.weeks,
      requestId
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

        case 'import_session':
          console.log('📥 IMPORT_SESSION: Iniciando...', {
            monthNumber: data?.monthNumber,
            sessionDataKeys: data?.sessionData ? Object.keys(data.sessionData) : []
          });
          operationResult = await importSession(id, data?.sessionData, data?.monthNumber || 1, requestId);
          message = 'Sesión importada exitosamente';
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
              content: docContent.substring(0, 2000),
              processedAt: procDoc.processedAt,
              confidence,
              type: procDoc.metadata?.documentType || 'unknown',
              pageCount: procDoc.metadata?.pageCount || 1,
              language: procDoc.metadata?.language || 'es'
            });

            loggerWithContext.debug('AI', 'Documento procesado incluido', {
              title: docTitle.substring(0, 50),
              confidence,
              contentLength: docContent.length
            });
          } else {
            // Incluir documentos fallidos con solo el título (para que la IA sepa que existen)
            try {
              const docTitle = safeDecrypt(procDoc.title || '');
              if (docTitle && docTitle.trim()) {
                processedDocs.push({
                  title: docTitle,
                  content: `[Documento no disponible: ${extractionStatus === 'failed' ? 'error de extracción' : 'pendiente de procesar'}]`,
                  processedAt: procDoc.processedAt,
                  confidence: 0,
                  type: procDoc.metadata?.documentType || 'unknown',
                  pageCount: 0,
                  language: 'es'
                });
                loggerWithContext.debug('AI', 'Documento fallido incluido como referencia', {
                  title: docTitle.substring(0, 50),
                  extractionStatus
                });
              }
            } catch {
              // Si no se puede desencriptar el título, omitirlo
            }
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

  // Combinar documentos
  const allDocuments = [...processedDocs];

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

  // Extraer evaluaciones de salud y salud mental con contexto legible
  const healthLabels: Record<string, string> = {
    carbohydrateAddiction: 'Adicción a carbohidratos (¿Sientes ansiedad por comer carbohidratos?)',
    leptinResistance: 'Resistencia a leptina (¿Tienes problemas para sentirte satisfecho al comer?)',
    circadianRhythms: 'Ritmos circadianos (¿Tus hábitos de sueño/comida son regulares?)',
    sleepHygiene: 'Higiene del sueño (Calidad y hábitos de sueño)',
    electrosmogExposure: 'Exposición a electrosmog (Exposición a campos electromagnéticos)',
    generalToxicity: 'Toxicidad general (Exposición a toxinas ambientales)',
    microbiotaHealth: 'Salud de microbiota (Salud digestiva e intestinal)',
  };
  const healthAssessment: Record<string, string> = {};
  for (const [key, label] of Object.entries(healthLabels)) {
    if (medicalData[key]) { healthAssessment[label] = medicalData[key]; }
  }

  const mentalLabels: Record<string, string> = {
    mentalHealthEmotionIdentification: 'Identificación de emociones (¿Identificas tus emociones?)',
    mentalHealthEmotionIntensity: 'Intensidad emocional (¿Manejas emociones intensas?)',
    mentalHealthUncomfortableEmotion: 'Emociones incómodas (¿Cómo enfrentas emociones difíciles?)',
    mentalHealthInternalDialogue: 'Diálogo interno (¿Cómo es tu diálogo interno?)',
    mentalHealthStressStrategies: 'Estrategias de estrés (¿Qué haces ante el estrés?)',
    mentalHealthSayingNo: 'Decir no (¿Puedes establecer límites?)',
    mentalHealthRelationships: 'Relaciones (Relaciones interpersonales)',
    mentalHealthExpressThoughts: 'Expresar pensamientos (¿Expresas lo que piensas?)',
    mentalHealthEmotionalDependence: 'Dependencia emocional (¿Eres emocionalmente independiente?)',
    mentalHealthPurpose: 'Propósito (¿Tienes claro tu propósito?)',
    mentalHealthFailureReaction: 'Reacción al fracaso (¿Cómo reaccionas ante fracasos?)',
    mentalHealthSelfConnection: 'Conexión personal (¿Estás conectado contigo mismo?)',
    mentalHealthSelfRelationship: 'Relación personal (Relación contigo mismo)',
    mentalHealthLimitingBeliefs: 'Creencias limitantes (¿Identificas creencias limitantes?)',
    mentalHealthIdealBalance: 'Equilibrio ideal (Describe tu equilibrio ideal)',
  };
  const mentalHealth: Record<string, string> = {};
  for (const [key, label] of Object.entries(mentalLabels)) {
    if (medicalData[key]) { mentalHealth[label] = medicalData[key]; }
  }

  loggerWithContext.debug('AI', 'Entrada para IA preparada', {
    personalDataKeys: Object.keys(personalData),
    medicalDataKeys: Object.keys(medicalData),
    processedDocsCount: processedDocs.length,
    totalDocs: allDocuments.length,
    documentHistoryCount: documentHistory.length
  });

  return {
    personalData,
    medicalData,
    healthAssessment,
    mentalHealth,
    documents: allDocuments, // ✅ Documentos procesados
    documentHistory, // ✅ Historial de procesamientos
    previousChecklistStatus,
    previousSessions: client.aiProgress?.sessions || [],
    // Información adicional para el prompt
    meta: {
      totalProcessedDocuments: processedDocs.length,
      hasDocumentHistory: documentHistory.length > 0,
      lastDocumentProcessed: client.medicalData?.lastDocumentProcessed
    }
  };
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

    // 7. Obtener datos del coach asignado
    let coachName = '';
    let coachEmail = '';
    let coachPhone = '';
    let coachPhotoUrl: string | null = null;
    try {
      if (client.coachId) {
        await connectMongoose();
        const coach = await Coach.findById(client.coachId);
        if (coach) {
          coachName = `${decrypt(coach.firstName)} ${decrypt(coach.lastName)}`.trim();
          coachEmail = decrypt(coach.email);
          coachPhone = coach.phone ? decrypt(coach.phone) : '';
          coachPhotoUrl = coach.profilePhoto?.url ? decrypt(coach.profilePhoto.url) : null;
        }
      }
    } catch (coachErr) {
      loggerWithContext.warn('AI', 'No se pudieron obtener datos del coach', coachErr as Error);
    }

    // 8. Enviar email con el plan mensual usando EmailService
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

      // Construir URL de descarga del PDF
      // En Vercel producción usa VERCEL_URL automático; en dev usa API_URL o APP_URL
      const apiBaseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (process.env.NEXT_PUBLIC_API_URL || process.env.APP_URL || 'http://localhost:3001');
      const pdfDownloadUrl = `${apiBaseUrl}/api/clients/${clientId}/ai/${sessionId}/pdf`;

      emailSent = await emailService.sendMonthlyPlanEmail(
        clientEmail,
        clientName,
        decryptedSession,
        session.monthNumber,
        { clientId, sessionId, requestId },
        { coachName, coachEmail, coachPhone, coachPhotoUrl },
        pdfDownloadUrl
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

    // 5. Generar NUEVAS recomendaciones con generateCompositeRecommendation (NUEVA FORMA)
    loggerWithContext.info('AI_REGEN', '🤖 Llamando a generateCompositeRecommendation', {
      monthNumber: existingSession.monthNumber,
      hasPreviousSessions: aiInput.previousSessions?.length || 0
    });

    const {
      mentalHealth,
      healthAssessment,
      documents: processedDocuments,
    } = aiInput;

    const compositeResult = await generateCompositeRecommendation({
      personalData: aiInput.personalData || {},
      medicalData: aiInput.medicalData || {},
      healthAssessment: healthAssessment || {},
      mentalHealth: mentalHealth || {},
      processedDocuments: (processedDocuments || []).map((d: any) => ({
        title: d.title || '',
        content: d.content || '',
        documentType: d.documentType || 'other',
        confidence: d.confidence || 0,
      })),
      previousSessions: aiInput.previousSessions || [],
      coachNotes: aiInput.coachNotes || '',
      monthNumber: existingSession.monthNumber,
    });

    loggerWithContext.info('AI_REGEN', '✅ Nuevas recomendaciones generadas con generateCompositeRecommendation', {
      weekCount: compositeResult.nutritionPlan?.weeklyPlan?.length || 7,
    });

    // IDs de recetas y ejercicios encontrados en la DB
    const recipeIds: Record<string, string> = compositeResult._recipeIds || {};
    const exerciseIds: Record<string, string> = compositeResult._exerciseIds || {};

    // 6. Construir nueva sesión (mismo formato que POST handler)
    const newSessionId = `regen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dayTranslations: Record<string, string> = {
      Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
      Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo'
    };

    const newChecklistItems: ChecklistItem[] = [];

    // Items de nutrición (desayuno/almuerzo/cena para cada día)
    if (compositeResult.nutritionPlan?.weeklyPlan) {
      for (const day of compositeResult.nutritionPlan.weeklyPlan) {
        const dayName = dayTranslations[day.day] || day.day;
        for (const meal of ['breakfast', 'lunch', 'dinner'] as const) {
          const mealName = meal === 'breakfast' ? 'Desayuno' : meal === 'lunch' ? 'Almuerzo' : 'Cena';
          const recipe = day[meal];
          if (recipe) {
            const recipeId = recipeIds[recipe] || '';
            newChecklistItems.push({
              id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              description: `${dayName} ${mealName}: ${recipe}`,
              completed: false,
              weekNumber: 1,
              category: 'nutrition',
              type: mealName.toLowerCase(),
              recipeId,
              details: recipeId ? undefined : { recipe: { ingredients: [], preparation: recipe } },
              isRecurring: false,
            } as ChecklistItem);
          }
        }
      }
    }

    // Items de ejercicios
    if (compositeResult.exercisePlan?.weeklyRoutine) {
      for (const day of compositeResult.exercisePlan.weeklyRoutine) {
        const dayName = dayTranslations[day.day] || day.day;
        if (day.exercises) {
          for (const ex of day.exercises) {
            const exerciseId = exerciseIds[ex.name] || '';
            newChecklistItems.push({
              id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              description: `${dayName}: ${ex.name}`,
              completed: false,
              weekNumber: 1,
              category: 'exercise',
              type: 'ejercicio',
              recipeId: exerciseId,
              details: {
                duration: `${ex.sets || 3} series x ${ex.repetitions || '12'} reps`,
                equipment: compositeResult.exercisePlan?.equipment,
                frequency: day.day,
              },
              isRecurring: false,
            } as ChecklistItem);
          }
        }
      }
    }

    // Items de hábitos (adoptar)
    if (compositeResult.habitPlan?.toAdopt) {
      for (const h of compositeResult.habitPlan.toAdopt) {
        newChecklistItems.push({
          id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          description: h.habit || 'Nuevo hábito',
          completed: false,
          weekNumber: 1,
          category: 'habit',
          type: 'toAdopt',
          isRecurring: true,
          details: { trigger: h.trigger || undefined },
        } as ChecklistItem);
      }
    }

    // Items de hábitos (eliminar)
    if (compositeResult.habitPlan?.toEliminate) {
      for (const h of compositeResult.habitPlan.toEliminate) {
        newChecklistItems.push({
          id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          description: h.habit ? (h.replacement ? `${h.habit} → ${h.replacement}` : h.habit) : 'Eliminar hábito',
          completed: false,
          weekNumber: 1,
          category: 'habit',
          type: 'toEliminate',
          isRecurring: true,
        } as ChecklistItem);
      }
    }

    // Items de alternativas
    if (compositeResult.alternatives) {
      for (const alt of compositeResult.alternatives) {
        newChecklistItems.push({
          id: `check_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          description: `🔄 Alternativa - ${alt.meal}: ${alt.recipe}`,
          completed: false,
          weekNumber: 1,
          category: 'nutrition',
          type: 'alternativa',
          notes: alt.description || '',
          isRecurring: false,
        } as ChecklistItem);
      }
    }

    // Construir weeks[] con datos encriptados
    const shopList = compositeResult.nutritionPlan?.shoppingList || [];
    const newWeeks = [{
      weekNumber: 1 as const,
      nutrition: {
        focus: encrypt(`Plan de comidas: ${compositeResult.nutritionPlan?.weeklyPlan?.length || 7} días, 3 comidas al día`),
        shoppingList: shopList.filter((item: any) => item?.item && item?.quantity).map((item: any) => ({
          item: encrypt(item.item!),
          quantity: encrypt(item.quantity!),
          priority: item.priority || 'medium',
        })),
      },
      exercise: {
        focus: encrypt(compositeResult.exercisePlan?.notes || 'Rutina de ejercicios'),
        equipment: (compositeResult.exercisePlan?.equipment || []).map((eq: string) => encrypt(eq || '')),
      },
      habits: {
        trackingMethod: compositeResult.habitPlan?.trackingMethod ? encrypt(compositeResult.habitPlan.trackingMethod) : undefined,
        motivationTip: compositeResult.habitPlan?.motivationTip ? encrypt(compositeResult.habitPlan.motivationTip) : undefined,
      },
    }];

    // Construir objeto de sesión completo (mismo formato que POST handler)
    const newSession: AIRecommendationSession = {
      sessionId: newSessionId,
      monthNumber: existingSession.monthNumber,
      totalWeeks: 12,
      createdAt: existingSession.createdAt,
      updatedAt: new Date(),
      status: 'draft',
      summary: encrypt(compositeResult.clientInsights?.summary || ''),
      vision: encrypt(compositeResult.clientInsights?.vision || compositeResult.clientInsights?.summary || ''),
      baselineMetrics: {
        currentLifestyle: compositeResult.clientInsights?.keyRisks || [],
        targetLifestyle: compositeResult.clientInsights?.targetImprovements || [],
      },
      weeks: newWeeks,
      checklist: newChecklistItems,
      coachNotes: (coachNotes && coachNotes.trim().length > 0) ? coachNotes : (existingSession.coachNotes || undefined),
      lastCoachNotes: (coachNotes && coachNotes.trim().length > 0) ? coachNotes : undefined,
      regenerationCount: (existingSession.regenerationCount || 0) + 1,
      regenerationHistory: [
        ...(existingSession.regenerationHistory || []),
        {
          timestamp: new Date(),
          previousSessionId: existingSession.sessionId,
          coachNotes: coachNotes || null,
          triggeredBy: 'coach',
        }
      ],
      regeneratedAt: new Date(),
    };

    loggerWithContext.info('AI_REGEN', '✅ Nueva sesión construida y guardando en BD', {
      newSessionId,
      monthNumber: existingSession.monthNumber,
      weekCount: newWeeks.length,
      checklistItemCount: newChecklistItems.length,
    });

    // 7. Actualizar la sesión en la base de datos (REEMPLAZAR)
    const updateData: Record<string, Record<string, unknown> | Date> = {
      $set: {
        'aiProgress.sessions.$': newSession,
        'aiProgress.currentSessionId': newSessionId,
        'aiProgress.lastEvaluation': new Date(),
        updatedAt: new Date(),
      }
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
      newSessionId: newSessionId
    });

    if (result.modifiedCount > 0) {
      loggerWithContext.info('AI_REGEN', '🎉 Regeneración completada exitosamente', {
        oldSessionId: sessionId,
        newSessionId: newSessionId,
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

async function importSession(
  clientId: string,
  sessionData: any,
  monthNumber: number = 1,
  requestId: string
): Promise<boolean> {
  const loggerWithContext = logger.withContext({ requestId, clientId });

  loggerWithContext.info('AI', '📥 Iniciando importación de sesión', {
    monthNumber,
    sessionDataKeys: sessionData ? Object.keys(sessionData) : [],
    hasSummary: !!sessionData?.summary,
    hasVision: !!sessionData?.vision,
    weeksCount: sessionData?.weeks?.length || 0,
    checklistCount: sessionData?.checklist?.length || 0
  });

  try {
    const healthForms = await getHealthFormsCollection();
    const client = await healthForms.findOne({ _id: new ObjectId(clientId) });

    if (!client) {
      loggerWithContext.warn('AI', 'Cliente no encontrado');
      return false;
    }

    loggerWithContext.debug('AI', 'Cliente encontrado para importación', {
      hasPersonalData: !!client.personalData,
      hasMedicalData: !!client.medicalData,
      existingSessions: client.aiProgress?.sessions?.length || 0
    });

    // Validar datos mínimos de la sesión
    if (!sessionData.summary || !sessionData.vision) {
      loggerWithContext.error('AI', 'Datos de sesión incompletos', undefined, {
        hasSummary: !!sessionData.summary,
        hasVision: !!sessionData.vision
      });
      throw new Error('La sesión debe incluir summary y vision');
    }

    // Generar nuevo sessionId
    const sessionId = crypto.randomUUID();

    // Preparar semanas (asegurar estructura correcta)
    const weeks = sessionData.weeks || [];
    const validatedWeeks = weeks.map((week: any, index: number) => ({
      weekNumber: week.weekNumber || (index + 1),
      nutrition: {
        focus: week.nutrition?.focus || 'Nutrición personalizada',
        shoppingList: week.nutrition?.shoppingList || []
      },
      exercise: {
        focus: week.exercise?.focus || 'Ejercicio adaptado',
        equipment: week.exercise?.equipment || []
      },
      habits: {
        trackingMethod: week.habits?.trackingMethod,
        motivationTip: week.habits?.motivationTip
      }
    }));

    // Preparar checklist (encriptar descripciones)
    const checklist = sessionData.checklist || [];
    const encryptedChecklist = checklist.map((item: any) => ({
      ...item,
      description: encrypt(item.description || ''),
      details: item.details ? {
        ...item.details,
        recipe: item.details.recipe ? {
          ...item.details.recipe,
          ingredients: item.details.recipe.ingredients?.map((ing: any) => ({
            name: encrypt(ing.name || ''),
            quantity: encrypt(ing.quantity || ''),
            notes: ing.notes ? encrypt(ing.notes) : undefined
          })) || [],
          preparation: encrypt(item.details.recipe.preparation || ''),
          tips: item.details.recipe.tips ? encrypt(item.details.recipe.tips) : undefined
        } : undefined,
        frequency: item.details.frequency ? encrypt(item.details.frequency) : undefined,
        duration: item.details.duration ? encrypt(item.details.duration) : undefined,
        equipment: item.details.equipment?.map((eq: string) => encrypt(eq))
      } : undefined
    }));

    // Crear objeto de sesión completo (encriptar campos sensibles)
    const newSession = {
      sessionId,
      monthNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft', // Por defecto en estado borrador
      summary: encrypt(sessionData.summary),
      vision: encrypt(sessionData.vision),
      baselineMetrics: sessionData.baselineMetrics || { currentLifestyle: [], targetLifestyle: [] },
      weeks: validatedWeeks.map((week: any) => ({
        weekNumber: week.weekNumber,
        nutrition: {
          focus: encrypt(week.nutrition.focus),
          shoppingList: week.nutrition.shoppingList.map((item: any) => ({
            item: encrypt(item.item || ''),
            quantity: encrypt(item.quantity || ''),
            priority: item.priority || 'medium'
          }))
        },
        exercise: {
          focus: encrypt(week.exercise.focus),
          equipment: week.exercise.equipment.map((eq: string) => encrypt(eq))
        },
        habits: {
          trackingMethod: week.habits.trackingMethod ? encrypt(week.habits.trackingMethod) : undefined,
          motivationTip: week.habits.motivationTip ? encrypt(week.habits.motivationTip) : undefined
        }
      })),
      checklist: encryptedChecklist,
      coachNotes: sessionData.coachNotes ? encrypt(sessionData.coachNotes) : undefined,
      emailSent: false
    };

    loggerWithContext.debug('AI', 'Sesión preparada para guardar', {
      sessionId,
      weekCount: newSession.weeks.length,
      checklistCount: newSession.checklist.length
    });

    // Preparar datos de actualización
    const updateData: any = {
      $set: {
        updatedAt: new Date()
      }
    };

    // Verificar si ya existe una sesión para este mes
    const existingSessionIndex = client.aiProgress?.sessions?.findIndex(
      (s: any) => s.monthNumber === monthNumber
    );

    loggerWithContext.debug('AI', 'Buscando sesión existente para el mes', {
      monthNumber,
      hasAIProgress: !!client.aiProgress,
      sessionsCount: client.aiProgress?.sessions?.length || 0,
      existingSessionIndex
    });

    if (!client.aiProgress || existingSessionIndex === -1) {
      // Primera vez para este mes: crear estructura
      updateData.$set['aiProgress'] = {
        clientId,
        currentSessionId: sessionId,
        sessions: [newSession],
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
      // Reemplazar la sesión existente para este mes
      const updatedSessions = [...client.aiProgress.sessions];
      updatedSessions[existingSessionIndex] = newSession;

      updateData.$set['aiProgress.sessions'] = updatedSessions;
      updateData.$set['aiProgress.currentSessionId'] = sessionId;
      updateData.$set['aiProgress.lastEvaluation'] = new Date();
      updateData.$set['aiProgress.nextEvaluation'] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      loggerWithContext.info('AI', 'Reemplazando sesión existente', {
        monthNumber,
        oldSessionId: client.aiProgress.sessions[existingSessionIndex].sessionId,
        newSessionId: sessionId
      });
    }

    const result = await healthForms.updateOne(
      { _id: new ObjectId(clientId) },
      updateData
    );

    loggerWithContext.debug('AI', 'Resultado de actualización en BD', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    });

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      loggerWithContext.error('AI', 'No se pudo guardar la sesión importada en BD');
      throw new Error('No se pudo guardar la sesión importada en la base de datos');
    }

    loggerWithContext.info('AI', '✅ Sesión importada exitosamente', {
      sessionId,
      monthNumber
    });

    return true;

  } catch (error: any) {
    loggerWithContext.error('AI', '💥 Error importando sesión', error);

    // Propagar error específico
    if (error.message.includes('La sesión debe incluir')) {
      throw error;
    }

    return false;
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
