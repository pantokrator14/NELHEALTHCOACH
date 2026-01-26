import React, { useState, useEffect, useRef, KeyboardEvent, ChangeEvent } from 'react';

interface AutocompleteInputProps {
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxSuggestions?: number;
  className?: string;
  allowCreate?: boolean; // Nueva prop para permitir crear opciones
  onItemCreate?: (value: string) => void; // Callback para cuando se crea un nuevo item
  separator?: 'comma' | 'space' | 'both'; // Separadores para crear múltiples items
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  suggestions,
  value,
  onChange,
  onSelect,
  placeholder = '',
  disabled = false,
  maxSuggestions = 5,
  className = '',
  allowCreate = false, // Por defecto false para mantener compatibilidad
  onItemCreate,
  separator = 'comma', // Por defecto coma
}) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determinar qué separadores usar
  const separators = separator === 'both' ? [',', ' '] : [separator === 'comma' ? ',' : ' '];

  // Filtrar sugerencias basadas en el valor actual
  useEffect(() => {
    if (value.trim() === '') {
      // Mostrar sugerencias recientes o populares cuando no hay texto
      const recentSuggestions = suggestions
        .filter(s => s.trim() !== '')
        .slice(0, maxSuggestions);
      setFilteredSuggestions(recentSuggestions);
    } else {
      const filtered = suggestions
        .filter(suggestion =>
          suggestion.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, maxSuggestions);
      setFilteredSuggestions(filtered);
    }
    setActiveSuggestionIndex(-1);
    
    // Detectar si el usuario está escribiendo algo nuevo que no está en las sugerencias
    if (allowCreate && value.trim()) {
      const normalizedValue = value.trim().toLowerCase();
      const existsInSuggestions = suggestions.some(s => 
        s.toLowerCase() === normalizedValue
      );
      setIsCreatingNew(!existsInSuggestions && !value.includes(','));
    } else {
      setIsCreatingNew(false);
    }
  }, [value, suggestions, maxSuggestions, allowCreate]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Función para procesar el valor del input y crear items
  const processInputValue = (inputValue: string) => {
    if (!allowCreate || !inputValue.trim()) return [];

    let items: string[] = [];
    
    if (separator === 'both') {
      // Separar por comas o espacios
      const commaSeparated = inputValue.split(',').map(item => item.trim()).filter(item => item);
      items = commaSeparated.flatMap(item => 
        item.includes(' ') ? item.split(' ').map(sub => sub.trim()).filter(sub => sub) : [item]
      );
    } else if (separator === 'comma') {
      // Separar solo por comas
      items = inputValue.split(',').map(item => item.trim()).filter(item => item);
    } else {
      // Separar solo por espacios
      items = inputValue.split(' ').map(item => item.trim()).filter(item => item);
    }
    
    return items;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);

    // Si allowCreate está activado y se detecta un separador, crear los items
    if (allowCreate && onItemCreate && separators.some(sep => newValue.includes(sep))) {
      // Obtener el último caracter
      const lastChar = newValue[newValue.length - 1];
      
      if (separators.includes(lastChar)) {
        // Procesar todo excepto el último separador
        const valueWithoutLastSeparator = newValue.slice(0, -1).trim();
        if (valueWithoutLastSeparator) {
          const items = processInputValue(valueWithoutLastSeparator);
          items.forEach(item => {
            if (item && !suggestions.includes(item)) {
              onItemCreate(item);
            }
          });
          // Limpiar el input después de crear
          onChange('');
        }
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    onSelect(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Si presiona Enter y hay sugerencias activas
    if (e.key === 'Enter' && filteredSuggestions.length > 0 && activeSuggestionIndex >= 0) {
      e.preventDefault();
      const selectedSuggestion = filteredSuggestions[activeSuggestionIndex];
      onChange(selectedSuggestion);
      onSelect(selectedSuggestion);
      setShowSuggestions(false);
      return;
    }

    // Si presiona Enter y allowCreate está activado
    if (e.key === 'Enter' && allowCreate && value.trim() && onItemCreate) {
      e.preventDefault();
      const items = processInputValue(value.trim());
      
      if (items.length > 0) {
        items.forEach(item => {
          if (item && !suggestions.includes(item)) {
            onItemCreate(item);
          }
        });
        onChange('');
        setShowSuggestions(false);
      } else if (value.trim() && !suggestions.includes(value.trim())) {
        // Si solo hay un item
        onItemCreate(value.trim());
        onChange('');
        setShowSuggestions(false);
      }
      return;
    }

    // Si presiona Tab y allowCreate está activado
    if (e.key === 'Tab' && allowCreate && value.trim() && onItemCreate && !suggestions.includes(value.trim())) {
      e.preventDefault();
      onItemCreate(value.trim());
      onChange('');
      setShowSuggestions(false);
      return;
    }

    // Navegación con flechas
    if (filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev =>
          prev <= 0 ? filteredSuggestions.length - 1 : prev - 1
        );
        break;

      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev =>
          prev >= filteredSuggestions.length - 1 ? 0 : prev + 1
        );
        break;

      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Retrasar el ocultamiento para permitir clics en sugerencias
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 200);
  };

  // Función para crear nuevo item
  const handleCreateNew = () => {
    if (allowCreate && onItemCreate && value.trim() && !suggestions.includes(value.trim())) {
      onItemCreate(value.trim());
      onChange('');
      inputRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3 text-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-colors ${
            isFocused ? 'border-blue-400' : 'border-gray-300'
          } ${className}`}
          aria-autocomplete="list"
          aria-controls="autocomplete-suggestions"
        />
        
        {value && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {allowCreate && value.trim() && !suggestions.includes(value.trim()) && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="text-green-600 hover:text-green-800 p-1"
                aria-label="Crear nuevo"
                title={`Crear "${value.trim()}"`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Limpiar búsqueda"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Lista de sugerencias */}
      {showSuggestions && (filteredSuggestions.length > 0 || isCreatingNew) && (
        <div
          id="autocomplete-suggestions"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            {/* Opción para crear nuevo */}
            {allowCreate && isCreatingNew && value.trim() && !suggestions.includes(value.trim()) && (
              <button
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-green-50 focus:bg-green-50 focus:outline-none transition-colors border-b border-gray-100"
                onClick={handleCreateNew}
                role="option"
              >
                <div className="flex items-center">
                  <div className="w-6 h-6 mr-2 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Crear nuevo</div>
                    <div className="text-sm text-green-600">&quot;{value.trim()}&quot;</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Presiona Enter, Tab o haz clic para crear
                    </div>
                  </div>
                </div>
              </button>
            )}
            
            {/* Sugerencias existentes */}
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                type="button"
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                  index === activeSuggestionIndex ? 'bg-blue-50' : ''
                } ${
                  index < filteredSuggestions.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
                role="option"
                aria-selected={index === activeSuggestionIndex}
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-gray-700">{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
          
          {/* Tips para el usuario */}
          {allowCreate && (
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>
                  Escribe y presiona <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> para crear nuevo
                </span>
                <span>
                  Separa con <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">,</kbd> o <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">espacio</kbd> para múltiples
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {showSuggestions && filteredSuggestions.length === 0 && value.trim() !== '' && !isCreatingNew && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="px-4 py-6 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm">No se encontraron sugerencias</p>
            {allowCreate && (
              <p className="text-gray-500 text-xs mt-1">
                Presiona Enter para crear &quot;{value.trim()}&quot;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;