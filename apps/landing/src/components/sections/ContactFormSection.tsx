// apps/landing/src/components/sections/ContactFormSection.tsx
import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FormData {
  name: string;
  email: string;
  phone: string;
  objective: string;
  otherObjective?: string;
}

const objectives = [
  { value: 'perder-peso', label: 'Perder peso' },
  { value: 'ganar-musculo', label: 'Ganar masa muscular' },
  { value: 'mas-energia', label: 'Tener más energía' },
  { value: 'mejorar-digestion', label: 'Mejorar digestión' },
  { value: 'reducir-estres', label: 'Reducir estrés' },
  { value: 'dormir-mejor', label: 'Dormir mejor' },
  { value: 'otro', label: 'Otro' },
];

const ContactFormSection: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    objective: 'perder-peso',
    otherObjective: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cerrar con Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const openCalendly = () => {
    window.open(
      'https://calendly.com/nelhealthcoach/30min',
      '_blank',
      'noopener,noreferrer,width=800,height=600'
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const finalObjective = formData.objective === 'otro' && formData.otherObjective
      ? formData.otherObjective
      : formData.objective;

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      objective: finalObjective,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Leer la respuesta como texto primero para depurar
      const text = await response.text();
      console.log('📨 Respuesta del servidor (texto):', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ No se pudo parsear JSON. Respuesta:', text);
        throw new Error('La respuesta del servidor no es válida');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar');
      }

      // Éxito: cerrar modal y abrir Calendly
      setIsModalOpen(false);
      openCalendly();
    } catch (err: unknown) {
      console.error('❌ Error en fetch:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contacto" className="py-16 px-4 bg-blue-200">
      <div className="container mx-auto max-w-5xl">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="md:flex">
            {/* Panel izquierdo - Beneficios */}
            <div className="md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">¿Hablamos?</h2>
              <p className="mb-6 text-xl text-blue-100">
                Prepárate para tomar el control de tu vida de una vez por todas.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">Sesión personalizada de 60 minutos</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">Análisis inicial para establecer tu plan</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-blue-500 rounded-full p-2 mr-3 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg">Plan de acción personalizado</span>
                </li>
              </ul>
            </div>

            {/* Panel derecho - Botón único */}
            <div className="md:w-1/2 p-12 flex flex-col justify-center items-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Agenda tu sesión gratuita
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Elige el día y hora que mejor te convenga en solo 2 clics
              </p>

              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xl font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-2xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
              >
                <span className="text-2xl">📅</span>
                <span>Ver horarios disponibles</span>
              </button>

              <div className="mt-8 space-y-4">
                <p className="text-gray-500 text-sm text-center flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Sin registros necesario
                </p>
                <p className="text-gray-500 text-sm text-center flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Recibirás confirmación por email
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal del formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-blue-800 mb-4">Antes de continuar</h3>
            <p className="text-gray-600 mb-6">
              Cuéntanos un poco sobre ti para que podamos preparar mejor tu sesión.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Teléfono (opcional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">Objetivo principal *</label>
                <select
                  name="objective"
                  required
                  value={formData.objective}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                >
                  {objectives.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Campo adicional si se selecciona "Otro" */}
              {formData.objective === 'otro' && (
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">Especifica tu objetivo</label>
                  <input
                    type="text"
                    name="otherObjective"
                    value={formData.otherObjective}
                    onChange={handleInputChange}
                    placeholder="Ej: Mejorar mi rendimiento deportivo"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                    required
                  />
                </div>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Continuar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactFormSection;