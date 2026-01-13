import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '../../../lib/database';
import Recipe from '../../../models/Recipe';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const recipe = await Recipe.findById(params.id);
    
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
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    const recipe = await Recipe.findByIdAndUpdate(
      params.id,
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
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const recipe = await Recipe.findByIdAndDelete(params.id);
    
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