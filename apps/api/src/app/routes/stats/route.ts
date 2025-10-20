import { NextRequest, NextResponse } from 'next/server';
import { getHealthFormsCollection } from '../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const healthForms = await getHealthFormsCollection();
    
    const clientCount = await healthForms.countDocuments();
    const recipeCount = 0; // Placeholder hasta implementar recetas
    const nearGoalPercentage = Math.min(Math.floor((clientCount / 300) * 100), 100);

    return NextResponse.json({
      success: true,
      data: {
        clientCount,
        recipeCount,
        nearGoalPercentage
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}