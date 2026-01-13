import React from 'react';

/**
 * Sección "¿Cómo lo haremos?" con:
 * - Título y subtítulo
 * - 4 tarjetas con iconos que representan cada aspecto del método
 * - Diseño responsive (1 columna en móvil, 2 en tablet, 4 en escritorio)
 */
const MethodSection: React.FC = () => {
  const methods = [
    {
      id: 1,
      title: "Dieta Personalizada",
      icon: "🥗",
      description: "Planes adaptados a tus necesidades y objetivos específicos para una nutrición evolutiva."
    },
    {
      id: 2,
      title: "Ejercicio estructurado y progresivo",
      icon: "💪",
      description: "Rutinas de ejercicio efectivas para complementar tu transformación"
    },
    {
      id: 3,
      title: "Hábitos Saludables",
      icon: "🔄",
      description: "Desarrollo de rutinas que promueven un estilo de vida sostenible y longevo."
    },
    {
      id: 4,
      title: "Mentalidad Fuerte",
      icon: "🧠",
      description: "Coaching para fortalecer tu mente y mantener la motivación. Tu cuerpo manda, tú decides."
    }
  ];

  return (
    <section id="metodo" className="min-h-screen py-16 px-4 bg-gray-50 flex items-center">
      <div className="container mx-auto max-w-6xl w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-blue-500 text-center mb-4">¿Cómo lo haremos?</h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Un enfoque integral para tu transformación personal:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {methods.map((method) => (
            <div 
              key={method.id} 
              className="bg-white p-6 rounded-xl shadow-md text-center transition-transform hover:scale-105"
            >
              <div className="text-4xl mb-4">{method.icon}</div>
              <h3 className="text-xl text-blue-500 font-bold mb-3">{method.title}</h3>
              <p className="text-gray-600">{method.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MethodSection;