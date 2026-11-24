// apps/dashboard/src/pages/dashboard/scanner.tsx
import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/dashboard/Layout';
import { useToast } from '@/components/ui/Toast';
import { useUserRole } from '@/lib/client-hooks';
import { apiClient, type ClientPortalData } from '@/lib/api';
import type { NutritionAnalysisResult } from '../../../../../packages/types/src/nutrition-types';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
type AllowedMime = 'image/jpeg' | 'image/jpg' | 'image/png' | 'image/webp' | 'image/gif';

const ALLOWED_MIMES = new Set<string>([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export default function NutritionalScannerPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const userRole = useUserRole();
  const { showToast, ToastComponent } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [clientChecked, setClientChecked] = useState(false);
  const checkingAccess = !userRole || (userRole === 'client' && !clientChecked);
  const [portal, setPortal] = useState<ClientPortalData | null>(null);
  const [quota, setQuota] = useState<{
    used: number;
    limit: number;
    remaining: number;
    monthKey: string;
  } | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState<AllowedMime>('image/jpeg');
  const [servings, setServings] = useState<number>(1);
  const [dishTitle, setDishTitle] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<NutritionAnalysisResult | null>(null);

  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'client') {
      void (async () => {
        try {
          const res = await apiClient.getClientPortalMe();
          const data = res?.data;
          const scannerInfo = data?.planLimits?.nutritionScanner;
          if (!scannerInfo?.enabled) {
            router.replace('/dashboard');
            return;
          }
          setPortal(data);
          setQuota({
            used: scannerInfo.usedThisMonth,
            limit: scannerInfo.monthlyLimit,
            remaining: scannerInfo.remainingThisMonth,
            monthKey: scannerInfo.monthKey,
          });
          setClientChecked(true);
        } catch {
          router.replace('/dashboard');
        }
      })();
    }
  }, [router, userRole]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIMES.has(file.type.toLowerCase())) {
      showToast(t('scanner.invalidFileType'), 'error');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      showToast(t('scanner.fileTooLarge'), 'error');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setMimeType(file.type.toLowerCase() as AllowedMime);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      const stripped = raw.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      setImageBase64(stripped);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64) {
      showToast(t('scanner.selectPhotoFirst'), 'error');
      return;
    }

    try {
      setAnalyzing(true);
      const res = await apiClient.analyzeRecipeImage({
        imageBase64,
        mimeType,
        servings: Math.max(1, Math.min(20, servings || 1)),
        title: dishTitle.trim() || undefined,
      });

      if (res.success && res.data) {
        setResult(res.data);
        if (res.quota) {
          setQuota(res.quota);
        }
        showToast(t('scanner.analyzeSuccess'), 'success');
      } else {
        showToast(t('scanner.analyzeError'), 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('scanner.analyzeError');
      showToast(msg || t('scanner.analyzeError'), 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const isQuotaExhausted = userRole === 'client' && quota !== null && quota.remaining <= 0;
  const quotaPct =
    quota && quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;

  if (checkingAccess) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{t('scanner.pageTitle')}</title>
      </Head>
      <Layout>
        <ToastComponent />
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-emerald-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-amber-100">
                  {t('scanner.badge')}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold mt-1">{t('scanner.title')}</h1>
                <p className="text-sm text-amber-50 mt-2 max-w-2xl">{t('scanner.subtitle')}</p>
              </div>
              {userRole === 'client' && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-sm transition shrink-0"
                >
                  {t('scanner.backToHome')}
                </Link>
              )}
            </div>

            {userRole === 'client' && quota && (
              <div className="mt-5 bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span>
                    {t('scanner.quotaUsedLabel', {
                      used: quota.used,
                      limit: quota.limit,
                      remaining: quota.remaining,
                    })}
                  </span>
                  {portal?.activePlan?.name && <span>{portal.activePlan.name}</span>}
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isQuotaExhausted ? 'bg-red-300' : 'bg-white'
                    }`}
                    style={{ width: `${quotaPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {isQuotaExhausted && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-900">
              <h2 className="font-bold text-sm">{t('scanner.quotaExhaustedTitle')}</h2>
              <p className="text-xs text-red-700 mt-1">
                {t('scanner.quotaExhaustedDesc', { limit: quota?.limit ?? 0 })}
              </p>
            </div>
          )}

          {/* Formulario + Resultados */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload panel */}
            <form
              onSubmit={handleAnalyze}
              className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {t('scanner.uploadLabel')}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    <div className="relative w-full h-56 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <Image
                        src={previewUrl}
                        alt="Meal preview"
                        fill
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-4 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition"
                    >
                      {t('scanner.changePhotoBtn')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-10 px-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/50 hover:bg-amber-50 transition flex flex-col items-center justify-center text-center"
                  >
                    <svg
                      className="w-10 h-10 text-amber-600 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-amber-900">
                      {t('scanner.selectPhotoBtn')}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">{t('scanner.uploadHint')}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('scanner.servingsLabel')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('scanner.dishTitleLabel')}
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={dishTitle}
                    onChange={(e) => setDishTitle(e.target.value)}
                    placeholder={t('scanner.dishTitlePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={analyzing || !imageBase64 || isQuotaExhausted}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {t('scanner.analyzingBtn')}
                  </>
                ) : (
                  t('scanner.analyzeBtn')
                )}
              </button>
            </form>

            {/* Results panel */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
              {!result ? (
                <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center text-gray-500 px-4">
                  <div className="text-4xl mb-3">🥗</div>
                  <p className="text-sm font-medium text-gray-700">{t('scanner.resultsTitle')}</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-md">{t('scanner.subtitle')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h2 className="text-lg font-bold text-gray-900">{t('scanner.resultsTitle')}</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {t('scanner.perServing')}
                    </span>
                  </div>

                  {/* Macros por porción */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-center">
                      <p className="text-[11px] font-semibold text-amber-800 uppercase">
                        {t('scanner.calories')}
                      </p>
                      <p className="text-xl font-extrabold text-amber-900 mt-1">
                        {Math.round(result.perServing.calories)} kcal
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-center">
                      <p className="text-[11px] font-semibold text-emerald-800 uppercase">
                        {t('scanner.protein')}
                      </p>
                      <p className="text-xl font-extrabold text-emerald-900 mt-1">
                        {Math.round(result.perServing.protein)} g
                      </p>
                    </div>
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-center">
                      <p className="text-[11px] font-semibold text-blue-800 uppercase">
                        {t('scanner.fat')}
                      </p>
                      <p className="text-xl font-extrabold text-blue-900 mt-1">
                        {Math.round(result.perServing.fat)} g
                      </p>
                    </div>
                    <div className="rounded-xl bg-purple-50 border border-purple-200 p-3.5 text-center">
                      <p className="text-[11px] font-semibold text-purple-800 uppercase">
                        {t('scanner.carbs')}
                      </p>
                      <p className="text-xl font-extrabold text-purple-900 mt-1">
                        {Math.round(result.perServing.carbs)} g
                      </p>
                    </div>
                  </div>

                  {/* Plato completo si servings > 1 */}
                  {result.servings > 1 && (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700">
                      <span className="font-semibold">
                        {t('scanner.totalDish', { servings: result.servings })}:
                      </span>
                      <span>
                        {Math.round(result.total.calories)} kcal · P: {Math.round(result.total.protein)}g ·{' '}
                        {t('scanner.fatPct')}: {Math.round(result.total.fat)}g · {t('scanner.carbPct')}:{' '}
                        {Math.round(result.total.carbs)}g
                      </span>
                    </div>
                  )}

                  {/* Perfil Energético Metabólico */}
                  {result.ketoRatio && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        {t('scanner.metabolicTitle')}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                          <span className="text-blue-700 font-medium block">{t('scanner.fatPct')}</span>
                          <span className="font-bold text-blue-950 text-sm">
                            {result.ketoRatio.fatPercentage}%
                          </span>
                        </div>
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5">
                          <span className="text-emerald-700 font-medium block">{t('scanner.proteinPct')}</span>
                          <span className="font-bold text-emerald-950 text-sm">
                            {result.ketoRatio.proteinPercentage}%
                          </span>
                        </div>
                        <div className="rounded-lg bg-purple-50 border border-purple-100 p-2.5">
                          <span className="text-purple-700 font-medium block">{t('scanner.carbPct')}</span>
                          <span className="font-bold text-purple-950 text-sm">
                            {result.ketoRatio.carbPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ingredientes detectados */}
                  {((result.detectedIngredients && result.detectedIngredients.length > 0) ||
                    (result.ingredients && result.ingredients.length > 0)) && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        {t('scanner.detectedIngredients')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(result.detectedIngredients && result.detectedIngredients.length > 0
                          ? result.detectedIngredients
                          : result.ingredients.map((i) => `${i.ingredient} (${i.quantity}${i.unit})`)
                        ).map((item, idx) => (
                          <span
                            key={`${item}-${idx}`}
                            className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                    {t('scanner.disclaimer')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
