import { NextRequest, NextResponse } from 'next/server';
import { getHealthFormsCollection } from '../../lib/database';
import { requireAuth } from '../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    requireAuth(token);

    const healthForms = await getHealthFormsCollection();
    
    const clientCount = await healthForms.countDocuments();
    const recipeCount = 0; // Placeholder hasta implementar recetas
    const nearGoalPercentage = Math.min(Math.floor((clientCount / 300) * 100), 100);

    // Estadísticas adicionales útiles
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentClients = await healthForms.countDocuments({
      submissionDate: { $gte: last30Days }
    });

    return NextResponse.json({
      success: true,
      data: {
        clientCount,
        recipeCount,
        nearGoalPercentage,
        recentClients,
        goal: 300
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching stats:', error);
    
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