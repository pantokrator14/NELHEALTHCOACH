import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { decrypt, encrypt, safeDecrypt, encryptObject } from '@/app/lib/encryption';
import { requireAuth } from '@/app/lib/auth';

// GET: Obtener un cliente específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← Cambiar a Promise
) {
  try {
    const { id } = await params; // ← Agregar await aquí
    
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const healthForms = await getHealthFormsCollection();
    const client = await healthForms.findOne({ _id: new ObjectId(id) }); // ← Usar id en lugar de params.id

    if (!client) {
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Función para desencriptar objetos
    const decryptObject = (obj: Record<string, any>): Record<string, any> => {
      const decrypted: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.trim() !== '') {
          try {
            // Intentar desencriptar, si falla devolver el valor original
            const decryptedValue = decrypt(value);
            decrypted[key] = decryptedValue;
          } catch (error) {
            console.warn(`⚠️ No se pudo desencriptar ${key}:`, error);
            decrypted[key] = value; // Mantener valor original
          }
        } else {
          decrypted[key] = value;
        }
      }
      return decrypted;
    };

    // Desencriptar datos del cliente
    const decryptedClient = {
      _id: client._id.toString(),
      personalData: decryptObject(client.personalData),
      medicalData: decryptObject(client.medicalData),
      contractAccepted: safeDecrypt(client.contractAccepted) === 'true',
      ipAddress: safeDecrypt(client.ipAddress),
      submissionDate: client.submissionDate
    };

    // Procesar arrays en medicalData
    const arrayFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    arrayFields.forEach(field => {
      const encryptedFieldData = (decryptedClient.medicalData as any)[field];
      
      if (!encryptedFieldData) {
        (decryptedClient.medicalData as any)[field] = [];
        return;
      }

      if (typeof encryptedFieldData === 'string') {
        try {
          console.log(`🔓 Desencriptando campo médico: ${field}`);
          
          // PRIMERO: Desencriptar el campo
          const decryptedString = decrypt(encryptedFieldData);
          console.log(`📄 ${field} desencriptado:`, decryptedString);
          
          // LUEGO: Intentar parsear como JSON
          const parsed = JSON.parse(decryptedString);
          (decryptedClient.medicalData as any)[field] = Array.isArray(parsed) ? parsed : [];
          
          console.log(`✅ ${field} parseado como array:`, (decryptedClient.medicalData as any)[field]);
          
        } catch (error) {
          console.error(`❌ Error desencriptando/parseando ${field}:`, error);
          
          // Intentar recuperación avanzada para campos corruptos
          if (field === 'generalToxicity') {
            console.log(`🔄 Intentando recuperación especial para ${field}`);
            try {
              // Para generalToxicity, usar valores por defecto basados en la longitud esperada
              const expectedLength = 8; // Basado en tu estructura
              (decryptedClient.medicalData as any)[field] = Array(expectedLength).fill(false);
              console.log(`✅ ${field} recuperado con array por defecto`);
            } catch (recoveryError) {
              console.error(`❌ Recuperación falló para ${field}:`, recoveryError);
              (decryptedClient.medicalData as any)[field] = [];
            }
          } else {
            (decryptedClient.medicalData as any)[field] = [];
          }
        }
      } else if (Array.isArray(encryptedFieldData)) {
        // Ya es un array (no debería pasar pero por si acaso)
        (decryptedClient.medicalData as any)[field] = encryptedFieldData;
      } else {
        (decryptedClient.medicalData as any)[field] = [];
      }
    });

    return NextResponse.json({
      success: true,
      data: decryptedClient
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo cliente:', error);
    
    if (error.message.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }

    if (error.message.includes('ObjectId')) {
      return NextResponse.json(
        { success: false, message: 'ID de cliente inválido' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar cliente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('🔄 PUT /api/clients/[id] - Iniciando actualización para:', id);
    // === AGREGAR ESTAS DEFINICIONES AL INICIO DE LA FUNCIÓN PUT ===
    const arrayFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    const expectedLengths: Record<string, number> = {
      carbohydrateAddiction: 11,
      leptinResistance: 8,
      circadianRhythms: 11,
      sleepHygiene: 11,
      electrosmogExposure: 10,
      generalToxicity: 8,
      microbiotaHealth: 10,
    };
    // === FIN DE LAS DEFINICIONES ===

    console.log('✅ Definiciones cargadas - arrayFields:', arrayFields);

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const data = await request.json();

    console.log('📦 Datos recibidos para actualización:', {
      personalDataKeys: Object.keys(data.personalData || {}),
      medicalDataKeys: Object.keys(data.medicalData || {}),
      evaluationFields: arrayFields.map(field => ({
        field,
        value: data.medicalData?.[field],
        type: typeof data.medicalData?.[field],
        isArray: Array.isArray(data.medicalData?.[field])
      }))
    });

    const healthForms = await getHealthFormsCollection();

    // Validar datos
    if (!data.personalData || !data.medicalData) {
      console.error('❌ Datos incompletos');
      return NextResponse.json(
        { success: false, message: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Función para encriptar objetos
    const encryptObject = (obj: Record<string, any>): Record<string, any> => {
      const encrypted: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.trim() !== '') {
          encrypted[key] = encrypt(value);
        } else {
          encrypted[key] = value;
        }
      }
      return encrypted;
    };

    // Procesar arrays en medicalData (igual que en POST)
    const processedMedicalData = { ...data.medicalData };
    
    arrayFields.forEach(field => {
      const arrayData = (processedMedicalData as any)[field];
      const expectedLength = expectedLengths[field];
      
      if (!arrayData || !Array.isArray(arrayData)) {
        (processedMedicalData as any)[field] = encrypt(JSON.stringify([]));
        return;
      }

      const cleanedArray = arrayData.map((value: any) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return Boolean(value);
      });

      // Asegurar longitud
      if (cleanedArray.length < expectedLength) {
        while (cleanedArray.length < expectedLength) {
          cleanedArray.push(false);
        }
      } else if (cleanedArray.length > expectedLength) {
        cleanedArray.length = expectedLength;
      }

      // ENCRIPTAR el array como string JSON
      (processedMedicalData as any)[field] = encrypt(JSON.stringify(cleanedArray));
    });

    // Encriptar datos
    const encryptedPersonalData = encryptObject(data.personalData);
    const encryptedMedicalData = encryptObject(processedMedicalData);

    const updateData = {
      personalData: encryptedPersonalData,
      medicalData: encryptedMedicalData,
      contractAccepted: encrypt(data.contractAccepted.toString()),
      updatedAt: new Date()
    };

    console.log('🔐 Datos encriptados listos para guardar');

    const result = await healthForms.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    console.log('📝 Resultado de la actualización:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    console.log('✅ Cliente actualizado exitosamente');
    return NextResponse.json({
      success: true,
      message: 'Cliente actualizado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error completo actualizando cliente:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    if (error.message.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor',
        // Solo en desarrollo mostrar detalles
        ...(process.env.NODE_ENV === 'development' && { 
          error: error.message,
          stack: error.stack 
        })
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ← Cambiar a Promise
) {
  try {
    const { id } = await params; // ← Agregar await aquí
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const healthForms = await getHealthFormsCollection();
    const result = await healthForms.deleteOne({ _id: new ObjectId(id) }); // ← Usar id

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error eliminando cliente:', error);
    
    if (error.message.includes('Token')) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}