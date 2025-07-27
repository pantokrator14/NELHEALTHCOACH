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
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <section 
      id="inicio" 
      className="relative h-screen w-full flex items-center justify-center"
    >
      {slides.map((slide, index) => (
        <div 
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <div className="absolute inset-0">
            <Image
              src={slide.image}
              alt={`Slide ${slide.id}`}
              fill
              className="object-cover w-full h-full"
              quality={100}
            />
          </div>
          
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-center px-4 max-w-3xl">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-8">
                {slide.title}
              </h1>
            </div>
          </div>
        </div>
      ))}
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-white w-6' : 'bg-gray-300'
            }`}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;