import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/api';

interface TrialInfo {
  status: string;
  daysRemaining: number;
  isActive: boolean;
}

export default function TrialBanner() {
  const router = useRouter();
  const { t } = useTranslation();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si el usuario ya dismissió el banner en esta sesión
    const dismissedStorage = localStorage.getItem('trialBannerDismissed');
    if (dismissedStorage === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    const fetchTrialInfo = async () => {
      try {
        const res = await apiClient.getProfile();
        if (res?.data?.trial) {
          const trial = res.data.trial;
          setTrialInfo(trial);
          // Auto-dismiss si no está activo
          if (trial.status !== 'active' || !trial.isActive) {
            setDismissed(true);
          }
        } else {
          setDismissed(true); // No hay trial, no mostrar banner
        }
      } catch {
        setDismissed(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialInfo();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('trialBannerDismissed', 'true');
  };

  const handleSubscribe = () => {
    router.push('/dashboard/profile?subscribe=1');
  };

  if (loading || dismissed || !trialInfo || trialInfo.status !== 'active') {
    return null;
  }

  const daysText = trialInfo.daysRemaining <= 0
    ? 'último día'
    : `${trialInfo.daysRemaining} día${trialInfo.daysRemaining !== 1 ? 's' : ''}`;

  return (
    <div className="mx-4 mt-4 mb-2">
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-emerald-800 truncate">
            <span className="font-medium">{t('trial.banner.trialMode')}</span>{' '}
            {daysText === t('trial.banner.lastDay')
              ? t('trial.banner.lastDay')
              : t('trial.banner.daysRemaining', { days: daysText })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSubscribe}
            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition font-medium whitespace-nowrap"
          >
            {t('trial.banner.paySubscription')}
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition p-1"
            aria-label={t('trial.banner.dismiss')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
