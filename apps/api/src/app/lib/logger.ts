// apps/api/src/app/lib/logger.ts

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
type LogContext = 'DATABASE' | 'AUTH' | 'ENCRYPTION' | 'API' | 'CLIENTS' | 'HEALTH' | 'MIDDLEWARE';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: any;
  userId?: string;
  clientId?: string;
  endpoint?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, context, message, data, userId, clientId, endpoint, duration, error } = entry;
    
    let logString = `[${timestamp}] ${level.padEnd(5)} [${context.padEnd(12)}] ${message}`;
    
    if (userId) logString += ` | User: ${userId}`;
    if (clientId) logString += ` | Client: ${clientId}`;
    if (endpoint) logString += ` | Endpoint: ${endpoint}`;
    if (duration !== undefined) logString += ` | Duration: ${duration}ms`;
    
    return logString;
  }

  private logToConsole(entry: LogEntry): void {
    const formattedLog = this.formatLog(entry);
    
    switch (entry.level) {
      case 'ERROR':
        console.error(formattedLog, entry.data || '', entry.error || '');
        break;
      case 'WARN':
        console.warn(formattedLog, entry.data || '');
        break;
      case 'DEBUG':
        if (process.env.NODE_ENV === 'development') {
          console.debug(formattedLog, entry.data || '');
        }
        break;
      default:
        console.log(formattedLog, entry.data || '');
    }
  }

  // Métodos públicos
  info(context: LogContext, message: string, data?: any, metadata?: { userId?: string; clientId?: string; endpoint?: string; duration?: number }) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'INFO',
      context,
      message,
      data,
      ...metadata
    });
  }

  warn(context: LogContext, message: string, data?: any, metadata?: { userId?: string; clientId?: string; endpoint?: string; duration?: number }) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'WARN',
      context,
      message,
      data,
      ...metadata
    });
  }

  error(context: LogContext, message: string, error?: Error, data?: any, metadata?: { userId?: string; clientId?: string; endpoint?: string; duration?: number }) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'ERROR',
      context,
      message,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : undefined,
      ...metadata
    });
  }

  debug(context: LogContext, message: string, data?: any, metadata?: { userId?: string; clientId?: string; endpoint?: string; duration?: number }) {
    this.logToConsole({
      timestamp: this.getTimestamp(),
      level: 'DEBUG',
      context,
      message,
      data,
      ...metadata
    });
  }

  // Método para medir duración de operaciones
  async time<T>(context: LogContext, operation: string, fn: () => Promise<T>, metadata?: { userId?: string; clientId?: string; endpoint?: string }): Promise<T> {
    const start = Date.now();
    this.info(context, `🚀 Iniciando: ${operation}`, undefined, metadata);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(context, `✅ Completado: ${operation}`, undefined, { ...metadata, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(context, `❌ Falló: ${operation}`, error as Error, undefined, { ...metadata, duration });
      throw error;
    }
  }
}

export const logger = new Logger();