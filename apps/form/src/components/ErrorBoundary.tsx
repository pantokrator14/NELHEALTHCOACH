// apps/form/src/components/ErrorBoundary.tsx
// Error Boundary que captura errores de renderizado en el árbol de componentes
// y muestra información útil para diagnóstico, sin afectar el flujo normal.

import React from 'react';
import { API_BASE_URL } from '@/lib/api';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Actualiza el estado para que el siguiente renderizado muestre la UI de error
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Registrar el error para diagnóstico (local y remoto)
    console.error('❌ [ErrorBoundary] Error capturado:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Enviar el error a la API para que el coach lo vea sin esperar al cliente
    const payload = {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
    };

    fetch(`${API_BASE_URL}/api/log-form-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Si falla el envío, no interrumpimos al usuario
    });

    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    // Recarga completa de la página
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#fef2f2',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}>
            {/* Icono */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* Título */}
            <h1 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '8px',
            }}>
              Algo salió mal al cargar el formulario
            </h1>

            <p style={{
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '24px',
              lineHeight: '1.6',
            }}>
              Ocurrió un error inesperado. Por favor, intenta recargar la página.
              Si el problema persiste, contacta a tu coach con el código de error de abajo.
            </p>

            {/* Botón único: recarga la página */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px',
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Reintentar
              </button>
            </div>

            {/* Detalles del error (expandido por defecto) */}
            <details open style={{
              textAlign: 'left',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #e2e8f0',
            }}>
              <summary style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#94a3b8',
                cursor: 'pointer',
              }}>
                Detalles técnicos para el coach
              </summary>
              <div style={{ marginTop: '8px' }}>
                <p style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>
                  {this.state.error?.name}: {this.state.error?.message}
                </p>
                <pre style={{
                  fontSize: '11px',
                  color: '#64748b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  backgroundColor: '#f1f5f9',
                  padding: '8px',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}>
                  {this.state.error?.stack}
                </pre>
                {this.state.errorInfo && (
                  <>
                    <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '8px', marginBottom: '4px' }}>
                      Component Stack:
                    </p>
                    <pre style={{
                      fontSize: '11px',
                      color: '#64748b',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      backgroundColor: '#f1f5f9',
                      padding: '8px',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflow: 'auto',
                    }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    // Sin error: renderiza los hijos normalmente (transparente)
    return this.props.children;
  }
}

export default ErrorBoundary;
