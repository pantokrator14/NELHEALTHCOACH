import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const HeroCarousel: React.FC = () => {
  const slides = [
    {
      id: 1,
      title: "El momento de cambiar tu vida ha llegado",
      image: "/images/hero/hero1.jpg"
    },
    {
      id: 2,
      title: "Sabiduría ancestral para solucionar problemas actuales",
      image: "/images/hero/hero2.jpg"
    },
    {
      id: 3,
      title: "Prepárate para tener de nuevo el control de tu vida",
      image: "/images/hero/hero3.jpg"
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div id="inicio" className="relative w-full h-screen overflow-hidden ">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-5000 ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Contenedor de la imagen */}
          <div className="relative w-full h-full">
            <Image
              src={slide.image}
              alt={`Slide ${slide.id}`}
              fill
              sizes="100vw"
              className="object-cover"
              priority={index === 0}
            />
          </div>

          {/* Overlay azul con opacidad */}
          <div className="absolute inset-0 bg-gray-900/70"></div>

          {/* Contenido del slide */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 px-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 max-w-3xl">
              {slide.title}
            </h1>
          </div>
        </div>
      ))}

      {/* Indicadores de navegación */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide ? 'bg-white w-8' : 'bg-blue-200'
            }`}
            aria-label={`Ir a slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;