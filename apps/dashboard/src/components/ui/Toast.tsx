import React, { useEffect, useState, useCallback, useMemo } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export interface ToastConfig {
  message: string;
  type: ToastType;
}

const Toast: React.FC<ToastProps> = React.memo(({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
  };

  const colors = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-500',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-500',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-500',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-500',
    },
  };

  return (
    <div className="fixed top-4 right-4 z-[100]">
      <div
        className={`
          ${colors[type].bg}
          ${colors[type].border}
          border
          rounded-lg
          shadow-lg
          p-4
          mb-3
          min-w-[300px]
          max-w-[400px]
          transition-all
          duration-300
          transform
          ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        `}
        role="alert"
      >
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${colors[type].icon}`}>
            {icons[type]}
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${colors[type].text}`}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsExiting(true);
              setTimeout(onClose, 300);
            }}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

// Hook para usar Toast - VERSIÓN CORREGIDA
export const useToast = () => {
  const [toast, setToast] = useState<ToastConfig & { isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Uso de useMemo para memoizar el componente y evitar recreación en cada render
  const ToastComponent = useMemo(() => {
    const MemoizedToast: React.FC = function MemoizedToast() {
      return (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      );
    };
    MemoizedToast.displayName = 'ToastComponent';
    return MemoizedToast;
  }, [toast.message, toast.type, toast.isVisible, hideToast]);

  return {
    toast,
    showToast,
    hideToast,
    ToastComponent,
  };
};

export default Toast;