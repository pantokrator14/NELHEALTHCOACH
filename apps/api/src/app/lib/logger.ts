// apps/api/src/app/lib/logger.ts
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

type LogContext = 'DATABASE' | 'AUTH' | 'ENCRYPTION' | 'API' | 'CLIENTS' | 'HEALTH' | 'MIDDLEWARE' | 'UPLOAD' | 'TEXTRACT' | 'AI_SERVICE' | 'AI' | 'API_AI' | 'FRONTEND' | 'EMAIL' | 'REPAIR' | 'AI_REGEN' | 'RECIPES' | 'RECIPE_UPLOAD' | 'NUTRITION_SERVICE' | 'NUTRITION_ANALYSIS' | 'generateShoppingList' | 'getRecipeById' | 'parseShoppingListResponse' | 'generateShoppingListFromItems' | 'OTHER';

// ✅ INTERFAZ ACTUALIZADA: Permite propiedades dinámicas
interface LogMetadata {
  // Propiedades base
  requestId?: string;
  userId?: string;
  clientId?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  
  // Propiedades específicas
  aiInfo?: { model?: string; tokenCount?: number; temperature?: number; sessionId?: string; monthNumber?: number };
  textractInfo?: { documentType?: string; s3Key?: string; confidence?: number; textLength?: number };
  fileInfo?: { fileName?: string; fileSize?: number; fileType?: string; fileCategory?: 'profile' | 'document'; s3Key?: string };
  
  // ✅ ESTA ES LA CLAVE: Permite cualquier propiedad adicional
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: any;
  
  // Ahora hereda de LogMetadata
  requestId?: string;
  userId?: string;
  clientId?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  
  // Errores
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    details?: any;
  };
  
  // Otras propiedades dinámicas
  [key: string]: any;
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, context, message, requestId, clientId, endpoint, method, duration } = entry;
    
    let logString = `[${timestamp}] ${level.padEnd(5)} [${context.padEnd(12)}]`;
    
    if (requestId) logString += ` [${requestId.substring(0, 8)}]`;
    if (clientId) logString += ` [Client:${clientId.substring(0, 8)}]`;
    if (endpoint && method) logString += ` [${method} ${endpoint}]`;
    
    logString += ` ${message}`;
    
    if (duration !== undefined) logString += ` (${duration}ms)`;
    
    return logString;
  }

  private logToConsole(entry: LogEntry): void {
    const formattedLog = this.formatLog(entry);
    const structuredData = this.extractStructuredData(entry);
    
    switch (entry.level) {
      case 'ERROR':
        console.error(formattedLog, structuredData);
        break;
      case 'WARN':
        console.warn(formattedLog, structuredData);
        break;
      case 'DEBUG':
        if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG_LOGS === 'true') {
          console.debug(formattedLog, structuredData);
        }
        break;
      default:
        console.log(formattedLog, structuredData);
    }
  }

  private extractStructuredData(entry: LogEntry): any {
    const { timestamp, level, context, message, requestId, userId, clientId, endpoint, method, duration, ...rest } = entry;
    
    const structured: any = {};
    
    // Extraer propiedades conocidas
    if (rest.data) structured.data = rest.data;
    if (rest.error) structured.error = rest.error;
    if (rest.fileInfo) structured.fileInfo = rest.fileInfo;
    if (rest.aiInfo) structured.aiInfo = rest.aiInfo;
    if (rest.textractInfo) structured.textractInfo = rest.textractInfo;
    
    // Extraer propiedades dinámicas restantes
    const { data, error, fileInfo, aiInfo, textractInfo, ...dynamicProps } = rest;
    if (Object.keys(dynamicProps).length > 0) {
      structured.extra = dynamicProps;
    }
    
    return Object.keys(structured).length > 0 ? structured : undefined;
  }

  // ✅ MÉTODOS ACTUALIZADOS: Usan LogMetadata en lugar de objetos fijos
  info(
    context: LogContext, 
    message: string, 
    data?: any, 
    metadata?: LogMetadata  // ✅ Ahora acepta propiedades dinámicas
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'INFO',
      context,
      message,
      data,
      ...metadata
    });
  }

  warn(
    context: LogContext, 
    message: string, 
    data?: any, 
    metadata?: LogMetadata  // ✅ Ahora acepta propiedades dinámicas
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'WARN',
      context,
      message,
      data,
      ...metadata
    });
  }

  error(
    context: LogContext, 
    message: string, 
    error?: Error | any, 
    data?: any, 
    metadata?: LogMetadata  // ✅ Ahora acepta propiedades dinámicas
  ) {
    const errorObj = error ? {
      name: error.name || 'UnknownError',
      message: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code || error.statusCode,
      details: error.details || error.response?.data
    } : undefined;

    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'ERROR',
      context,
      message,
      data,
      error: errorObj,
      ...metadata
    });
  }

  debug(
    context: LogContext, 
    message: string, 
    data?: any, 
    metadata?: LogMetadata  // ✅ Ahora acepta propiedades dinámicas
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'DEBUG',
      context,
      message,
      data,
      ...metadata
    });
  }

  // Método específico para logs de IA
  ai(
    context: LogContext,
    message: string,
    aiInfo: { model?: string; tokenCount?: number; temperature?: number; sessionId?: string; monthNumber?: number },
    metadata?: LogMetadata  // ✅ Ahora acepta propiedades dinámicas
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'INFO',
      context,
      message,
      aiInfo,
      ...metadata
    });
  }

  // Método específico para logs de Textract
  textract(
    message: string,
    textractInfo: { documentType?: string; s3Key?: string; confidence?: number; textLength?: number },
    metadata?: LogMetadata  // ✅ Ahora acepta propiedades dinámicas
  ) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'INFO',
      context: 'TEXTRACT',
      message,
      textractInfo,
      ...metadata
    });
  }

  // Método para medir duración con requestId automático
  async time<T>(
    context: LogContext, 
    operation: string, 
    fn: () => Promise<T>, 
    metadata?: LogMetadata  // ✅ Ahora acepta propiedades dinámicas
  ): Promise<T> {
    const requestId = metadata?.requestId || this.generateRequestId();
    const start = Date.now();
    
    this.info(context, `🚀 Iniciando: ${operation}`, undefined, {
      ...metadata,
      requestId
    });

    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      this.info(context, `✅ Completado: ${operation}`, undefined, {
        ...metadata,
        requestId,
        duration
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      this.error(context, `❌ Falló: ${operation}`, error, undefined, {
        ...metadata,
        requestId,
        duration
      });
      
      throw error;
    }
  }

  // Método para crear un logger con contexto específico
  withContext(metadata: LogMetadata) {
    return {
      info: (context: LogContext, message: string, data?: any) => 
        this.info(context, message, data, metadata),
      warn: (context: LogContext, message: string, data?: any) => 
        this.warn(context, message, data, metadata),
      error: (context: LogContext, message: string, error?: Error, data?: any) => 
        this.error(context, message, error, data, metadata),
      debug: (context: LogContext, message: string, data?: any) => 
        this.debug(context, message, data, metadata),
      ai: (context: LogContext, message: string, aiInfo: any) => 
        this.ai(context, message, aiInfo, metadata),
      textract: (message: string, textractInfo: any) => 
        this.textract(message, textractInfo, metadata),
      time: <T>(context: LogContext, operation: string, fn: () => Promise<T>) => 
        this.time(context, operation, fn, metadata)
    };
  }
}

export const logger = new Logger();