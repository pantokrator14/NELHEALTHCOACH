export interface DocumentSelectionDoc {
  uploadedAt?: string | Date;
  [key: string]: unknown;
}

export interface DocumentSelectionSession {
  sessionId?: string;
  status?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  approvedAt?: string | Date;
  emailSentAt?: string | Date;
}

export type DocumentSelectionReason =
  | 'empty'
  | 'after_last_completed_session'
  | 'latest_upload_batch'
  | 'initial_evaluation'
  | 'legacy_tail';

export interface DocumentSelectionResult<T extends DocumentSelectionDoc> {
  selected: T[];
  excludedCount: number;
  reason: DocumentSelectionReason;
  cutoffDate: string | null;
}

const DEFAULT_MAX_DOCS = 6;
const DEFAULT_BATCH_WINDOW_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toTimestampMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

/**
 * Selecciona únicamente los documentos médicos más actuales relevantes para la
 * evaluación presente, evitando mezclar exámenes viejos de sesiones anteriores.
 *
 * Estrategia:
 * 1. Ordena del más reciente al más antiguo por `uploadedAt` (y orden de inserción como desempate).
 * 2. Si existen sesiones previas enviadas/aprobadas (excluyendo `excludeSessionId`),
 *    toma únicamente los documentos subidos DESPUÉS de la última sesión completada.
 * 3. Si el cliente ya tuvo evaluaciones previas pero no subió documentos nuevos desde
 *    la última sesión, toma solo el lote más reciente (ventana de 14 días respecto al
 *    documento más nuevo), en lugar de arrastrar documentos de hace meses.
 * 4. Si es la primera evaluación del cliente (sin sesiones previas), toma hasta `maxDocs`
 *    documentos más recientes.
 */
export function selectCurrentEvaluationDocuments<T extends DocumentSelectionDoc>(
  documents: T[] | undefined | null,
  sessions?: DocumentSelectionSession[] | null,
  options: {
    excludeSessionId?: string;
    maxDocs?: number;
    batchWindowDays?: number;
  } = {}
): DocumentSelectionResult<T> {
  if (!Array.isArray(documents) || documents.length === 0) {
    return {
      selected: [],
      excludedCount: 0,
      reason: 'empty',
      cutoffDate: null,
    };
  }

  const maxDocs = Math.max(1, options.maxDocs ?? DEFAULT_MAX_DOCS);
  const batchWindowMs =
    Math.max(1, options.batchWindowDays ?? DEFAULT_BATCH_WINDOW_DAYS) * MS_PER_DAY;

  const indexed = documents.map((doc, originalIndex) => ({
    doc,
    originalIndex,
    uploadedAtMs: toTimestampMs(doc?.uploadedAt),
  }));

  // Más reciente primero; ante igualdad de fecha (o ausencia de fecha), el último agregado primero
  const sorted = [...indexed].sort((a, b) => {
    if (b.uploadedAtMs !== a.uploadedAtMs) {
      return b.uploadedAtMs - a.uploadedAtMs;
    }
    return b.originalIndex - a.originalIndex;
  });

  const relevantSessions = (Array.isArray(sessions) ? sessions : []).filter(
    (s) => !options.excludeSessionId || s?.sessionId !== options.excludeSessionId
  );

  // Última sesión completada/enviada/aprobada (o cualquier sesión previa no-draft)
  let lastCompletedMs = 0;
  for (const s of relevantSessions) {
    if (s?.status === 'draft') continue;
    const candidateMs = Math.max(
      toTimestampMs(s?.emailSentAt),
      toTimestampMs(s?.approvedAt),
      toTimestampMs(s?.createdAt),
      toTimestampMs(s?.updatedAt)
    );
    if (candidateMs > lastCompletedMs) {
      lastCompletedMs = candidateMs;
    }
  }

  // Caso 1: Hay sesiones previas completadas y documentos subidos después de la última
  if (lastCompletedMs > 0) {
    const newerDocs = sorted.filter((item) => item.uploadedAtMs > lastCompletedMs);
    if (newerDocs.length > 0) {
      const selected = newerDocs.slice(0, maxDocs).map((item) => item.doc);
      return {
        selected,
        excludedCount: documents.length - selected.length,
        reason: 'after_last_completed_session',
        cutoffDate: new Date(lastCompletedMs).toISOString(),
      };
    }
  }

  const newestDocMs = sorted[0]?.uploadedAtMs ?? 0;

  // Caso 2: Hay historial de sesiones (o regeneración sobre historial previo),
  // pero no hay documentos posteriores a la última sesión → tomar solo el lote más reciente
  if (relevantSessions.length > 0 || lastCompletedMs > 0) {
    if (newestDocMs > 0) {
      const batchCutoffMs = newestDocMs - batchWindowMs;
      const latestBatch = sorted
        .filter((item) => item.uploadedAtMs >= batchCutoffMs)
        .slice(0, maxDocs);
      const selected = latestBatch.map((item) => item.doc);
      return {
        selected,
        excludedCount: documents.length - selected.length,
        reason: 'latest_upload_batch',
        cutoffDate: new Date(batchCutoffMs).toISOString(),
      };
    }

    // Documentos heredados sin fecha: tomar únicamente los últimos 3 agregados
    const legacySelected = sorted.slice(0, Math.min(3, maxDocs)).map((item) => item.doc);
    return {
      selected: legacySelected,
      excludedCount: documents.length - legacySelected.length,
      reason: 'legacy_tail',
      cutoffDate: null,
    };
  }

  // Caso 3: Primera evaluación (sin sesiones previas)
  const initialSelected = sorted.slice(0, maxDocs).map((item) => item.doc);
  return {
    selected: initialSelected,
    excludedCount: documents.length - initialSelected.length,
    reason: 'initial_evaluation',
    cutoffDate: null,
  };
}
