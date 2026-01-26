import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'form' | 'stats';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  count = 1,
  className = '',
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const SkeletonCard = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-gray-200 rounded-lg" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-6 bg-gray-200 rounded-full w-16" />
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );

  const SkeletonList = () => (
    <div className="space-y-3 animate-pulse">
      {skeletons.map((i) => (
        <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="w-6 h-6 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );

  const SkeletonForm = () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-24 bg-gray-200 rounded" />
      </div>
      <div>
        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );

  const SkeletonStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {skeletons.map((i) => (
        <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );

  const renderSkeletons = () => {
    switch (type) {
      case 'card':
        return skeletons.map((i) => <SkeletonCard key={i} />);
      case 'list':
        return <SkeletonList />;
      case 'form':
        return <SkeletonForm />;
      case 'stats':
        return <SkeletonStats />;
      default:
        return null;
    }
  };

  return (
    <div className={`${className}`}>
      {renderSkeletons()}
    </div>
  );
};

// Componente específico para RecipeCard
export const RecipeCardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {skeletons.map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse h-full flex flex-col">
          {/* Imagen */}
          <div className="relative mb-4 overflow-hidden rounded-lg">
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 rounded-lg" />
            <div className="absolute top-2 right-2">
              <div className="w-12 h-6 bg-gray-300 rounded-full" />
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-full mb-4" />
            
            {/* Categorías */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                <div className="w-16 h-6 bg-gray-200 rounded-full" />
                <div className="w-20 h-6 bg-gray-200 rounded-full" />
              </div>
            </div>

            {/* Info rápida */}
            <div className="flex items-center justify-between text-sm mt-auto">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-200 rounded mr-1" />
                <div className="w-12 h-4 bg-gray-200 rounded" />
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-200 rounded mr-1" />
                <div className="w-16 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;