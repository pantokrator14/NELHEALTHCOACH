import React, { useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface Props {
  slug: string;
}

/**
 * Registra una visita anónima de la entrada (analytics sin cookies ni IP:
 * el backend solo guarda un contador agregado por día).
 * Solo cuenta en producción para no contaminar las estadísticas con el dev.
 */
const PageViewTracker: React.FC<Props> = ({ slug }) => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    // Fire-and-forget: una visita nunca debe afectar la experiencia de lectura
    void apiClient.trackView(slug).catch(() => {});
  }, [slug]);

  return null;
};

export default PageViewTracker;
