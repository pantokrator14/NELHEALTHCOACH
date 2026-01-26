import React, { useState, useEffect } from 'react';

interface DragDropListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (items: T[]) => void;
  disabled?: boolean;
  dragHandleIcon?: React.ReactNode;
  className?: string;
}

function DragDropList<T>({
  items,
  renderItem,
  onReorder,
  disabled = false,
  dragHandleIcon,
  className = '',
}: DragDropListProps<T>) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localItems, setLocalItems] = useState<T[]>(items);

  // Sincronizar items cuando cambian externamente
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (disabled) return;
    
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (disabled) return;
    
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    if (disabled || draggedIndex === null) return;
    
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
    
    const newItems = [...localItems];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    setLocalItems(newItems);
    onReorder(newItems);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const defaultDragHandle = (
    <div className="cursor-move p-2 text-gray-400 hover:text-gray-600">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
      </svg>
    </div>
  );

  const dragHandle = dragHandleIcon || defaultDragHandle;

  return (
    <div className={`space-y-3 ${className}`}>
      {localItems.map((item, index) => (
        <div
          key={index}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`
            flex items-start gap-3 transition-all duration-200
            ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-move'}
            ${dragOverIndex === index ? 'border-l-4 border-blue-400 bg-blue-50' : ''}
            ${draggedIndex === index ? 'opacity-50' : ''}
          `}
        >
          {!disabled && (
            <div className="flex-shrink-0" title="Arrastrar para reordenar">
              {dragHandle}
            </div>
          )}
          
          <div className="flex-1">
            {renderItem(item, index)}
          </div>
          
          <div className="flex-shrink-0 text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
            #{index + 1}
          </div>
        </div>
      ))}
      
      {localItems.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>No hay elementos para ordenar</p>
        </div>
      )}
    </div>
  );
}

export default DragDropList;