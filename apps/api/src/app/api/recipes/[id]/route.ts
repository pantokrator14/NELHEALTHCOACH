import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '../../../lib/database';
import Recipe from '../../../models/Recipe';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    // Desestructurar params después de await
    const { id } = await params;
    
    const recipe = await Recipe.findById(id);
    
    if (!recipe) {
      return NextResponse.json(
        { success: false, message: 'Recipe not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: recipe,
    });
    
  } catch (error) {
    console.error('❌ Error fetching recipe:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching recipe' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const data = await request.json();
    
    const recipe = await Recipe.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!recipe) {
      return NextResponse.json(
        { success: false, message: 'Recipe not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Recipe updated successfully',
      data: recipe,
    });
    
  } catch (error) {
    console.error('❌ Error updating recipe:', error);
    return NextResponse.json(
      { success: false, message: 'Error updating recipe' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const recipe = await Recipe.findByIdAndDelete(id);
    
    if (!recipe) {
      return NextResponse.json(
        { success: false, message: 'Recipe not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Recipe deleted successfully',
    });
    
  } catch (error) {
    console.error('❌ Error deleting recipe:', error);
    return NextResponse.json(
      { success: false, message: 'Error deleting recipe' },
      { status: 500 }
    );
  }
}