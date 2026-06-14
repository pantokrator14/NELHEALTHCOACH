import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../../components/dashboard/Layout';
import Head from 'next/head';
import { useToast } from '../../../components/ui/Toast';
import { apiClient, FinancesData } from '../../../lib/api';
import { useTranslation } from 'react-i18next';

// ─── helpers ───

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatShortMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

// ─── colores ───
const COLORS = {
  primary: 'purple',
  income: '#22c55e',   // green-500
  expense: '#ef4444',  // red-500
  subscription: '#6366f1', // indigo-500
};

// ─── Componente ───

const FinancesPage = () => {
  const { t } = useTranslation();
  const { showToast, ToastComponent } = useToast();

  const [data, setData] = useState<FinancesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'6m' | '12m' | 'all'>('12m');
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  // ─── Cargar datos ───
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getFinances(period);
      if (res.success && res.data) {
        setData(res.data);
        if (!res.data.sesionPriceFijo) {
          setPriceInput(String((res.data.sesionPrice / 100).toFixed(0)));
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('finances.errorLoad'), 'error');
    } finally {
      setLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Guardar precio por sesión (solo coaches no-admin) ───
  const handleSavePrice = async () => {
    const priceNum = parseInt(priceInput, 10);
    if (isNaN(priceNum) || priceNum < 10 || priceNum > 9999) {
      showToast(t('finances.errorInvalidPrice'), 'error');
      return;
    }
    try {
      setSavingPrice(true);
      const res = await apiClient.updateSessionPrice(priceNum * 100);
      if (res.success) {
        showToast(t('finances.priceUpdated'), 'success');
        setEditingPrice(false);
        setData(prev => prev ? { ...prev, sesionPrice: priceNum * 100 } : prev);
      } else {
        showToast(res.message || t('finances.errorSave'), 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('finances.errorSavePrice'), 'error');
    } finally {
      setSavingPrice(false);
    }
  };

  // ─── Calcular gráfico de barras ───
  const getBarChart = () => {
    if (!data?.breakdownMensual || data.breakdownMensual.length === 0) return null;

    const maxVal = Math.max(
      ...data.breakdownMensual.map(m => Math.max(m.ingresos, m.suscripcion)),
      1
    );

    return data.breakdownMensual.map((item) => {
      const ingH = maxVal > 0 ? (item.ingresos / maxVal) * 100 : 0;
      const subH = maxVal > 0 ? (item.suscripcion / maxVal) * 100 : 0;
      return (
        <div key={item.month} className="flex flex-col items-center gap-1 flex-1">
          <div className="relative w-full flex justify-center gap-0.5" style={{ height: '140px' }}>
            {/* Ingreso (verde) */}
            <div
              className="w-3 rounded-t transition-all duration-500 self-end"
              style={{
                height: `${Math.max(ingH, 2)}%`,
                backgroundColor: COLORS.income,
              }}
              title={t('finances.chartTooltipIncome', { month: formatShortMonth(item.month), amount: formatCents(item.ingresos) })}
            />
            {/* Suscripción (rojo para coach, índigo para admin) */}
            <div
              className="w-3 rounded-t transition-all duration-500 self-end"
              style={{
                height: `${Math.max(subH, 2)}%`,
                backgroundColor: data.isAdmin ? '#6366f1' : COLORS.expense,
              }}
              title={t('finances.chartTooltipSubs', { month: formatShortMonth(item.month), amount: formatCents(item.suscripcion) })}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatShortMonth(item.month)}
          </span>
        </div>
      );
    });
  };

  // ─── Render ───
  return (
    <>
      <Head><title>{t('finances.title')} - NELHEALTHCOACH</title></Head>
      <Layout>
        <div className="p-8">
          <ToastComponent />

          {/* ─── Header ─── */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-purple-700">{t('finances.title')}</h1>
                  <p className="text-purple-500">
                    {data?.isAdmin ? t('finances.subtitleAdmin') : t('finances.subtitleCoach')}
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Selector de período ─── */}
            <div className="flex gap-2 bg-white rounded-xl shadow-sm p-1">
              {(['6m', '12m', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    period === p
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-purple-50'
                  }`}
                >
                  {p === '6m' ? t('finances.period6m') : p === '12m' ? t('finances.period12m') : t('finances.periodAll')}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Loading ─── */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            </div>
          )}

          {/* ─── Content ─── */}
          {!loading && data && (
            <>
              {/* ─── Summary Cards ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Card Ingresos por Sesiones */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500">
                      {data.isAdmin ? t('finances.cardSessionsAdmin') : t('finances.cardSessionsCoach')}
                    </span>
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{formatCents(data.summary.totalBruto)}</p>
                  <p className="text-sm text-gray-500 mt-1">{t('finances.sessionsCount', { count: data.summary.sesionesCompletadas })}</p>
                </div>

                {/* Card Ingresos Suscripciones / Costo Suscripción */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500">
                      {data.isAdmin ? t('finances.cardSubscriptionsAdmin') : t('finances.cardSubscriptionsCoach')}
                    </span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${data.isAdmin ? 'bg-indigo-100' : 'bg-red-100'}`}>
                      {data.isAdmin ? (
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className={`text-3xl font-bold ${data.isAdmin ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {formatCents(data.summary.totalSuscripcion)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {data.isAdmin
                      ? t('finances.paymentsReceived', { count: data.suscripcion?.mesesSuscrito ?? 0 })
                      : t('finances.monthsCount', { count: data.suscripcion?.mesesSuscrito ?? 0 })}
                  </p>
                </div>

                {/* Card Total Ingresos / Total Obtenido */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-purple-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-sm font-medium ${data.isAdmin ? 'text-purple-600' : 'text-purple-600'}`}>
                      {data.isAdmin ? t('finances.totalIncome') : t('finances.totalNet')}
                    </span>
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-purple-700">{formatCents(data.summary.totalObtenido)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {data.isAdmin ? t('finances.totalBreakdownAdmin') : t('finances.totalBreakdownCoach')}
                  </p>
                </div>

                {/* Card Precio por Sesión */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500">{t('finances.pricePerSession')}</span>
                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                  {data.sesionPriceFijo ? (
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold text-gray-800">{formatCents(data.sesionPrice)}</p>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t('finances.priceFixed')}</span>
                    </div>
                  ) : editingPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-gray-500">$</span>
                      <input
                        type="number"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="w-24 px-2 py-1 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xl font-bold"
                        min="10"
                        max="9999"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSavePrice(); if (e.key === 'Escape') setEditingPrice(false); }}
                      />
                      <button
                        onClick={handleSavePrice}
                        disabled={savingPrice}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                      >
                        {savingPrice ? '...' : t('common.save')}
                      </button>
                      <button
                        onClick={() => setEditingPrice(false)}
                        className="px-3 py-1.5 text-gray-500 text-sm rounded-lg hover:bg-gray-100 transition"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold text-gray-800">{formatCents(data.sesionPrice)}</p>
                      <button
                        onClick={() => { setPriceInput(String((data.sesionPrice / 100).toFixed(0))); setEditingPrice(true); }}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title={t('finances.priceEditTitle')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {data.sesionPriceFijo
                      ? t('finances.priceStandard')
                      : t('finances.priceChargedToClient')}
                  </p>
                </div>
              </div>

              {/* ─── Chart ─── */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  {data.isAdmin ? t('finances.chartTitleAdmin') : t('finances.chartTitleCoach')}
                </h2>
                <div className="flex items-center gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.income }} />
                    <span className="text-gray-600">{t('finances.chartLegendIncome')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: data.isAdmin ? '#6366f1' : COLORS.expense }} />
                    <span className="text-gray-600">{data.isAdmin ? t('finances.chartLegendSubsAdmin') : t('finances.chartLegendSubsCoach')}</span>
                  </div>
                </div>
                <div className="flex items-end gap-2 h-44">
                  {getBarChart()}
                </div>
              </div>

              {/* ─── Transacciones Recientes ─── */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('finances.transactionsTitle')}</h2>
                {data.transaccionesRecientes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    {t('finances.transactionsEmpty')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-3 text-sm font-medium text-gray-500">{t('finances.thClient')}</th>
                          <th className="pb-3 text-sm font-medium text-gray-500">{t('finances.thAmount')}</th>
                          <th className="pb-3 text-sm font-medium text-gray-500">{t('finances.thDate')}</th>
                          <th className="pb-3 text-sm font-medium text-gray-500">{t('finances.thStatus')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.transaccionesRecientes.map((tx) => (
                          <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-3 text-sm font-medium text-gray-800">{tx.clientName}</td>
                            <td className="py-3 text-sm text-gray-700">{formatCents(tx.amount)}</td>
                            <td className="py-3 text-sm text-gray-500">{formatDate(tx.date)}</td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                tx.status === 'paid' || tx.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {tx.status === 'paid' || tx.status === 'completed' ? `✅ ${t('finances.statusPaid')}` : tx.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ─── Card de Suscripción ─── */}
              {data.suscripcion && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">
                    {data.isAdmin ? t('finances.subCardTitleAdmin') : t('finances.subCardTitleCoach')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {data.isAdmin ? (
                      <>
                        <div>
                          <span className="text-sm text-gray-500">{t('finances.subTotalReceived')}</span>
                          <p className="text-lg font-semibold text-indigo-700 mt-1">{formatCents(data.summary.totalSuscripcion)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">{t('finances.subPaymentsReceived')}</span>
                          <p className="text-lg font-semibold text-gray-800 mt-1">{data.suscripcion.mesesSuscrito}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">{t('finances.subAmountPerCoach')}</span>
                          <p className="text-lg font-semibold text-gray-800 mt-1">{formatCents(data.suscripcion.monto)}/mes</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">{t('finances.subStatus')}</span>
                          <p className="text-lg font-semibold text-green-600 flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                            {t('finances.subActive')}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-sm text-gray-500">{t('finances.subStatus')}</span>
                          <p className="text-lg font-semibold mt-1">
                            {data.suscripcion.status === 'active' ? (
                              <span className="text-green-600 flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                                {t('finances.subActiveLabel')}
                              </span>
                            ) : data.suscripcion.status === 'past_due' ? (
                              <span className="text-red-600 flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                                {t('finances.subOverdue')}
                              </span>
                            ) : (
                              <span className="text-gray-500">{t('finances.subInactive')}</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">{t('finances.subMonthlyAmount')}</span>
                          <p className="text-lg font-semibold text-gray-800 mt-1">{formatCents(data.suscripcion.monto)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">{t('finances.subMonthsSubscribed')}</span>
                          <p className="text-lg font-semibold text-gray-800 mt-1">{data.suscripcion.mesesSuscrito}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">{t('finances.subNextBilling')}</span>
                          <p className="text-lg font-semibold text-gray-800 mt-1">
                            {data.suscripcion.currentPeriodEnd
                              ? formatDate(data.suscripcion.currentPeriodEnd)
                              : data.suscripcion.proximoCobro
                                ? formatDate(data.suscripcion.proximoCobro)
                                : '—'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Retiros a cuenta bancaria ─── */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M3 10v11M21 10v11" />
                  </svg>
                  {t('finances.payoutsTitle')}
                </h2>

                {data.payouts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    {t('finances.payoutsEmpty')}
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 rounded-lg p-4 mb-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">{t('finances.payoutsTotal')}</span>
                      <span className="text-2xl font-bold text-blue-700">{formatCents(data.summary.totalPayouts)}</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="pb-3 text-sm font-medium text-gray-500">{t('finances.thDescription')}</th>
                            <th className="pb-3 text-sm font-medium text-gray-500">{t('finances.thAmount')}</th>
                            <th className="pb-3 text-sm font-medium text-gray-500">{t('finances.thArrivalDate')}</th>
                            <th className="pb-3 text-sm font-medium text-gray-500">{t('finances.thStatus')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.payouts.map((po) => (
                            <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="py-3 text-sm text-gray-800">{po.description || t('finances.payoutDefaultDesc')}</td>
                              <td className="py-3 text-sm font-medium text-gray-800">{formatCents(po.amount)}</td>
                              <td className="py-3 text-sm text-gray-500">{formatDate(po.arrivalDate)}</td>
                              <td className="py-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  po.status === 'paid'
                                    ? 'bg-green-100 text-green-700'
                                    : po.status === 'pending'
                                      ? 'bg-amber-100 text-amber-700'
                                      : po.status === 'in_transit'
                                        ? 'bg-blue-100 text-blue-700'
                                        : po.status === 'failed'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {po.status === 'paid' ? t('finances.payoutStatusPaid') :
                                   po.status === 'pending' ? t('finances.payoutStatusPending') :
                                   po.status === 'in_transit' ? t('finances.payoutStatusInTransit') :
                                   po.status === 'failed' ? t('finances.payoutStatusFailed') :
                                   po.status === 'canceled' ? t('finances.payoutStatusCanceled') : po.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ─── Empty state ─── */}
          {!loading && !data && (
            <div className="text-center py-20 text-gray-400">
              {t('finances.errorNoData')}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default FinancesPage;
