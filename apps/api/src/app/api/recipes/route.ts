import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '../../lib/database';
import Recipe from '../../models/Recipe';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    let query: any = { isPublished: true };
    
    if (category) {
      query.category = { $in: [category] };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    
    const recipes = await Recipe.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      data: recipes,
      count: recipes.length,
    });
    
  } catch (error) {
    console.error('❌ Error fetching recipes:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching recipes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    // Validar datos requeridos
    if (!data.title || !data.description) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const recipe = await Recipe.create(data);
    
    return NextResponse.json({
      success: true,
      message: 'Recipe created successfully',
      data: recipe,
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating recipe:', error);
    return NextResponse.json(
      { success: false, message: 'Error creating recipe' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}