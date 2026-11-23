import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useIsAdmin, useUserRole } from '@/lib/client-hooks';
import Layout from '../../../components/dashboard/Layout';
import Head from 'next/head';
import {
  apiClient,
  type CommercialPlanId,
  type PlanQuotaAdminItem,
} from '@/lib/api';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  planId?: CommercialPlanId | null;
  planName?: string | null;
  profilePhoto?: {
    url: string;
    key: string;
    name: string;
    type: 'profile' | 'document';
    size: number;
    uploadedAt?: string;
  } | null;
}

type PlanFilterValue = 'all' | CommercialPlanId | 'unassigned';

interface PlanDisplayMeta {
  id: CommercialPlanId;
  shortLabel: string;
  fullLabel: string;
  badgeClass: string;
}

const PLAN_DISPLAY_ORDER: PlanDisplayMeta[] = [
  {
    id: 'reto_tres_nel',
    shortLabel: 'Reto Tres NEL',
    fullLabel: 'Reto Tres NEL: Reinicio Ancestral y Circadiano',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'plan_1_reinicio',
    shortLabel: 'Plan 1: Reinicio',
    fullLabel: 'Plan 1: Reinicio Metabólico',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  {
    id: 'plan_2_transformacion',
    shortLabel: 'Plan 2: Transformación',
    fullLabel: 'Plan 2: Transformación Celular',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'plan_3_maestria',
    shortLabel: 'Plan 3: Maestría',
    fullLabel: 'Plan 3: Maestría y Longevidad',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'consult_1on1',
    shortLabel: 'Consulta 1 a 1',
    fullLabel: 'Consulta Privada de Diagnóstico 1 a 1',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
];

const PLAN_META_BY_ID: Record<CommercialPlanId, PlanDisplayMeta> = PLAN_DISPLAY_ORDER.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<CommercialPlanId, PlanDisplayMeta>,
);

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<PlanFilterValue>('all');
  const [groupByPlan, setGroupByPlan] = useState(true);

  const [copyMsg, setCopyMsg] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Control de cupos por plan (solo admin / Manuel Martínez)
  const [planQuotas, setPlanQuotas] = useState<PlanQuotaAdminItem[]>([]);
  const [quotasLoading, setQuotasLoading] = useState(true);
  const [quotasExpanded, setQuotasExpanded] = useState(true);
  const [limitInputs, setLimitInputs] = useState<Partial<Record<CommercialPlanId, string>>>({});
  const [savingPlanId, setSavingPlanId] = useState<CommercialPlanId | null>(null);

  const router = useRouter();
  const isAdmin = useIsAdmin();
  const userRole = useUserRole();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (!userRole) return;
    if (userRole === 'client') {
      router.replace('/dashboard');
      return;
    }

    const fetchClients = async () => {
      try {
        const result = await apiClient.getClients();
        setClients(result.data || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [router, userRole]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    apiClient
      .getPlanQuotas()
      .then((res) => {
        if (!active || !Array.isArray(res?.data)) return;
        setPlanQuotas(res.data);
        const initialLimits: Partial<Record<CommercialPlanId, string>> = {};
        for (const item of res.data) {
          initialLimits[item.planId] = String(item.limit);
        }
        setLimitInputs(initialLimits);
      })
      .catch((err) => {
        console.error('Error cargando cupos por plan:', err);
      })
      .finally(() => {
        if (active) setQuotasLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const applyQuotasResponse = (quotas: PlanQuotaAdminItem[]) => {
    setPlanQuotas(quotas);
    const updatedLimits: Partial<Record<CommercialPlanId, string>> = {};
    for (const item of quotas) {
      updatedLimits[item.planId] = String(item.limit);
    }
    setLimitInputs(updatedLimits);
  };

  const handleTogglePlanOpen = async (quota: PlanQuotaAdminItem) => {
    setSavingPlanId(quota.planId);
    try {
      const res = await apiClient.updatePlanQuota({
        planId: quota.planId,
        open: !quota.open,
      });
      if (Array.isArray(res?.data)) {
        applyQuotasResponse(res.data);
      }
      showToast(
        !quota.open
          ? `${quota.planName} habilitado nuevamente.`
          : `${quota.planName} cerrado — ahora mostrará "Cupos no disponibles".`,
        'success',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar estado del plan', 'error');
    } finally {
      setSavingPlanId(null);
    }
  };

  const handleSavePlanLimit = async (quota: PlanQuotaAdminItem) => {
    const rawValue = limitInputs[quota.planId] ?? String(quota.limit);
    const parsedLimit = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsedLimit) || parsedLimit < 0 || parsedLimit > 10000) {
      showToast('Ingresa un límite válido entre 0 y 10,000.', 'warning');
      return;
    }

    setSavingPlanId(quota.planId);
    try {
      const res = await apiClient.updatePlanQuota({
        planId: quota.planId,
        limit: parsedLimit,
      });
      if (Array.isArray(res?.data)) {
        applyQuotasResponse(res.data);
      }
      showToast(`Cupo máximo de ${quota.planName} actualizado a ${parsedLimit}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar el límite', 'error');
    } finally {
      setSavingPlanId(null);
    }
  };

  const handleResetPlanUsed = async (quota: PlanQuotaAdminItem) => {
    setSavingPlanId(quota.planId);
    try {
      const res = await apiClient.updatePlanQuota({
        planId: quota.planId,
        resetUsed: true,
      });
      if (Array.isArray(res?.data)) {
        applyQuotasResponse(res.data);
      }
      showToast(`Contador reiniciado para ${quota.planName}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al reiniciar contador', 'error');
    } finally {
      setSavingPlanId(null);
    }
  };

  const handleClientClick = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`);
  };

  const handleCopyRegisterLink = async () => {
    try {
      const res = await apiClient.getCoachLink('paid');
      await navigator.clipboard.writeText(res.data.link);
      setCopyMsg('✅ Enlace con pago copiado al portapapeles');
      setShowDropdown(false);
      setTimeout(() => setCopyMsg(''), 3000);
    } catch {
      setCopyMsg('Error al obtener el enlace');
      setTimeout(() => setCopyMsg(''), 3000);
    }
  };

  const handleCopyFreeLink = async () => {
    try {
      const res = await apiClient.getCoachLink('free');
      await navigator.clipboard.writeText(res.data.link);
      setCopyMsg('✅ Enlace gratuito copiado al portapapeles');
      setShowDropdown(false);
      setTimeout(() => setCopyMsg(''), 3000);
    } catch {
      setCopyMsg('Error al obtener el enlace');
      setTimeout(() => setCopyMsg(''), 3000);
    }
  };

  // Conteo total por plan (sobre todos los clientes registrados)
  const planCounts = useMemo(() => {
    const counts: Record<string, number> = { unassigned: 0 };
    for (const meta of PLAN_DISPLAY_ORDER) {
      counts[meta.id] = 0;
    }
    for (const client of clients) {
      if (client.planId && client.planId in counts) {
        counts[client.planId] += 1;
      } else {
        counts.unassigned += 1;
      }
    }
    return counts;
  }, [clients]);

  // Filtrado por búsqueda y plan seleccionado
  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !query ||
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (selectedPlanFilter === 'all') return true;
      if (selectedPlanFilter === 'unassigned') return !client.planId;
      return client.planId === selectedPlanFilter;
    });
  }, [clients, searchTerm, selectedPlanFilter]);

  // Agrupación ordenada por plan contratado
  const groupedSections = useMemo(() => {
    const sections: Array<{
      key: string;
      title: string;
      badgeClass: string;
      items: Client[];
    }> = [];

    for (const meta of PLAN_DISPLAY_ORDER) {
      const items = filteredClients.filter((c) => c.planId === meta.id);
      if (items.length > 0) {
        sections.push({
          key: meta.id,
          title: meta.fullLabel,
          badgeClass: meta.badgeClass,
          items,
        });
      }
    }

    const unassignedItems = filteredClients.filter((c) => !c.planId);
    if (unassignedItems.length > 0) {
      sections.push({
        key: 'unassigned',
        title: 'Sin plan asignado',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
        items: unassignedItems,
      });
    }

    return sections;
  }, [filteredClients]);

  const renderClientCard = (client: Client) => {
    const planMeta = client.planId ? PLAN_META_BY_ID[client.planId] : undefined;
    const planLabel = planMeta?.shortLabel || client.planName || 'Sin plan asignado';
    const planBadgeClass =
      planMeta?.badgeClass || 'bg-gray-100 text-gray-600 border-gray-200';

    return (
      <div
        key={client._id}
        onClick={() => handleClientClick(client._id)}
        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-blue-100 hover:border-blue-300 p-5 group flex flex-col justify-between"
      >
        <div>
          {/* Foto de perfil o iniciales */}
          {client.profilePhoto ? (
            <div className="relative mb-3 mx-auto">
              <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-blue-500 group-hover:border-blue-600 transition-colors">
                <Image
                  src={client.profilePhoto.url}
                  alt={`Foto de ${client.firstName} ${client.lastName}`}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-3 mx-auto group-hover:bg-blue-600 transition-all">
              <span className="text-white font-semibold text-lg">
                {client.firstName.charAt(0)}
                {client.lastName.charAt(0)}
              </span>
            </div>
          )}

          <h3 className="text-base font-semibold text-gray-800 text-center mb-1 group-hover:text-blue-700 transition-colors">
            {client.firstName} {client.lastName}
          </h3>
          <p className="text-gray-600 text-xs text-center truncate mb-2.5" title={client.email}>
            {client.email}
          </p>

          <div className="flex justify-center mb-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${planBadgeClass}`}
            >
              {planLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center text-gray-500 text-xs pt-2 border-t border-gray-100">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Registrado: {new Date(client.createdAt).toLocaleDateString()}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Clientes - NELHEALTHCOACH</title>
        </Head>
        <Layout>
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 animate-pulse">
              <div className="flex items-center mb-4 lg:mb-0">
                <div className="w-12 h-12 bg-gray-200 rounded-full mr-4 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded w-56" />
                  <div className="h-4 bg-gray-200 rounded w-72" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 rounded-lg w-44" />
                <div className="h-10 bg-gray-200 rounded-lg w-32" />
              </div>
            </div>

            <div className="mb-6 animate-pulse">
              <div className="h-12 bg-gray-200 rounded-lg w-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-md border border-blue-100 p-6 animate-pulse flex flex-col items-center"
                >
                  <div className="w-20 h-20 bg-gray-200 rounded-full mb-4" />
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Clientes - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Encabezado */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4 shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">
                  Clientes Registrados
                </h1>
                <p className="text-sm text-gray-600">
                  Gestiona los formularios de salud, planes contratados y cupos disponibles
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
              {/* Dropdown Agregar nuevo cliente */}
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  title="Agregar nuevo cliente"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition duration-200 font-medium shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar nuevo cliente
                  <svg
                    className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={handleCopyRegisterLink}
                      className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-blue-50 transition text-left border-b border-gray-100"
                    >
                      <div className="flex-shrink-0 w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Link con pago</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          El cliente paga $150 USD por la consulta de onboarding
                        </p>
                      </div>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={handleCopyFreeLink}
                        className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-emerald-50 transition text-left"
                      >
                        <div className="flex-shrink-0 w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Link gratuito</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Sin costo para el cliente. Ideal para personas de bajos recursos que lo necesiten
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg px-4 py-2.5 border border-blue-100 w-full sm:w-auto text-center sm:text-left">
                <div className="text-sm sm:text-base text-gray-700">
                  Total: <span className="font-semibold text-blue-600">{clients.length} clientes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Toast de enlace copiado */}
          {copyMsg && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {copyMsg}
            </div>
          )}

          {/* Panel de disponibilidad y cupos por plan (Solo admin — Manuel Martínez) */}
          {isAdmin && (
            <div className="mb-6 bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-50 to-emerald-50 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
                    <span>🎟️</span>
                    <span>Control de Cupos por Plan</span>
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Cuando un plan alcanza su límite o lo cierras manualmente, su botón cambia a{' '}
                    <span className="font-semibold text-gray-800">&quot;Cupos no disponibles&quot;</span> en la landing y el portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuotasExpanded((prev) => !prev)}
                  className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                >
                  {quotasExpanded ? 'Ocultar panel' : 'Mostrar cupos'}
                </button>
              </div>

              {quotasExpanded && (
                <div className="p-4 sm:p-5">
                  {quotasLoading ? (
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 md:grid md:grid-cols-2 xl:grid-cols-5 md:overflow-visible md:pb-0">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="h-40 rounded-xl bg-gray-100 animate-pulse w-[78vw] max-w-[290px] shrink-0 snap-center md:w-auto md:max-w-none"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 md:grid md:grid-cols-2 xl:grid-cols-5 md:overflow-visible md:pb-0">
                      {planQuotas.map((quota) => {
                        const isBusy = savingPlanId === quota.planId;
                        const statusBadge = !quota.open
                          ? { label: 'Cerrado', cls: 'bg-red-100 text-red-700 border-red-200' }
                          : quota.available
                          ? {
                              label: `Disponible (${quota.remaining})`,
                              cls: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            }
                          : {
                              label: 'Cupos no disponibles',
                              cls: 'bg-amber-100 text-amber-800 border-amber-200',
                            };

                        return (
                          <div
                            key={quota.planId}
                            className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition w-[78vw] max-w-[290px] shrink-0 snap-center md:w-auto md:max-w-none ${
                              quota.available
                                ? 'bg-white border-gray-200'
                                : 'bg-amber-50/40 border-amber-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.cls}`}
                                >
                                  {statusBadge.label}
                                </span>
                                <span className="text-[11px] font-bold text-gray-500">
                                  ${quota.launchPriceUsd}
                                </span>
                              </div>

                              <h3 className="text-sm font-bold text-gray-900 leading-snug">
                                {PLAN_META_BY_ID[quota.planId]?.shortLabel || quota.planName}
                              </h3>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                {quota.durationLabel} · <strong className="text-gray-700">{quota.used} / {quota.limit}</strong> ocupados
                              </p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-600">Estado</span>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleTogglePlanOpen(quota)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                                    quota.open
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                  }`}
                                >
                                  {quota.open ? 'Abierto' : 'Cerrado'}
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <label
                                  htmlFor={`quota-limit-${quota.planId}`}
                                  className="text-xs text-gray-600 shrink-0"
                                >
                                  Cupo:
                                </label>
                                <input
                                  id={`quota-limit-${quota.planId}`}
                                  type="number"
                                  min={0}
                                  max={10000}
                                  disabled={isBusy}
                                  value={limitInputs[quota.planId] ?? String(quota.limit)}
                                  onChange={(e) =>
                                    setLimitInputs((prev) => ({
                                      ...prev,
                                      [quota.planId]: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleSavePlanLimit(quota)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 transition disabled:opacity-50"
                                >
                                  Guardar
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={isBusy || quota.used === 0}
                                onClick={() => handleResetPlanUsed(quota)}
                                className="w-full py-1 px-2 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-lg text-[11px] font-medium transition disabled:opacity-40"
                              >
                                Reiniciar usados ({quota.used})
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Barra de búsqueda + Filtro por Plan + Agrupación */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar clientes por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 text-gray-700 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {selectedPlanFilter === 'all' && (
                <button
                  type="button"
                  onClick={() => setGroupByPlan((prev) => !prev)}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold border transition flex items-center justify-center gap-2 shrink-0 ${
                    groupByPlan
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h10"
                    />
                  </svg>
                  {groupByPlan ? 'Agrupado por plan' : 'Agrupar por plan'}
                </button>
              )}
            </div>

            {/* Píldoras de filtro por plan (scroll horizontal cómodo en móvil) */}
            <div className="flex flex-nowrap overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPlanFilter('all')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  selectedPlanFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Todos ({clients.length})
              </button>

              {PLAN_DISPLAY_ORDER.filter(
                (meta) => meta.id !== 'consult_1on1' || (planCounts[meta.id] || 0) > 0,
              ).map((meta) => {
                const count = planCounts[meta.id] || 0;
                const isSelected = selectedPlanFilter === meta.id;
                return (
                  <button
                    key={meta.id}
                    type="button"
                    onClick={() => setSelectedPlanFilter(meta.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {meta.shortLabel} ({count})
                  </button>
                );
              })}

              {(planCounts.unassigned || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPlanFilter('unassigned')}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    selectedPlanFilter === 'unassigned'
                      ? 'bg-gray-700 text-white border-gray-700 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Sin plan ({planCounts.unassigned})
                </button>
              )}
            </div>
          </div>

          {/* Lista de clientes agrupada por plan o vista filtrada */}
          {groupByPlan && selectedPlanFilter === 'all' ? (
            <div className="space-y-8">
              {groupedSections.map((section) => (
                <section key={section.key} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${section.badgeClass}`}
                      >
                        {section.title}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {section.items.length} {section.items.length === 1 ? 'cliente' : 'clientes'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {section.items.map(renderClientCard)}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredClients.map(renderClientCard)}
            </div>
          )}

          {filteredClients.length === 0 && clients.length > 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No se encontraron clientes
              </h3>
              <p className="text-gray-500">
                Intenta con otros términos de búsqueda o cambia el filtro de plan.
              </p>
            </div>
          )}

          {clients.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No hay clientes registrados
              </h3>
              <p className="text-gray-500">Los formularios enviados aparecerán aquí.</p>
            </div>
          )}
        </div>
      </Layout>
      <ToastComponent />
    </>
  );
}
