// apps/api/src/app/api/test-ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/app/lib/ai-service';

export async function GET(req: NextRequest) {
  try {
    // Probar conexión con DeepSeek
    const isConnected = await AIService.testDeepSeekConnection();
    
    // Intentar un prompt simple
    const prompt = 'Responde con este JSON exacto: {"test": "ok", "message": "Conexión exitosa"}';
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        response_format: { type: 'json_object' }
      }),
    });
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      parsed = { error: 'No es JSON', content };
    }
    
    return NextResponse.json({
      apiKeyPresent: !!process.env.DEEPSEEK_API_KEY,
      apiKeyFirst10: process.env.DEEPSEEK_API_KEY?.substring(0, 10) + '...',
      connectionTest: isConnected,
      simpleRequest: {
        status: response.status,
        content: content?.substring(0, 200),
        parsed
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      apiKeyPresent: !!process.env.DEEPSEEK_API_KEY,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}