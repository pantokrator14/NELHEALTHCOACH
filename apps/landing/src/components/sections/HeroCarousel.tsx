import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const HeroCarousel: React.FC = () => {
  const { t } = useTranslation();

  const slides = [
    {
      id: 1,
      titleKey: 'landing.carousel.slide1',
      image: '/images/hero/hero1.jpg',
    },
    {
      id: 2,
      titleKey: 'landing.carousel.slide2',
      image: '/images/hero/hero2.png',
    },
    {
      id: 3,
      titleKey: 'landing.carousel.slide3',
      image: '/images/hero/hero3.jpg',
    },
    {
      id: 4,
      titleKey: 'landing.carousel.slide4',
      image: '/images/hero/hero4.jpg',
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 10000);

    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  };

  return (
    <section
      id="inicio"
      aria-label="Carrusel principal"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative w-full h-screen overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== currentSlide}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Contenedor de la imagen */}
          <div className="relative w-full h-full">
            <Image
              src={slide.image}
              alt={t(slide.titleKey)}
              fill
              sizes="100vw"
              className="object-cover"
              priority={index === 0}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>

          {/* Overlay con opacidad */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700/40 to-gray-700/20" />

          {/* Contenido del slide */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 px-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 max-w-3xl drop-shadow-md">
              {t(slide.titleKey)}
            </h1>
          </div>
        </div>
      ))}

      {/* Botones de navegación Anterior / Siguiente accesibles por teclado */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Diapositiva anterior (Flecha izquierda)"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Siguiente diapositiva (Flecha derecha)"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Indicadores de navegación con soporte tablist */}
      <div
        role="tablist"
        aria-label="Selector de diapositivas"
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 flex items-center space-x-2.5 bg-black/20 backdrop-blur-sm py-1.5 px-3 rounded-full"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            role="tab"
            type="button"
            aria-selected={index === currentSlide}
            onClick={() => setCurrentSlide(index)}
            className={`h-3 rounded-full transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-white ${
              index === currentSlide ? 'bg-white w-8 shadow' : 'bg-white/50 hover:bg-white/80 w-3'
            }`}
            aria-label={`Diapositiva ${index + 1}: ${t(slide.titleKey)}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
