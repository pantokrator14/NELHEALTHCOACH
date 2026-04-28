import { NextRequest, NextResponse } from 'next/server';
import { getHealthFormsCollection, getRecipesCollection } from '../../lib/database';
import { requireCoachAuth } from '../../lib/auth';
import { logger } from '@/app/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y obtener datos del coach
    const auth = requireCoachAuth(request);

    const healthForms = await getHealthFormsCollection();
    const recipes = await getRecipesCollection();

    // Filtrar clientes por coachId si no es admin
    const clientFilter: Record<string, unknown> = {};
    if (auth.role === 'coach') {
      clientFilter.coachId = auth.coachId;
    }

    const clientCount = await healthForms.countDocuments(clientFilter);
    const recipeCount = await recipes.countDocuments();
    const nearGoalPercentage = Math.min(Math.floor((clientCount / 300) * 100), 100);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentClients = await healthForms.countDocuments({
      ...clientFilter,
      submissionDate: { $gte: last30Days },
    });

    return NextResponse.json({
      success: true,
      data: {
        clientCount,
        recipeCount,
        nearGoalPercentage,
        recentClients,
        goal: 300,
      },
    });
  } catch (error: any) {
    console.error('❌ Error fetching stats:', error);
    logger.error('API', 'Error obteniendo estadísticas', error);

    if (error.message?.includes('Token')) {
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
