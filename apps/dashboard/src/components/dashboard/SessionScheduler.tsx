// apps/dashboard/src/components/dashboard/SessionScheduler.tsx
//
// Modal para agendar una nueva sesión de videollamada con el cliente.
// Si el cliente tiene créditos LiveKit incluidos en su plan, agenda la sala de inmediato
// y envía invitaciones y recordatorios duales (zona horaria del coach y del cliente).
// Si no tiene créditos disponibles, crea una solicitud PendingSession para pago con Stripe.

import { useState } from 'react';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface SessionSchedulerProps {
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientTimezone?: string;
  clientAddress?: string;
  onClose: () => void;
  onSessionCreated: (data: {
    pendingSessionId: string;
    status: string;
    proposedDate: string;
  }) => void;
  /** Sesión de recomendaciones actual (para asociar la videollamada) */
  recommendationSessionId?: string;
}

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────

export default function SessionScheduler({
  clientId,
  clientName,
  clientEmail,
  clientTimezone,
  clientAddress,
  onClose,
  onSessionCreated,
}: SessionSchedulerProps) {
  const [date, setDate] = useState(() => {
    // Por defecto: mañana a las 10:00 (en formato local del selector datetime-local)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
  });

  const [duration, setDuration] = useState(60);
  const [coachNotes, setCoachNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coachLocalTz =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles'
      : 'America/Los_Angeles';

  // ── Enviar formulario ──

  async function handleSubmit(): Promise<void> {
    try {
      setSubmitting(true);
      setError(null);

      // Validar fecha futura
      const selectedDate = new Date(date);
      if (isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
        setError('La fecha debe ser futura');
        setSubmitting(false);
        return;
      }

      // Zona horaria detectada del navegador del coach
      const timezone =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : 'America/Los_Angeles';

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No autorizado');

      const response = await fetch(`${API_BASE_URL}/api/video/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientId,
          clientName,
          clientEmail,
          scheduledAt: selectedDate.toISOString(),
          durationMinutes: duration,
          coachNotes: coachNotes || undefined,
          timezone,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          (errData as { message?: string }).message || 'Error al agendar la videollamada'
        );
      }

      const data = (await response.json()) as {
        success: boolean;
        data: {
          pendingSessionId: string;
          status: string;
          proposedDate: string;
          message: string;
        };
      };

      onSessionCreated({
        pendingSessionId: data.data.pendingSessionId,
        status: data.data.status,
        proposedDate: data.data.proposedDate,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al agendar la sesión');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Formatear fechas para vista previa dual-TZ ──

  const formatInTz = (tz?: string): string | null => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString('es-MX', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(tz ? { timeZone: tz, timeZoneName: 'short' } : {}),
      });
    } catch {
      return null;
    }
  };

  const formattedCoachDate = formatInTz(coachLocalTz) || date;
  const formattedClientDate = clientTimezone ? formatInTz(clientTimezone) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Programar Videollamada</h2>
          <p className="text-emerald-100 text-sm mt-1">
            {clientName} — Sesión con recordatorios automáticos
          </p>
        </div>

        {/* Cuerpo con scroll */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Fecha y hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha y hora de la sesión ({coachLocalTz})
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Vista previa en ambas zonas horarias */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-xs space-y-1.5">
            <p className="font-semibold text-blue-900">
              🕒 Vista previa de horarios (coach y cliente)
            </p>
            <p className="text-blue-800">
              <strong>Tu horario ({coachLocalTz}):</strong> {formattedCoachDate}
            </p>
            {formattedClientDate ? (
              <p className="text-blue-800">
                <strong>Horario del cliente ({clientTimezone}):</strong> {formattedClientDate}
              </p>
            ) : (
              <p className="text-blue-700">
                <strong>Horario del cliente:</strong> se calculará automáticamente según su perfil{clientAddress ? ` (${clientAddress})` : ''}.
              </p>
            )}
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración estimada
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1 hora 30 minutos</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          {/* Notas (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas para la sesión <span className="text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              placeholder="Ej: Revisar avances en hábito de sueño, ajustar plan de ejercicio..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Info del flujo */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <span className="text-lg">💡</span>
              <div className="text-sm text-amber-900">
                <p className="font-medium mb-1">¿Cómo funciona?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Si el cliente tiene sesiones incluidas en su plan, la sala se confirma de inmediato y ambos reciben invitación con su hora local.</li>
                  <li>Se enviarán recordatorios por correo e internos cuando falten menos de 24 horas y 15 minutos antes de iniciar.</li>
                  <li>Si el cliente no tiene créditos disponibles en su plan, se le enviará primero un enlace de pago.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex-shrink-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                Agendando...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                Confirmar videollamada
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
