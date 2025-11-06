import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getHealthFormsCollection } from '@/app/lib/database';
import { decrypt, encrypt, safeDecrypt, encryptObject } from '@/app/lib/encryption';
import { requireAuth } from '@/app/lib/auth';

// GET: Obtener un cliente específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const healthForms = await getHealthFormsCollection();
    const client = await healthForms.findOne({ _id: new ObjectId(params.id) });

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
          decrypted[key] = safeDecrypt(value);
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
      const fieldData = (decryptedClient.medicalData as any)[field];
      if (fieldData && typeof fieldData === 'string') {
        try {
          (decryptedClient.medicalData as any)[field] = JSON.parse(fieldData);
        } catch (error) {
          console.warn(`⚠️ Error parseando ${field}:`, error);
          (decryptedClient.medicalData as any)[field] = [];
        }
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
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const data = await request.json();
    const healthForms = await getHealthFormsCollection();

    // Validar datos
    if (!data.personalData || !data.medicalData) {
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
    const expectedLengths: Record<string, number> = {
      carbohydrateAddiction: 11,
      leptinResistance: 8,
      circadianRhythms: 11,
      sleepHygiene: 11,
      electrosmogExposure: 10,
      generalToxicity: 8,
      microbiotaHealth: 10,
    };

    const arrayFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    arrayFields.forEach(field => {
      const arrayData = (processedMedicalData as any)[field];
      const expectedLength = expectedLengths[field];
      
      if (!arrayData || !Array.isArray(arrayData)) {
        (processedMedicalData as any)[field] = JSON.stringify([]);
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

      (processedMedicalData as any)[field] = JSON.stringify(cleanedArray);
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

    const result = await healthForms.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente actualizado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando cliente:', error);
    
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

// DELETE: Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const healthForms = await getHealthFormsCollection();
    const result = await healthForms.deleteOne({ _id: new ObjectId(params.id) });

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