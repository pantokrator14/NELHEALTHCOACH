import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para actualizar posición - memoizada con useCallback
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - 8;
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + 8;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - 8;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        x = triggerRect.right + 8;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // Ajustar para que no se salga de la pantalla
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));

    setCoords({ x, y });
  }, [position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setTimeout(updatePosition, 10); // Pequeño delay para que se renderice primero
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const handleFocus = () => {
    handleMouseEnter();
  };

  const handleBlur = () => {
    handleMouseLeave();
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="inline-block"
        tabIndex={0}
        role="button"
        aria-describedby={isVisible ? `tooltip-${content}` : undefined}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          id={`tooltip-${content}`}
          className="fixed z-[100] animate-fadeIn"
          style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
          role="tooltip"
        >
          <div className="relative bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg max-w-xs">
            {content}
            <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`} />
          </div>
        </div>
      )}
    </div>
  );
};

// Componente específico para términos nutricionales
export const NutritionTooltip: React.FC<{ term: 'protein' | 'carbs' | 'fat' | 'calories' }> = ({ term }) => {
  const content = {
    protein: 'Las proteínas son esenciales para construir y reparar tejidos musculares. Fuentes: carne, pescado, huevos, legumbres.',
    carbs: 'Los carbohidratos son la principal fuente de energía del cuerpo. Fuentes: granos, frutas, verduras, legumbres.',
    fat: 'Las grasas saludables son necesarias para la absorción de vitaminas y energía. Fuentes: aguacate, nueces, aceite de oliva.',
    calories: 'Las calorías miden la energía que proporciona un alimento. Un balance adecuado es clave para mantener un peso saludable.',
  };

  return (
    <Tooltip content={content[term]} position="top" delay={100}>
      <button
        type="button"
        className="inline-flex items-center ml-1 text-gray-400 hover:text-gray-600"
        aria-label={`Información sobre ${term}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </Tooltip>
  );
};

export default Tooltip;