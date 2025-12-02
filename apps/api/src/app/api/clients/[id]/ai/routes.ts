// apps/api/src/app/api/clients/[id]/ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { requireAuth } from '@/app/lib/auth';
import { logger } from '@/app/lib/logger';
import { encrypt, safeDecrypt } from '@/app/lib/encryption';
import { AIService } from '@/app/lib/ai-service';
import { TextractService } from '@/app/lib/textract';

// GET: Obtener recomendaciones de IA existentes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('AI', 'Obtener recomendaciones IA', async () => {
    try {
      const { id } = await params;
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client) {
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      // Devolver progreso de IA si existe
      const aiProgress = client.aiProgress;
      
      if (!aiProgress) {
        return NextResponse.json({
          success: true,
          data: {
            hasAIProgress: false,
            message: 'No hay recomendaciones de IA generadas aún'
          }
        });
      }

      // Desencriptar sesiones si es necesario
      const decryptedSessions = aiProgress.sessions?.map(session => ({
        ...session,
        // Desencriptar campos específicos si están encriptados
        summary: safeDecrypt(session.summary),
        vision: safeDecrypt(session.vision)
      })) || [];

      return NextResponse.json({
        success: true,
        data: {
          hasAIProgress: true,
          aiProgress: {
            ...aiProgress,
            sessions: decryptedSessions
          }
        }
      });

    } catch (error: any) {
      logger.error('AI', 'Error obtenendo recomendaciones IA', error, {
        clientId: (await params).id
      });
      
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { clientId: (await params).id });
}

