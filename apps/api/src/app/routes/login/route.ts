import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '../../lib/auth';

const VALID_CREDENTIALS = {
  email: process.env.COACH_EMAIL,
  password: process.env.COACH_PASSWORD
};

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validación básica
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Debug en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Login attempt:', { 
        email, 
        expectedEmail: VALID_CREDENTIALS.email,
        passwordLength: password?.length 
      });
    }

    if (email === VALID_CREDENTIALS.email && password === VALID_CREDENTIALS.password) {
      const token = generateToken({ email });
      
      return NextResponse.json({ 
        success: true,
        message: 'Login exitoso',
        token 
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('❌ Error en login:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}