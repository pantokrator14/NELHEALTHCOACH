// apps/form/src/components/ClientSessionScheduler.tsx
// Calendario para que el cliente seleccione fecha/hora de su videollamada
// (similar al SessionScheduler del coach pero sin autenticación de coach)

import React, { useState } from 'react';

interface ClientSessionSchedulerProps {
  /** Email del cliente */
  clientEmail: string;
  /** Nombre del cliente */
  clientName: string;
  /** ID del cliente (opcional, se llena después del pago) */
  clientId?: string;
  /** Cuando el cliente confirma fecha/hora */
  onSchedule: (data: { scheduledAt: string; duration: number; timezone: string }) => void;
  /** Cuando el cliente cancela */
  onCancel: () => void;
}

const ClientSessionScheduler: React.FC<ClientSessionSchedulerProps> = ({
  onSchedule,
  onCancel,
}) => {
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 3);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });

  const [duration, setDuration] = useState(60);

  const handleContinue = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    onSchedule({
      scheduledAt: new Date(date).toISOString(),
      duration,
      timezone,
    });
  };

  const formattedDate = (() => {
    try {
      return new Date(date).toLocaleString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  })();

  return (
    <div className="bg-white rounded-xl shadow-2xl p-6">
      <h2 className="text-xl font-bold text-blue-800 mb-2">
        Elige tu horario
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Selecciona la fecha y hora que mejor te acomode para tu videollamada.
      </p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha y hora
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
          />
          <p className="text-xs text-gray-500 mt-1">{formattedDate}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duración estimada
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>1 hora</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-8">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={handleContinue}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Continuar al pago
        </button>
      </div>
    </div>
  );
};

export default ClientSessionScheduler;
