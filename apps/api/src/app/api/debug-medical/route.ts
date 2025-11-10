// apps/api/src/app/api/debug-medical/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getHealthFormsCollection } from '@/app/lib/database';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const healthForms = await getHealthFormsCollection();
    const client = id ? await healthForms.findOne({ _id: new ObjectId(id) }) : await healthForms.findOne({});
    
    if (!client) {
      return NextResponse.json({ error: 'No hay clientes' });
    }

    // Mostrar datos médicos en crudo
    const medicalData = client.medicalData || {};
    const arrayFields = [
      'carbohydrateAddiction', 'leptinResistance', 'circadianRhythms',
      'sleepHygiene', 'electrosmogExposure', 'generalToxicity', 'microbiotaHealth'
    ];

    const medicalDebug: any = {};
    
    arrayFields.forEach(field => {
      const fieldData = medicalData[field];
      medicalDebug[field] = {
        type: typeof fieldData,
        value: fieldData,
        length: typeof fieldData === 'string' ? fieldData.length : 'N/A',
        isArray: Array.isArray(fieldData)
      };
    });

    return NextResponse.json({
      clientId: client._id.toString(),
      medicalData: medicalDebug,
      rawMedicalData: medicalData
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}