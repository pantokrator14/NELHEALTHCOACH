import React from 'react';

const MethodSection: React.FC = () => {
  const methods = [
    {
      id: 1,
      title: "Dieta Personalizada",
      icon: "🥗",
      description: "Plan nutricional keto adaptado a tus necesidades y objetivos específicos"
    },
    {
      id: 2,
      title: "Ejercicio Guiado",
      icon: "💪",
      description: "Rutinas de ejercicio efectivas para complementar tu transformación"
    },
    {
      id: 3,
      title: "Hábitos Saludables",
      icon: "🔄",
      description: "Desarrollo de rutinas que promueven un estilo de vida sostenible"
    },
    {
      id: 4,
      title: "Mentalidad Fuerte",
      icon: "🧠",
      description: "Coaching para fortalecer tu mente y mantener la motivación"
    }
  ];

  return (
    <section id="método" className="section-padding bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">¿Cómo lo haremos?</h2>
        <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
          Un enfoque integral para tu transformación personal
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {methods.map((method) => (
            <div 
              key={method.id} 
              className="bg-white p-8 rounded-xl shadow-lg text-center hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">{method.icon}</div>
              <h3 className="text-xl font-bold mb-3">{method.title}</h3>
              <p className="text-gray-600">{method.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MethodSection;