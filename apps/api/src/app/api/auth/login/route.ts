import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '../../../lib/auth';

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
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': 'https://app.nelhealthcoach.com',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
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
      
      // ✅ AGREGAR HEADERS CORS AQUÍ TAMBIÉN
      return NextResponse.json({ 
        success: true,
        message: 'Login exitoso',
        token 
      }, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://app.nelhealthcoach.com',
          'Access-Control-Allow-Credentials': 'true',
          'Content-Type': 'application/json',
        }
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Credenciales inválidas' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': 'https://app.nelhealthcoach.com',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
  } catch (error) {
    console.error('❌ Error en login:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://app.nelhealthcoach.com',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://app.nelhealthcoach.com',
  ];
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) 
        ? origin 
        : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}