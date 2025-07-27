import React from 'react';
import TestimonialCard from '../ui/TestimonialCard';

const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      id: 1,
      name: "María González",
      role: "Transformación en 6 meses",
      content: "Gracias al método de Nel, perdí 25 kg y recuperé mi salud. Su enfoque personalizado hizo toda la diferencia.",
      image: "/images/testimonials/testimonial1.jpg" // Ruta de la imagen
    },
    {
      id: 2,
      name: "Carlos Mendoza",
      role: "Cliente desde 2021",
      content: "No solo bajé de peso, sino que cambié mi relación con la comida. La guía de Nel fue fundamental en mi proceso.",
      image: "/images/testimonials/testimonial2.jpg"
    },
    {
      id: 3,
      name: "Ana Rodríguez",
      role: "Resultados en 3 meses",
      content: "La combinación de dieta, ejercicio y mentalidad fue clave. Ahora tengo energía todo el día y me siento mejor que nunca.",
      image: "/images/testimonials/testimonial3.jpg"
    }
  ];

  return (
    <section 
      id="testimonios" 
      className="min-h-screen py-16 px-4 bg-gray-50 flex items-center"
    >
      <div className="container mx-auto max-w-6xl w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-blue-500 text-center mb-4">Transformaciones Reales</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Historias de personas que recuperaron el control de su salud
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              name={testimonial.name}
              role={testimonial.role}
              content={testimonial.content}
              image={testimonial.image} // Pasamos la imagen al componente
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;