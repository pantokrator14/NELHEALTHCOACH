import React from 'react';

const MethodSection: React.FC = () => {
  const methods = [
    { id: 1, title: "Dieta Personalizada", icon: "🥗", description: "Plan nutricional keto adaptado a tus necesidades" },
    { id: 2, title: "Ejercicio Guiado", icon: "💪", description: "Rutinas efectivas para complementar tu transformación" },
    { id: 3, title: "Hábitos Saludables", icon: "🔄", description: "Desarrollo de rutinas para un estilo de vida sostenible" },
    { id: 4, title: "Mentalidad Fuerte", icon: "🧠", description: "Coaching para fortalecer tu mente y motivación" }
  ];

  return (
    <section id="metodo" className="section-padding bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <h2 className="section-title">¿Cómo lo haremos?</h2>
        <p className="section-subtitle">Un enfoque integral para tu transformación personal</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {methods.map((method) => (
            <div 
              key={method.id} 
              className="bg-white p-6 rounded-xl shadow-lg text-center transition-all hover:shadow-xl hover:-translate-y-1"
            >
              <div className="text-5xl mb-4">{method.icon}</div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">{method.title}</h3>
              <p className="text-gray-600">{method.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MethodSection;