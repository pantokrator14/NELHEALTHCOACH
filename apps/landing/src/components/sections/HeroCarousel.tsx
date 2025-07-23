import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const HeroCarousel: React.FC = () => {
  const slides = [
    {
      id: 1,
      title: "El momento de cambiar tu vida ha llegado",
      image: "/images/hero1.jpg" // Reemplaza con tus imágenes
    },
    {
      id: 2,
      title: "Sabiduría ancestral para solucionar problemas actuales",
      image: "/images/hero2.jpg"
    },
    {
      id: 3,
      title: "Prepárate para tener de nuevo el control de tu vida",
      image: "/images/hero3.jpg"
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section id="inicio" className="relative h-screen">
      {slides.map((slide, index) => (
        <div 
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="relative w-full h-full">
            <Image
              src={slide.image}
              alt={`Slide ${slide.id}`}
              fill
              className="object-cover"
              quality={100}
            />
          </div>  
          
          <div className="absolute inset-0 bg-blue-900 bg-opacity-72 flex items-center justify-center">
            <div className="text-center px-4 max-w-4xl">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fadeIn">
                {slide.title}
              </h1>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-colors">
                Comienza tu transformación
              </button>
            </div>
          </div>
        </div>
      ))}
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-4 h-4 rounded-full ${
              index === currentSlide ? 'bg-white' : 'bg-gray-300'
            }`}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;