// POST: Generar nuevas recomendaciones de IA
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('AI', 'Generar recomendaciones IA', async () => {
    try {
      const { id } = await params;
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      const { monthNumber = 1, reprocessDocuments = false, coachNotes = '' } = await request.json();
      
      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client) {
        return NextResponse.json(
          { success: false, message: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      logger.info('AI', 'Generando recomendaciones de IA', {
        clientId: id,
        monthNumber,
        reprocessDocuments
      });

      // 1. Si se solicita, reprocesar documentos con Textract
      if (reprocessDocuments && client.medicalData?.documents) {
        await reprocessClientDocuments(id, client.medicalData.documents);
      }

      // 2. Preparar datos para la IA
      const aiInput = await prepareAIInput(client);
      
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
      const recommendations = await AIService.analyzeClientAndGenerateRecommendations(
        aiInput, 
        monthNumber
      );

      // 6. Actualizar el cliente con las nuevas recomendaciones
      const updateData: any = {
        $set: {
          updatedAt: new Date()
        }
      };

      if (!client.aiProgress) {
        // Primera vez: crear estructura de progreso
        updateData.$set['aiProgress'] = {
          clientId: id,
          currentSessionId: recommendations.sessionId,
          sessions: [recommendations],
          overallProgress: 0,
          lastEvaluation: new Date(),
          nextEvaluation: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
          metrics: {
            nutritionAdherence: 0,
            exerciseConsistency: 0,
            habitFormation: 0
          }
        };
      } else {
        // Agregar nueva sesión
        updateData.$push = {
          'aiProgress.sessions': recommendations
        };
        updateData.$set['aiProgress.currentSessionId'] = recommendations.sessionId;
        updateData.$set['aiProgress.lastEvaluation'] = new Date();
        updateData.$set['aiProgress.nextEvaluation'] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const result = await healthForms.updateOne(
        { _id: new ObjectId(id) },
        updateData
      );

      if (result.modifiedCount === 0) {
        throw new Error('No se pudo guardar las recomendaciones');
      }

      logger.info('AI', 'Recomendaciones de IA generadas y guardadas', {
        clientId: id,
        sessionId: recommendations.sessionId,
        monthNumber
      });

      return NextResponse.json({
        success: true,
        data: {
          sessionId: recommendations.sessionId,
          monthNumber,
          summary: recommendations.summary,
          vision: recommendations.vision,
          weekCount: recommendations.weeks.length
        }
      });

    } catch (error: any) {
      logger.error('AI', 'Error generando recomendaciones IA', error, {
        clientId: (await params).id,
        errorMessage: error.message
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Error generando recomendaciones',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  }, { clientId: (await params).id });
}

// PUT: Actualizar checklist o aprobar recomendaciones
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return logger.time('AI', 'Actualizar recomendaciones IA', async () => {
    try {
      const { id } = await params;
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      requireAuth(token);

      const { action, sessionId, data } = await request.json();
      
      const healthForms = await getHealthFormsCollection();
      const client = await healthForms.findOne({ _id: new ObjectId(id) });

      if (!client || !client.aiProgress) {
        return NextResponse.json(
          { success: false, message: 'Cliente o progreso de IA no encontrado' },
          { status: 404 }
        );
      }

      let updateResult;
      let message = '';

      switch (action) {
        case 'update_checklist':
          // Actualizar items del checklist
          updateResult = await updateChecklist(id, sessionId, data.checklistItems);
          message = 'Checklist actualizado';
          break;

        case 'approve_session':
          // Marcar sesión como aprobada
          updateResult = await approveSession(id, sessionId);
          message = 'Sesión aprobada';
          break;

        case 'send_to_client':
          // Marcar como enviada al cliente
          updateResult = await sendToClient(id, sessionId);
          message = 'Recomendaciones enviadas al cliente';
          break;

        case 'regenerate_session':
          // Regenerar una sesión específica
          updateResult = await regenerateSession(id, sessionId, data.coachNotes);
          message = 'Sesión regenerada';
          break;

        default:
          return NextResponse.json(
            { success: false, message: 'Acción no válida' },
            { status: 400 }
          );
      }

      if (!updateResult) {
        return NextResponse.json(
          { success: false, message: 'No se pudo realizar la actualización' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message
      });

    } catch (error: any) {
      logger.error('AI', 'Error actualizando recomendaciones IA', error, {
        clientId: (await params).id,
        action: (await request.json()).action
      });
      
      return NextResponse.json(
        { success: false, message: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, { clientId: (await params).id });
}

// Funciones auxiliares
async function prepareAIInput(client: any): Promise<any> {
  // Desencriptar datos personales
  const personalData = Object.entries(client.personalData || {}).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = safeDecrypt(value as string);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  // Desencriptar datos médicos
  const medicalData = Object.entries(client.medicalData || {}).reduce((acc, [key, value]) => {
    if (typeof value === 'string' && key !== 'documents') {
      acc[key] = safeDecrypt(value as string);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  // Preparar documentos con análisis de Textract
  const documents = [];
  if (client.medicalData?.documents && Array.isArray(client.medicalData.documents)) {
    for (const doc of client.medicalData.documents) {
      try {
        const decryptedDoc = typeof doc === 'string' ? JSON.parse(safeDecrypt(doc)) : doc;
        
        documents.push({
          name: safeDecrypt(decryptedDoc.name || ''),
          textractAnalysis: decryptedDoc.textractAnalysis
        });
      } catch (error) {
        logger.debug('AI', 'Error procesando documento para IA', { error: (error as Error).message });
      }
    }
  }

  return {
    personalData,
    medicalData,
    documents
  };
}

async function reprocessClientDocuments(clientId: string, documents: any[]) {
  logger.info('TEXTRACT', 'Reprocesando documentos del cliente', { clientId });
  
  const processingPromises = documents.map(async (doc, index) => {
    try {
      const decryptedDoc = typeof doc === 'string' ? JSON.parse(safeDecrypt(doc)) : doc;
      const s3Key = safeDecrypt(decryptedDoc.key);
      
      // Determinar tipo de documento basado en nombre o tipo
      const docType = determineDocumentType(decryptedDoc.name || '');
      
      // Procesar con Textract
      const analysis = await TextractService.processMedicalDocument(s3Key, docType);
      
      // Actualizar documento con análisis
      decryptedDoc.textractAnalysis = {
        extractedText: analysis.extractedText,
        extractedData: analysis.extractedData,
        extractionDate: analysis.extractedAt.toISOString(),
        extractionStatus: analysis.status,
        confidence: analysis.status === 'completed' ? 85 : 0,
        documentType: analysis.documentType
      };
      
      return encrypt(JSON.stringify(decryptedDoc));
    } catch (error) {
      logger.error('TEXTRACT', `Error reprocesando documento ${index}`, error as Error, { clientId });
      return doc; // Devolver original si falla
    }
  });

  const processedDocs = await Promise.all(processingPromises);
  
  // Actualizar en base de datos
  const healthForms = await getHealthFormsCollection();
  await healthForms.updateOne(
    { _id: new ObjectId(clientId) },
    { $set: { 'medicalData.documents': processedDocs } }
  );
  
  logger.info('TEXTRACT', 'Documentos reprocesados', { 
    clientId, 
    processedCount: processedDocs.length 
  });
}

function determineDocumentType(filename: string): 'lab_results' | 'prescription' | 'medical_history' | 'other' {
  const lowerName = filename.toLowerCase();
  
  if (lowerName.includes('lab') || lowerName.includes('resultado') || lowerName.includes('análisis')) {
    return 'lab_results';
  }
  
  if (lowerName.includes('receta') || lowerName.includes('prescripción') || lowerName.includes('medicamento')) {
    return 'prescription';
  }
  
  if (lowerName.includes('historial') || lowerName.includes('médico') || lowerName.includes('clínico')) {
    return 'medical_history';
  }
  
  return 'other';
}

async function updateChecklist(clientId: string, sessionId: string, checklistItems: any[]): Promise<boolean> {
  const healthForms = await getHealthFormsCollection();
  
  // Encontrar la sesión específica y actualizar su checklist
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
  
  if (result.modifiedCount > 0) {
    // Recalcular progreso general
    const completedItems = checklistItems.filter(item => item.completed).length;
    const totalItems = checklistItems.length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    await healthForms.updateOne(
      { _id: new ObjectId(clientId) },
      { $set: { 'aiProgress.overallProgress': progress } }
    );
    
    logger.info('AI', 'Checklist actualizado', { clientId, sessionId, progress });
    return true;
  }
  
  return false;
}

async function approveSession(clientId: string, sessionId: string): Promise<boolean> {
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
  
  logger.info('AI', 'Sesión aprobada', { clientId, sessionId, modified: result.modifiedCount });
  return result.modifiedCount > 0;
}

async function sendToClient(clientId: string, sessionId: string): Promise<boolean> {
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
  
  logger.info('AI', 'Sesión enviada al cliente', { clientId, sessionId });
  return result.modifiedCount > 0;
}

async function regenerateSession(clientId: string, sessionId: string, coachNotes: string): Promise<boolean> {
  // Implementar regeneración basada en sesión anterior y notas del coach
  // Esto requeriría obtener la sesión anterior, los datos del cliente y generar nuevas recomendaciones
  logger.info('AI', 'Regenerando sesión', { clientId, sessionId });
  
  // Por ahora, simplemente marcar como borrador nuevamente
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
  
  return result.modifiedCount > 0;
}