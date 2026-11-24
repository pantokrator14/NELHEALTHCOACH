import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/dashboard/Layout'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import {
  apiClient,
  type ApiClientError,
  type ClientPortalData,
  type CommercialPlan,
  type CommercialPlanId,
} from '@/lib/api'
import { useUserRole, useLocalStorageValue } from '@/lib/client-hooks'
import { getDateLocale, getLocalizedPlanFields } from '@/lib/locale'
import ClientHealthForm from '@/components/dashboard/ClientHealthForm'
import { useToast } from '@/components/ui/Toast'

interface Stats {
  clientCount: number
  recipeCount: number
  exerciseCount: number
  recentClients: number
  pendingProposals: number
}

interface ProfileData {
  firstName: string
  lastName: string
  role?: string
}

export default function Dashboard() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const userRole = useUserRole()
  const pendingPlanFromStorage = useLocalStorageValue('pendingSelectedPlanId')
  const { showToast, ToastComponent } = useToast()

  // Estado para Coach / Admin
  const [stats, setStats] = useState<Stats>({
    clientCount: 0,
    recipeCount: 0,
    exerciseCount: 0,
    recentClients: 0,
    pendingProposals: 0,
  })
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Estado para Cliente autoregistrado
  const [portal, setPortal] = useState<ClientPortalData | null>(null)
  const [plansCatalog, setPlansCatalog] = useState<CommercialPlan[]>([])
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [showOptionalConsultForm, setShowOptionalConsultForm] = useState(false)
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState(false)
  const confirmedSessionRef = useRef<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    if (!userRole) return

    let active = true

    if (userRole === 'client') {
      const loadClientPortal = async () => {
        try {
          if (
            router.isReady &&
            router.query.payment === 'success' &&
            typeof router.query.session_id === 'string' &&
            confirmedSessionRef.current !== router.query.session_id
          ) {
            const sessionId = router.query.session_id
            confirmedSessionRef.current = sessionId
            try {
              await apiClient.confirmPlanCheckout(sessionId)
              try {
                window.localStorage.removeItem('pendingSelectedPlanId')
              } catch {
                /* ignore */
              }
              if (active) {
                setPaymentSuccessBanner(true)
                showToast(t('clientPortal.paymentConfirmedToast'), 'success')
              }
              router.replace('/dashboard', undefined, { shallow: true })
            } catch (err) {
              if (active) {
                showToast(
                  err instanceof Error ? err.message : t('clientPortal.paymentConfirmPending'),
                  'warning'
                )
              }
            }
          }

          const [portalRes, plansRes] = await Promise.all([
            apiClient.getClientPortalMe(),
            apiClient.getPlans().catch(() => null),
          ])

          if (!active) return
          if (portalRes?.data) setPortal(portalRes.data)
          if (plansRes?.data) setPlansCatalog(plansRes.data)
        } catch (err) {
          if (active) {
            showToast(err instanceof Error ? err.message : t('clientPortal.loadError'), 'error')
          }
        } finally {
          if (active) setLoading(false)
        }
      }

      loadClientPortal()
      return () => {
        active = false
      }
    }

    // Coach / Admin
    const fetchData = async () => {
      try {
        const [statsRes, profileRes, notifRes] = await Promise.allSettled([
          apiClient.getStats(),
          apiClient.getProfile(),
          apiClient.getUnreadNotificationCount(),
        ])

        if (!active) return

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data)
        }

        if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
          setProfile(profileRes.value.data)
        }

        if (notifRes.status === 'fulfilled' && notifRes.value?.success) {
          setUnreadCount(notifRes.value.count)
        }
      } catch {
        // Silencioso
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()
    return () => {
      active = false
    }
  }, [router, router.isReady, router.query.payment, router.query.session_id, showToast, t, userRole])

  const handleStartPlanCheckout = async (planId: CommercialPlanId) => {
    setCheckoutBusy(true)
    try {
      const res = await apiClient.createPlanCheckout(planId)
      if (res?.data?.url) {
        window.location.href = res.data.url
        return
      }
      throw new Error(t('clientPortal.paymentLinkMissing'))
    } catch (err) {
      const apiErr = err as ApiClientError
      if (apiErr?.status === 409 || apiErr?.code === 'QUOTA_FULL') {
        apiClient
          .getPlans()
          .then((r) => {
            if (r?.data) setPlansCatalog(r.data)
          })
          .catch(() => undefined)
      }
      showToast(err instanceof Error ? err.message : t('clientPortal.paymentStartError'), 'error')
      setCheckoutBusy(false)
    }
  }

  // ═══════════════════════════════════════════════
  // VISTA DEL PORTAL DE CLIENTE
  // ═══════════════════════════════════════════════
  if (userRole === 'client') {
    const dateLocale = getDateLocale(i18n.language)
    const basePreselectedPlan =
      portal?.selectedPlan ||
      plansCatalog.find((p) => p.id === pendingPlanFromStorage) ||
      null
    const preselectedPlan = basePreselectedPlan
      ? plansCatalog.find((p) => p.id === basePreselectedPlan.id) || basePreselectedPlan
      : null
    const localizedPreselected = preselectedPlan
      ? getLocalizedPlanFields(preselectedPlan, t)
      : null
    const localizedActivePlan = portal?.activePlan
      ? getLocalizedPlanFields(portal.activePlan, t)
      : null
    const isPreselectedUnavailable = preselectedPlan?.availability
      ? !preselectedPlan.availability.available
      : false

    const coachPhoneDigits = (portal?.assignedCoach?.phone || '').replace(/\D/g, '')
    const canUseWhatsapp =
      coachPhoneDigits.length >= 7 &&
      portal?.planLimits?.whatsappTier !== 'none'
    const whatsappHref = canUseWhatsapp
      ? `https://wa.me/${coachPhoneDigits}`
      : null

    const showVideoCallsSection =
      (portal?.livekitCreditsTotal || 0) > 0 ||
      (portal?.videoSessions?.length || 0) > 0

    return (
      <>
        <Head>
          <title>{t('clientPortal.pageTitle')}</title>
        </Head>
        <Layout>
          <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5 md:space-y-6">
            {loading || !portal ? (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-8 h-36 animate-pulse" />
                <div className="bg-white rounded-2xl p-8 h-64 animate-pulse" />
              </div>
            ) : (
              <>
                {/* Bienvenida */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-lg p-5 md:p-7 text-white">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 mb-2">
                    {t('clientPortal.badge')}
                  </span>
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {portal.clientName
                      ? t('clientPortal.greetingName', { name: portal.clientName })
                      : t('clientPortal.greeting')}
                  </h1>
                </div>

                {paymentSuccessBanner && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl text-sm font-medium">
                    {t('clientPortal.paymentConfirmedBanner')}
                  </div>
                )}

                {/* ESTADO 1: Aún no ha pagado ningún plan */}
                {!portal.hasPaidPlan && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-8 space-y-5">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {preselectedPlan
                            ? t('clientPortal.completeEnrollmentTitle')
                            : t('clientPortal.choosePlanToStartTitle')}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {preselectedPlan
                            ? t('clientPortal.completeEnrollmentDesc')
                            : t('clientPortal.choosePlanToStartDesc')}
                        </p>
                      </div>

                      {preselectedPlan && localizedPreselected ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                {localizedPreselected.durationLabel}
                              </span>
                              <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                                {localizedPreselected.name}
                              </h3>
                              <p className="text-xs text-gray-600 mt-1">
                                {localizedPreselected.modalitySummary}
                              </p>
                            </div>
                            <div className="sm:text-right shrink-0">
                              <span className="text-xs line-through text-gray-400 block">
                                ${preselectedPlan.regularPriceUsd} USD
                              </span>
                              <span className="text-2xl font-extrabold text-emerald-700">
                                ${preselectedPlan.launchPriceUsd} USD
                              </span>
                            </div>
                          </div>

                          {isPreselectedUnavailable && (
                            <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                              {t('clientPortal.preselectedUnavailableNote')}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 pt-2">
                            <button
                              type="button"
                              disabled={checkoutBusy || isPreselectedUnavailable}
                              onClick={() => handleStartPlanCheckout(preselectedPlan.id)}
                              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition ${
                                isPreselectedUnavailable
                                  ? 'bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50'
                              }`}
                            >
                              {isPreselectedUnavailable
                                ? t('clientPortal.unavailableCta')
                                : checkoutBusy
                                ? t('clientPortal.connectingStripe')
                                : t('clientPortal.proceedToPayment', {
                                    price: preselectedPlan.launchPriceUsd,
                                  })}
                            </button>
                            <Link
                              href="/dashboard/plans"
                              className="w-full sm:w-auto text-center px-5 py-3 bg-white border border-emerald-300 text-emerald-800 rounded-xl font-semibold text-sm hover:bg-emerald-100/50 transition"
                            >
                              {t('clientPortal.comparePlans')}
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Link
                            href="/dashboard/plans"
                            className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-md"
                          >
                            {t('clientPortal.viewAllPlans')}
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Tarjeta del asesor Manuel Martínez */}
                    {portal.assignedCoach && (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                            {t('clientPortal.yourHealthCoach')}
                          </p>
                          <div className="flex items-center gap-3 mb-4">
                            {portal.assignedCoach.profilePhotoUrl ? (
                              <div className="relative w-14 h-14 rounded-full overflow-hidden border border-gray-200 shrink-0">
                                <Image
                                  src={portal.assignedCoach.profilePhotoUrl}
                                  alt={portal.assignedCoach.name}
                                  fill
                                  sizes="56px"
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xl flex items-center justify-center shrink-0">
                                {portal.assignedCoach.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-gray-900">{portal.assignedCoach.name}</h3>
                              <p className="text-xs text-emerald-700 font-medium">
                                {t('clientPortal.certifiedCoachBadge')}
                              </p>
                            </div>
                          </div>
                          {portal.assignedCoach.email && (
                            <p className="text-xs text-gray-600 mb-1">
                              <strong>{t('clientPortal.emailLabel')}</strong> {portal.assignedCoach.email}
                            </p>
                          )}
                          {portal.assignedCoach.phone && (
                            <p className="text-xs text-gray-600">
                              <strong>{t('clientPortal.phoneLabel')}</strong> {portal.assignedCoach.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ESTADO 2: Pagó Consulta 1 a 1 ($60) y no ha completado historial */}
                {portal.hasPaidPlan &&
                  portal.activePlan?.id === 'consult_1on1' &&
                  !portal.healthFormId && (
                    <div className="space-y-5">
                      <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-5 md:p-8 space-y-5">
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mb-2">
                            {t('clientPortal.consultConfirmedBadge')}
                          </span>
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {t('clientPortal.consultScheduleTitle')}
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            {t('clientPortal.consultScheduleDesc')}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                          <a
                            href={
                              portal.activePlan.calendlyUrl ||
                              'https://calendly.com/manueldejesusmartinez66/30min'
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition shadow-md"
                          >
                            {t('clientPortal.consultBookBtn')}
                          </a>

                          <button
                            type="button"
                            onClick={() => setShowOptionalConsultForm((v) => !v)}
                            className="px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-sm transition"
                          >
                            {showOptionalConsultForm
                              ? t('clientPortal.consultHideFormBtn')
                              : t('clientPortal.consultShowFormBtn')}
                          </button>
                        </div>
                      </div>

                      {showOptionalConsultForm && (
                        <ClientHealthForm
                          clientEmail={portal.email}
                          activePlanName={localizedActivePlan?.name || portal.activePlan.name}
                          onCompleted={() => router.push('/dashboard/my-profile')}
                        />
                      )}
                    </div>
                  )}

                {/* ESTADO 3: Pagó Reto Tres NEL o Plan 1/2/3 y falta completar historial */}
                {portal.hasPaidPlan &&
                  portal.activePlan?.requiresHealthForm &&
                  !portal.healthFormId && (
                    <ClientHealthForm
                      clientEmail={portal.email}
                      activePlanName={localizedActivePlan?.name || portal.activePlan.name}
                      onCompleted={() => router.push('/dashboard/my-profile')}
                    />
                  )}

                {/* ESTADO 4: Ya completó su historial de salud */}
                {portal.hasPaidPlan && portal.healthFormId && (
                  <>
                    {portal.programCompleted && (
                      <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-300 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
                        <div className="space-y-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                            {t('clientPortal.programCompletedBadge')}
                          </span>
                          <h2 className="text-lg md:text-xl font-bold text-gray-900">
                            {t('clientPortal.programCompletedTitle', {
                              planName:
                                localizedActivePlan?.name ||
                                portal.activePlan?.name ||
                                t('clientPortal.programDefaultName'),
                            })}
                          </h2>
                          <p className="text-sm text-gray-700">
                            {t('clientPortal.programCompletedDesc')}
                          </p>
                        </div>
                        <Link
                          href="/dashboard/plans"
                          className="inline-flex items-center justify-center px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition shadow-sm shrink-0"
                        >
                          {t('clientPortal.renewChangePlanBtn')}
                        </Link>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                      {/* Columna izquierda: Plan activo + Videollamadas */}
                      <div className="lg:col-span-2 space-y-5 md:space-y-6">
                        {portal.activePlan && localizedActivePlan && (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                  {t('clientPortal.activePlanLabel', {
                                    duration: localizedActivePlan.durationLabel,
                                  })}
                                </span>
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">
                                  {localizedActivePlan.name}
                                </h2>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                {portal.planLimits && portal.planLimits.maxMonths > 0 && (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                    {t('clientPortal.evaluationsCount', {
                                      completed: portal.evaluationsCompleted ?? 0,
                                      max: portal.planLimits.maxMonths,
                                    })}
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    portal.programCompleted
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {portal.programCompleted
                                    ? t('clientPortal.statusCompleted')
                                    : t('clientPortal.statusActive')}
                                </span>
                              </div>
                            </div>

                            {portal.planLimits?.includesBiomarkerComparison && (
                              <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-teal-800">
                                  {t('clientPortal.biomarkersTitle')}
                                </p>
                                <p className="text-xs text-teal-700 mt-0.5">
                                  {t('clientPortal.biomarkersDesc')}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 uppercase">
                                  {t('clientPortal.whatsappSupportLabel')}
                                </p>
                                <p className="font-medium text-gray-900 mt-0.5">
                                  {localizedActivePlan.whatsappSupport}
                                </p>
                              </div>

                              {portal.livekitCreditsTotal > 0 ? (
                                <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                                  <p className="text-xs font-semibold text-blue-700 uppercase">
                                    {t('clientPortal.videoCallsAvailableLabel')}
                                  </p>
                                  <p className="font-bold text-blue-900 mt-0.5">
                                    {t('clientPortal.sessionsCountLabel', {
                                      remaining: portal.livekitCreditsRemaining,
                                      total: portal.livekitCreditsTotal,
                                    })}
                                  </p>
                                </div>
                              ) : portal.activePlan.id === 'consult_1on1' ? (
                                <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                                  <p className="text-xs font-semibold text-blue-700 uppercase">
                                    {t('clientPlans.modalityLabel')}
                                  </p>
                                  <p className="font-bold text-blue-900 mt-0.5">
                                    {localizedActivePlan.modalitySummary}
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100">
                                  <p className="text-xs font-semibold text-emerald-700 uppercase">
                                    {t('clientPortal.digitalFollowupLabel')}
                                  </p>
                                  <p className="font-bold text-emerald-900 mt-0.5">
                                    {t('clientPortal.digitalFollowupValue', {
                                      duration: localizedActivePlan.durationLabel,
                                    })}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Ruta del programa */}
                            {localizedActivePlan.roadmap.length > 0 && (
                              <div className="pt-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                  {t('clientPortal.programRoadmapLabel')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  {localizedActivePlan.roadmap.map((stepText, idx) => (
                                    <div
                                      key={stepText}
                                      className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs font-medium text-gray-800 flex items-start gap-2"
                                    >
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                                        {idx + 1}
                                      </span>
                                      <span>{stepText}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {portal.activePlan.id === 'consult_1on1' && (
                              <div className="pt-3 border-t border-gray-100">
                                <a
                                  href={
                                    portal.activePlan.calendlyUrl ||
                                    'https://calendly.com/manueldejesusmartinez66/30min'
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 underline"
                                >
                                  {t('clientPortal.openBookingLink')}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {showVideoCallsSection && (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
                            <h3 className="text-lg font-bold text-gray-900">
                              {t('clientPortal.videoCallsTitle')}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 mb-2">
                              {t('clientPortal.videoCallsSubtitle')}
                            </p>
                            {portal.clientTimezone && (
                              <p className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 inline-block mb-3">
                                🕒 {t('clientPortal.timezoneNote', { tz: portal.clientTimezone })}
                              </p>
                            )}

                            {portal.videoSessions.length === 0 ? (
                              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 border border-gray-100">
                                {t('clientPortal.videoCallsEmpty')}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {portal.videoSessions.map((vs) => {
                                  const canJoinNow = Boolean(vs.canJoin && vs.joinLink)
                                  const tzOpt = vs.timezone || portal.clientTimezone || undefined
                                  const formatSessionDate = (iso: string) => {
                                    try {
                                      return new Date(iso).toLocaleString(dateLocale, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                        ...(tzOpt ? { timeZone: tzOpt, timeZoneName: 'short' } : {}),
                                      })
                                    } catch {
                                      return new Date(iso).toLocaleString(dateLocale, {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                      })
                                    }
                                  }
                                  const formattedDate = formatSessionDate(vs.scheduledAt)
                                  const noteText = vs.isEstimated
                                    ? t('clientPortal.estimatedDateNote')
                                    : canJoinNow
                                    ? t('clientPortal.confirmedDateNote')
                                    : vs.unlocksAt
                                    ? t('clientPortal.unlocksAtNote', {
                                        date: formatSessionDate(vs.unlocksAt),
                                      })
                                    : t('clientPortal.confirmedDateNote')
                                  const statusBadgeClass =
                                    vs.status === 'active'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : vs.status === 'scheduled'
                                      ? 'bg-blue-100 text-blue-800'
                                      : vs.status === 'completed'
                                      ? 'bg-gray-100 text-gray-700'
                                      : vs.status === 'cancelled'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-800'
                                  const statusLabel = t(`clientPortal.slotStatus.${vs.status}`, {
                                    defaultValue: vs.status,
                                  })

                                  return (
                                    <div
                                      key={vs.sessionId}
                                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50/70"
                                    >
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="font-semibold text-gray-900 text-sm">
                                            {t('clientPortal.sessionTitle', {
                                              number: vs.sessionNumber,
                                            })}
                                          </span>
                                          <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadgeClass}`}
                                          >
                                            {statusLabel}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-700 font-medium mt-1">
                                          {formattedDate} · {vs.durationMinutes} min
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                          {noteText}
                                        </p>
                                      </div>

                                      {canJoinNow && vs.joinLink ? (
                                        <a
                                          href={vs.joinLink}
                                          className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shrink-0"
                                        >
                                          {t('clientPortal.joinVideoBtn')}
                                        </a>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled
                                          className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-500 border border-gray-300 rounded-lg text-xs font-semibold cursor-not-allowed shrink-0"
                                        >
                                          {t('clientPortal.joinVideoBtn')}
                                        </button>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Columna derecha: Perfil de Salud y Coach */}
                      <div className="space-y-5 md:space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6 space-y-4">
                          <h3 className="text-lg font-bold text-gray-900">
                            {t('clientPortal.profileCardTitle')}
                          </h3>
                          <p className="text-xs text-gray-600">
                            {t('clientPortal.profileCardDesc')}
                          </p>

                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                            <span className="font-semibold text-gray-700 block">
                              {t('clientPortal.healthRecommendationsLabel')}
                            </span>
                            <span className="text-gray-600 mt-0.5 block">
                              {portal.hasApprovedRecommendations
                                ? t('clientPortal.approvedRecsReady')
                                : t('clientPortal.pendingRecsReview')}
                            </span>
                          </div>

                          <Link
                            href="/dashboard/my-profile"
                            className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
                          >
                            {t('clientPortal.goToProfileBtn')}
                          </Link>
                        </div>

                        {(portal.planLimits?.libraryAccess === 'limited' ||
                          portal.planLimits?.libraryAccess === 'full') && (
                          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-5 md:p-6 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-base font-bold text-gray-900">
                                {t('clientPortal.librariesCardTitle')}
                              </h3>
                              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {portal.planLimits.libraryAccess === 'limited'
                                  ? t('clientPortal.librariesLimitedBadge', {
                                      limit: portal.planLimits.recipesLimit || 15,
                                    })
                                  : t('clientPortal.librariesFullBadge')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {t('clientPortal.librariesCardDesc')}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <Link
                                href="/dashboard/recipes"
                                className="inline-flex items-center justify-center px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition"
                              >
                                {t('clientPortal.recipesLibraryBtn')}
                              </Link>
                              <Link
                                href="/dashboard/exercises"
                                className="inline-flex items-center justify-center px-3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition"
                              >
                                {t('clientPortal.exercisesLibraryBtn')}
                              </Link>
                            </div>
                          </div>
                        )}

                        {portal.planLimits?.nutritionScanner?.enabled && (
                          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5 md:p-6 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-base font-bold text-gray-900">
                                {t('clientPortal.scannerCardTitle')}
                              </h3>
                              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                {t('clientPortal.scannerQuotaBadge', {
                                  remaining: portal.planLimits.nutritionScanner.remainingThisMonth,
                                  limit: portal.planLimits.nutritionScanner.monthlyLimit,
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {t('clientPortal.scannerCardDesc')}
                            </p>
                            <Link
                              href="/dashboard/scanner"
                              className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition"
                            >
                              {t('clientPortal.scannerOpenBtn')}
                            </Link>
                          </div>
                        )}

                        {portal.assignedCoach && (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                              {t('clientPortal.yourCoach')}
                            </p>
                            <div className="flex items-center gap-3 mb-3">
                              {portal.assignedCoach.profilePhotoUrl ? (
                                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-200 shrink-0">
                                  <Image
                                    src={portal.assignedCoach.profilePhotoUrl}
                                    alt={portal.assignedCoach.name}
                                    fill
                                    sizes="48px"
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center shrink-0">
                                  {portal.assignedCoach.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-900 text-sm">
                                  {portal.assignedCoach.name}
                                </p>
                                <p className="text-xs text-gray-500">NELHEALTHCOACH</p>
                              </div>
                            </div>
                            {portal.assignedCoach.email && (
                              <p className="text-xs text-gray-600 mb-1">
                                <strong>{t('clientPortal.emailLabel')}</strong> {portal.assignedCoach.email}
                              </p>
                            )}
                            {portal.assignedCoach.phone && (
                              <p className="text-xs text-gray-600 mb-2">
                                <strong>{t('clientPortal.phoneShortLabel')}</strong> {portal.assignedCoach.phone}
                              </p>
                            )}
                            {whatsappHref && (
                              <a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center justify-center w-full px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                              >
                                {t('clientPortal.whatsappBtn')}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Layout>
        <ToastComponent />
      </>
    )
  }

  // ═══════════════════════════════════════════════
  // VISTA ORIGINAL DE COACH / ADMIN
  // ═══════════════════════════════════════════════
  const coachName = profile?.firstName || 'Coach'

  type ActionColor = 'blue' | 'green' | 'teal' | 'purple'

  const iconMapping: Record<ActionColor, React.ReactNode> = {
    blue: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    green: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    teal: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    purple: (
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  interface QuickAction {
    label: string
    desc: string
    path: string
    color: ActionColor
    bgClass: string
    bgHoverClass: string
    textHoverClass: string
    borderClass: string
  }

  const quickActions: QuickAction[] = [
    {
      label: 'Ver Clientes',
      desc: 'Gestiona los formularios de salud de tus clientes',
      path: '/dashboard/clients',
      color: 'blue',
      bgClass: 'bg-blue-600',
      bgHoverClass: 'group-hover:bg-blue-700',
      textHoverClass: 'group-hover:text-blue-600',
      borderClass: 'border-blue-200',
    },
    {
      label: 'Gestionar Recetas',
      desc: 'Crea y edita planes nutricionales personalizados',
      path: '/dashboard/recipes',
      color: 'green',
      bgClass: 'bg-green-600',
      bgHoverClass: 'group-hover:bg-green-700',
      textHoverClass: 'group-hover:text-green-600',
      borderClass: 'border-green-200',
    },
    {
      label: 'Gestionar Ejercicios',
      desc: 'Administra la biblioteca de ejercicios',
      path: '/dashboard/exercises',
      color: 'teal',
      bgClass: 'bg-teal-600',
      bgHoverClass: 'group-hover:bg-teal-700',
      textHoverClass: 'group-hover:text-teal-600',
      borderClass: 'border-teal-200',
    },
    {
      label: 'Ir a Finanzas',
      desc: 'Revisa tus ingresos, suscripciones y retiros',
      path: '/dashboard/finances',
      color: 'purple',
      bgClass: 'bg-purple-600',
      bgHoverClass: 'group-hover:bg-purple-700',
      textHoverClass: 'group-hover:text-purple-600',
      borderClass: 'border-purple-200',
    },
  ]

  const handleCopyRegisterLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/register')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = window.location.origin + '/register'
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const showPendingProposals = !loading && stats.pendingProposals > 0

  return (
    <>
      <Head>
        <title>Dashboard - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* ── Bienvenida ── */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-xl p-6 md:p-8 text-white mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto md:mx-0 backdrop-blur-sm">
                <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">
                  ¡Bienvenido, {coachName}!
                </h1>
                <p className="text-sm md:text-base text-blue-200">
                  Resumen general de tu plataforma NELHEALTHCOACH.
                </p>
              </div>
              {unreadCount > 0 && (
                <Link
                  href="/dashboard/clients"
                  className="hidden md:inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm px-4 py-2 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                  {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
                </Link>
              )}
            </div>
          </div>

          {/* ── Stats ── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {/* Clientes */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Clientes
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {stats.clientCount}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {stats.recentClients} nuevos en 30 días
                </div>
              </div>

              {/* Recetas */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow">
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Recetas
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {stats.recipeCount}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Planes nutricionales
                </div>
              </div>

              {/* Ejercicios */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border-l-4 border-teal-500 hover:shadow-md transition-shadow">
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Ejercicios
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {stats.exerciseCount}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Biblioteca de ejercicios
                </div>
              </div>

              {/* Recientes + Notificaciones */}
              <div className="bg-white rounded-xl p-5 md:p-6 shadow-sm border-l-4 border-amber-500 hover:shadow-md transition-shadow relative">
                <p className="text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Actividad
                </p>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {stats.recentClients}
                </p>
                <div className="flex items-center mt-2 text-xs text-gray-400">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Nuevos clientes (30 días)
                </div>
                {unreadCount > 0 && (
                  <div className="md:hidden mt-2 pt-2 border-t border-gray-100">
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Alerta de propuestas pendientes ── */}
          {showPendingProposals && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {stats.pendingProposals} propuesta{stats.pendingProposals !== 1 ? 's' : ''} pendiente{stats.pendingProposals !== 1 ? 's' : ''} de revisión
                  </p>
                  <p className="text-xs text-amber-600">
                    Hay contenido nuevo esperando aprobación.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/clients?tab=proposals"
                className="text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                Revisar
              </Link>
            </div>
          )}

          {/* ── Acciones Rápidas ── */}
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Acciones rápidas
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => router.push(action.path)}
                className={`bg-white border ${action.borderClass} rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group text-left`}
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 ${action.bgClass} rounded-xl flex items-center justify-center mr-4 ${action.bgHoverClass} transition-all shrink-0`}>
                    {iconMapping[action.color]}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-base font-semibold text-gray-800 ${action.textHoverClass} transition-colors`}>
                      {action.label}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* ── Enlaces inferiores ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 text-sm text-gray-600 hover:text-gray-800 hover:shadow-sm transition-all border border-gray-100"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mi perfil
            </Link>

            {profile?.role === 'admin' && (
              <Link
                href="/dashboard/coaches"
                className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 text-sm text-gray-600 hover:text-gray-800 hover:shadow-sm transition-all border border-gray-100"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Gestionar asesores
              </Link>
            )}
            <button
              onClick={handleCopyRegisterLink}
              className="flex items-center gap-2 bg-emerald-50 rounded-lg px-4 py-3 text-sm text-emerald-700 hover:text-emerald-800 hover:shadow-sm transition-all border border-emerald-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {copied ? '¡Copiado!' : 'Enlace de registro'}
            </button>
          </div>
        </div>
      </Layout>
      <ToastComponent />
    </>
  )
}
