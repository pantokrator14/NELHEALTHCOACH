// apps/dashboard/src/components/dashboard/ClientProfileView.tsx
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useIsAdmin } from '@/lib/client-hooks'
import Layout from './Layout'
import Head from 'next/head'
import EditClientModal from './EditClientModal'
import { apiClient, type ClientPlanSummary } from '@/lib/api'
import { generateClientPDF } from '@/lib/pdfGenerator'
import { getDateLocale, getLocalizedPlanFields } from '@/lib/locale'
import Image from 'next/image'
import AIRecommendationsModal from './AIRecommendationsModal'
import SessionScheduler from './SessionScheduler'
import { translateGenerationError } from '@/lib/aiVisibleText'
import { useTranslation } from 'react-i18next'
import { useToast } from '../ui/Toast'
import {
  valueLabels,
  evaluationQuestions,
  mentalHealthMultipleChoiceQuestions,
  mentalHealthOptions,
  mentalHealthOpenQuestions,
  objectivesQuestions,
} from '../../lib/formConstants'

interface UploadedFile {
  url: string;
  key: string;
  name: string;
  type: 'profile' | 'document';
  size: number;
  uploadedAt?: string;
}

interface Client {
  _id: string
  personalData: {
    name: string
    address: string
    phone: string
    email: string
    birthDate: string
    gender: string
    age: string
    weight: string
    height: string
    maritalStatus: string
    education: string
    occupation: string
    profilePhoto?: UploadedFile;
    bodyFatPercentage?: string;
    weightVariation?: string;
    dislikedFoodsActivities?: string;
    timezone?: string;
  }
  medicalData: {
    // Básicos
    mainComplaint: string
    mainComplaintIntensity?: number
    mainComplaintImpact?: string
    medications: string
    supplements: string
    currentPastConditions: string
    additionalMedicalHistory: string
    employmentHistory: string
    hobbies: string
    allergies: string
    surgeries: string
    housingHistory: string
    appetiteChanges?: string

    documents?: UploadedFile[];

    // Evaluaciones
    carbohydrateAddiction: string[]
    leptinResistance: string[]
    circadianRhythms: string[]
    sleepHygiene: string[]
    electrosmogExposure: string[]
    generalToxicity: string[]
    microbiotaHealth: string[]

    // Salud mental - opción múltiple
    mentalHealthEmotionIdentification: string
    mentalHealthEmotionIntensity: string
    mentalHealthUncomfortableEmotion: string
    mentalHealthInternalDialogue: string
    mentalHealthStressStrategies: string
    mentalHealthSayingNo: string
    mentalHealthRelationships: string
    mentalHealthExpressThoughts: string
    mentalHealthEmotionalDependence: string
    mentalHealthPurpose: string
    mentalHealthFailureReaction: string
    mentalHealthSelfConnection: string
    mentalHealthSupportNetwork?: 'si-tengo' | 'algunas' | 'no'
    mentalHealthDailyStress?: 'bajo' | 'moderado' | 'alto' | 'muy-alto'

    // Salud mental - texto abierto
    mentalHealthSelfRelationship: string
    mentalHealthLimitingBeliefs: string
    mentalHealthIdealBalance: string

    // Objetivos
    motivation?: string[] | string
    commitmentLevel?: number
    previousCoachExperience?: boolean
    previousCoachExperienceDetails?: string
    targetDate?: string

    // Estilo de vida
    typicalWeekday?: string
    typicalWeekend?: string
    whoCooks?: string
    currentActivityLevel?: string
    physicalLimitations?: string
  }
  contractAccepted: string
  ipAddress: string
  submissionDate: string
  planId?: string | null
  planSummary?: ClientPlanSummary | null
}

export interface ClientProfileViewProps {
  clientId: string;
  mode: 'coach' | 'client';
}

export default function ClientProfileView({ clientId, mode }: ClientProfileViewProps) {
  const { t, i18n } = useTranslation();
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('personal')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [expandedEvaluations, setExpandedEvaluations] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const [selectedDocument, setSelectedDocument] = useState<UploadedFile | null>(null)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const isAdmin = useIsAdmin()
  const [docViewUrl, setDocViewUrl] = useState('')
  const [, setLoadingDocUrl] = useState(false)

  // Documents list for navigation
  // Memoizado: identidad estable para los efectos que dependen de él
  const documents = useMemo(() => client?.medicalData?.documents || [], [client?.medicalData?.documents])
  const currentDocIndex = selectedDocument ? documents.findIndex(d => d.key === selectedDocument.key) : -1
  const hasPrevDoc = currentDocIndex > 0
  const hasNextDoc = currentDocIndex >= 0 && currentDocIndex < documents.length - 1
  const [isProfilePhotoModalOpen, setIsProfilePhotoModalOpen] = useState(false)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [isSessionSchedulerOpen, setIsSessionSchedulerOpen] = useState(false)
  const [, setIsGeneratingAI] = useState(false)
  const [aiGenerationStatus, setAiGenerationStatus] = useState<'idle' | 'queued' | 'ready'>('idle')
  const [, setAiJobId] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const { showToast, ToastComponent } = useToast();

  // Extracción de documentos
  const [, setExtractingFileKeys] = useState<string[]>([])
  const extractionPollRef = useRef<NodeJS.Timeout | null>(null)
  const extractionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const parseArrayField = (field: unknown): string[] => {
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const pollExtractionStatus = useCallback(async (fileKeys: string[]) => {
    if (fileKeys.length === 0) return

    const checkAll = async () => {
      const statuses = await Promise.all(
        fileKeys.map((key) => apiClient.checkExtractionStatus(clientId, key))
      )

      const allDone = statuses.every((s) => s === 'completed' || s === 'failed')
      if (allDone) {
        if (extractionPollRef.current) clearInterval(extractionPollRef.current)
        if (extractionTimeoutRef.current) clearTimeout(extractionTimeoutRef.current)
        setExtractingFileKeys([])

        const failedCount = statuses.filter((s) => s === 'failed').length
        if (failedCount === 0) {
          showToast(t('clients.allDocumentsExtracted'), 'success')
        } else {
          showToast(t('clients.extractionError'), 'warning')
        }
      }
    }

    extractionPollRef.current = setInterval(checkAll, 3000)

    extractionTimeoutRef.current = setTimeout(() => {
      if (extractionPollRef.current) clearInterval(extractionPollRef.current)
      setExtractingFileKeys([])
      showToast(t('clients.extractionError'), 'warning')
    }, 120000)

    checkAll()
  }, [clientId, showToast, t])

  const fetchClient = useCallback(async () => {
    try {
      if (!clientId) return
      const result = await apiClient.getClient(clientId)
      setClient(result.data)
      const sessions = result.data?.aiProgress?.sessions
      if (sessions && sessions.length > 0) {
        setAiGenerationStatus('ready')
        setAiError(null)
        setIsGeneratingAI(false)
      } else {
        setAiGenerationStatus('idle')
        setAiError(null)
        setIsGeneratingAI(false)
      }
    } catch (error) {
      console.error('Error fetching client:', error)
      showToast(t('clients.errorLoading'), 'error')
    } finally {
      setLoading(false)
    }
  }, [clientId, showToast, t])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    void (async () => {
      await Promise.resolve();
      if (clientId) {
        fetchClient()
      }
    })()
  }, [clientId, router, fetchClient])

  useEffect(() => {
    return () => {
      if (extractionPollRef.current) clearInterval(extractionPollRef.current)
      if (extractionTimeoutRef.current) clearTimeout(extractionTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (aiGenerationStatus !== 'queued' || !clientId) return

    let pollCount = 0
    let slow = false
    let timer: ReturnType<typeof setInterval> | undefined
    const FAST_POLLS = 60
    const SLOW_POLLS = 40

    const stop = () => { if (timer) clearInterval(timer) }
    const finish = () => { setAiGenerationStatus('ready'); setIsGeneratingAI(false) }

    const tick = async () => {
      pollCount++
      try {
        const result = await apiClient.getAIProgress(clientId)
        const sessions = result.data?.aiProgress?.sessions
        const genError = result.data?.generationError as { message?: string } | undefined

        if (genError?.message) {
          stop()
          finish()
          const friendlyError = translateGenerationError(genError.message, t)
          setAiError(friendlyError)
          showToast(friendlyError, 'error')
          return
        }

        if (result.success && sessions && sessions.length > 0) {
          stop()
          finish()
          setAiError(null)
          const clientName = client?.personalData?.name ?? 'El cliente'
          showToast(t('ai.recommendationsReady', { name: clientName }), 'success')
          fetchClient()
          return
        }
      } catch {
        // Ignore transient poll errors
      }

      if (!slow && pollCount >= FAST_POLLS) {
        slow = true
        stop()
        showToast(t('ai.generationStillRunning'), 'warning')
        timer = setInterval(tick, 30000)
      } else if (slow && pollCount >= FAST_POLLS + SLOW_POLLS) {
        stop()
        finish()
      }
    }

    timer = setInterval(tick, 10000)
    return stop
  }, [clientId, aiGenerationStatus, client?.personalData?.name, fetchClient, showToast, t])

  const handleDelete = async () => {
    if (
      mode !== 'coach' ||
      !clientId ||
      !confirm(t('clientProfile.confirmDeleteClient', { name: client?.personalData.name || '' }))
    ) {
      return
    }
    try {
      await apiClient.deleteClient(clientId)
      router.push('/dashboard/clients')
    } catch (error) {
      console.error('Error deleting client:', error)
      showToast(t('clients.errorDeleting'), 'error')
    }
  }

  const handleExportPDF = () => {
    if (!client) {
      showToast(t('clients.noDataForExport'), 'warning');
      return;
    }
    try {
      generateClientPDF(client);
    } catch (error) {
      console.error('Error generando PDF:', error);
      showToast(t('clients.errorGeneratingPDF'), 'error');
    }
  }

  const getMentalHealthLabel = (field: string, value: string): string => {
    if (!value) return t('clientProfile.notSpecified')
    return mentalHealthOptions[field]?.[value] || valueLabels[value] || value
  }

  const getEvaluationLabel = (value: string | undefined): string => {
    if (!value) return t('clientProfile.notSpecified')
    return valueLabels[value] || value
  }

  const getNames = (fullName: string) => {
    const names = fullName.split(' ')
    return {
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || ''
    }
  }

  const toggleEvaluation = (evaluationKey: string) => {
    setExpandedEvaluations(prev => ({
      ...prev,
      [evaluationKey]: !prev[evaluationKey]
    }))
  }

  const getEvaluationAnswers = (data: unknown): string[] => {
    if (Array.isArray(data)) return data
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  // Keyboard navigation for document modal
  useEffect(() => {
    if (!isDocumentModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsDocumentModalOpen(false); setSelectedDocument(null); }
      if (e.key === 'ArrowLeft') {
        const idx = documents.findIndex(d => d.key === selectedDocument?.key);
        if (idx > 0) { setSelectedDocument(documents[idx - 1]); setDocViewUrl(''); }
      }
      if (e.key === 'ArrowRight') {
        const idx = documents.findIndex(d => d.key === selectedDocument?.key);
        if (idx >= 0 && idx < documents.length - 1) { setSelectedDocument(documents[idx + 1]); setDocViewUrl(''); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDocumentModalOpen, selectedDocument, documents]);

  // Fetch fresh download URL when selected document changes
  useEffect(() => {
    if (!selectedDocument?.key || !clientId) return;
    void (async () => {
      await Promise.resolve();
      setLoadingDocUrl(true)
      try {
        const url = await apiClient.getDocumentDownloadURL(clientId, selectedDocument.key)
        setDocViewUrl(url)
      } catch {
        setDocViewUrl(selectedDocument.url || '')
      } finally {
        setLoadingDocUrl(false)
      }
    })()
  }, [selectedDocument?.key, selectedDocument?.url, clientId])

  const handleProfilePhotoChange = async (file: File) => {
    if (!clientId) return
    setUploading(true)
    try {
      const uploadResponse = await apiClient.generateUploadURL(
        clientId,
        file.name,
        file.type,
        file.size,
        'profile'
      )
      await fetch(uploadResponse.uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      await apiClient.confirmUpload(
        clientId,
        uploadResponse.fileKey,
        file.name,
        file.type,
        file.size,
        'profile',
        uploadResponse.fileURL!
      )
      await fetchClient()
      showToast(t('clients.profilePhotoUpdated'), 'success')
      setIsProfilePhotoModalOpen(false)
    } catch (error) {
      console.error('Error actualizando foto de perfil:', error)
      showToast(t('clients.errorUpdatingPhoto'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (document: UploadedFile) => {
    if (
      mode !== 'coach' ||
      !clientId ||
      !confirm(t('clientProfile.confirmDeleteDoc', { name: document.name }))
    ) {
      return
    }
    try {
      await apiClient.deleteDocument(clientId, document.key)
      await fetchClient()
      showToast(t('clients.documentDeleted'), 'success')
    } catch (error) {
      console.error('Error eliminando documento:', error)
      showToast(t('clients.errorDeletingDocument'), 'error')
    }
  }

  const handleUploadDocuments = async () => {
    if (!clientId || selectedFiles.length === 0) return
    setUploading(true)
    const uploadedKeys: string[] = []

    const uploadPromises = selectedFiles.map(async (file) => {
      try {
        const uploadResponse = await apiClient.generateUploadURL(
          clientId,
          file.name,
          file.type,
          file.size,
          'document'
        )
        await fetch(uploadResponse.uploadURL, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
        await apiClient.confirmUpload(
          clientId,
          uploadResponse.fileKey,
          file.name,
          file.type,
          file.size,
          'document',
          uploadResponse.uploadURL
        )
        uploadedKeys.push(uploadResponse.fileKey)
        return { success: true, fileName: file.name }
      } catch (error) {
        console.error(`Error subiendo ${file.name}:`, error)
        return { success: false, fileName: file.name }
      }
    })

    try {
      const results = await Promise.all(uploadPromises)
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      if (failed > 0) {
        showToast(t('clients.documentsUploaded', { successful: successful.toString(), failed: failed.toString() }), 'warning')
      } else {
        showToast(t('clients.allDocumentsUploaded'), 'success')
      }
      await fetchClient()
      setSelectedFiles([])
      setIsDocumentsModalOpen(false)

      if (uploadedKeys.length > 0) {
        setExtractingFileKeys(uploadedKeys)
        showToast(t('clients.extractingDocuments'), 'info')
        pollExtractionStatus(uploadedKeys)
      }
    } catch (error) {
      console.error('Error subiendo documentos:', error)
      showToast(t('clients.errorUploadingDocuments'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const MAX_IMAGE_HEIGHT = 6000
  const MAX_ASPECT_RATIO = 5

  const checkImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(false)
        return
      }

      const img = new window.Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        const ratio = img.naturalHeight / img.naturalWidth
        resolve(img.naturalHeight > MAX_IMAGE_HEIGHT && ratio > MAX_ASPECT_RATIO)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(false)
      }

      img.src = url
    })
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const results = await Promise.all(
      fileArray.map(async (file) => ({
        file,
        isSuspicious: await checkImageDimensions(file),
      }))
    )

    const suspiciousFiles = results.filter((r) => r.isSuspicious)
    const safeFiles = results.filter((r) => !r.isSuspicious).map((r) => r.file)

    if (suspiciousFiles.length > 0) {
      if (window.confirm(t('clients.screenshotWarning'))) {
        setSelectedFiles(prev => [...prev, ...results.map((r) => r.file)])
      } else {
        setSelectedFiles(prev => [...prev, ...safeFiles])
      }
    } else {
      setSelectedFiles(prev => [...prev, ...safeFiles])
    }
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const dateLocale = getDateLocale(i18n.language)

  if (loading) {
    return (
      <>
        <Head>
          <title>{t('clientProfile.pageTitle')}</title>
        </Head>
        <Layout>
          <div className="p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-full animate-pulse">
            <div className="w-full lg:w-1/3">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gray-200 mb-4" />
                  <div className="h-7 bg-gray-200 rounded w-44 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-56" />
                </div>
                <div className="mb-6 flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <div className="flex-1 h-9 bg-gray-200 rounded-md" />
                  <div className="flex-1 h-9 bg-gray-200 rounded-md" />
                  <div className="flex-1 h-9 bg-gray-200 rounded-md" />
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-200 rounded w-36" />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-200 rounded w-32" />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-24" />
                    <div className="h-4 bg-gray-200 rounded w-48" />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-2/3 space-y-6">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <div className="h-6 bg-gray-200 rounded w-48" />
                  <div className="h-6 bg-gray-200 rounded-full w-24" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-28" />
                    <div className="h-5 bg-gray-200 rounded w-full" />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <div className="h-6 bg-gray-200 rounded w-56" />
                  <div className="h-6 bg-gray-200 rounded-full w-20" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-4/6" />
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </>
    )
  }

  if (!client) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {mode === 'client' ? t('clientProfile.notFoundProfile') : t('clientProfile.notFoundClient')}
          </h3>
          <button
            onClick={() => router.push(mode === 'client' ? '/dashboard' : '/dashboard/clients')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {mode === 'client' ? t('clientProfile.backToSummary') : t('clientProfile.backToList')}
          </button>
        </div>
      </Layout>
    )
  }

  const { firstName, lastName } = getNames(client.personalData.name)
  const localizedPlanSummary = client.planSummary
    ? getLocalizedPlanFields(client.planSummary, t)
    : null

  return (
    <>
      <Head>
        <title>{firstName} {lastName} - NELHEALTHCOACH</title>
      </Head>
      <Layout>
        <ToastComponent />

        <div className="p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-full">
          {/* Columna izquierda - 30% */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 sm:p-6 lg:sticky lg:top-8 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <div className="flex flex-col items-center text-center mb-6">
                {client.personalData.profilePhoto ? (
                  <div className="relative mb-4">
                    <Image
                      src={client.personalData.profilePhoto.url}
                      alt={`${firstName} ${lastName}`}
                      className="w-44 h-44 sm:w-56 sm:h-56 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                      width={240}
                      height={240}
                      unoptimized
                    />
                    <button
                      onClick={() => setIsProfilePhotoModalOpen(true)}
                      className="absolute bottom-2 right-2 bg-blue-700 text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition"
                      title={t('clientProfile.changePhotoTitle')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="relative mb-4">
                    <div className="w-44 h-44 sm:w-56 sm:h-56 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-4 border-blue-600">
                      <span className="text-white font-bold text-4xl">
                        {firstName.charAt(0)}{lastName.charAt(0)}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsProfilePhotoModalOpen(true)}
                      className="absolute bottom-2 right-2 bg-blue-700 text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition"
                      title={t('clientProfile.addPhotoTitle')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                )}
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{firstName} {lastName}</h1>
                <p className="text-gray-600 text-sm">
                  {t('clientProfile.clientSince', {
                    date: new Date(client.submissionDate).toLocaleDateString(dateLocale, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }),
                  })}
                </p>
                {client.planSummary && localizedPlanSummary && (
                  <div className="mt-3 inline-flex flex-col items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-xs">
                    <span className="font-bold text-emerald-900">
                      {localizedPlanSummary.name} · {localizedPlanSummary.durationLabel}
                    </span>
                    {mode === 'coach' && (
                      <span className="text-[11px] text-emerald-700">
                        {client.planSummary.videoCreditsTotal > 0
                          ? t('clientProfile.videoCreditsCoach', {
                              remaining: client.planSummary.videoCreditsRemaining,
                              total: client.planSummary.videoCreditsTotal,
                              maxMonths: client.planSummary.maxMonths,
                            })
                          : t('clientProfile.noVideoCallsCoach', {
                              maxMonths: client.planSummary.maxMonths,
                            })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Navegación de pestañas */}
              <div className="mb-6 overflow-x-auto">
                <div className="flex space-x-1 bg-blue-50 p-1 rounded-lg min-w-max">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'personal' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:text-blue-700 hover:bg-white'}`}
                  >
                    {t('clientProfile.tabPersonal')}
                  </button>
                  <button
                    onClick={() => setActiveTab('medical')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'medical' ? 'bg-yellow-600 text-white shadow-sm' : 'text-yellow-600 hover:text-yellow-900 hover:bg-white'}`}
                  >
                    {t('clientProfile.tabMedical')}
                  </button>
                  <button
                    onClick={() => setActiveTab('mental')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'mental' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-600 hover:text-purple-900 hover:bg-white'}`}
                  >
                    {t('clientProfile.tabMental')}
                  </button>
                </div>
              </div>

              {/* Contenido de las pestañas */}
              <div className="space-y-4">
                {activeTab === 'personal' && (
                  <>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.emailLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.email}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.phoneLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.phone}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.addressLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.address}</p>
                    </div>
                    {client.personalData.timezone && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.timezoneLabel')}</label>
                        <p className="text-gray-800 font-medium">{client.personalData.timezone}</p>
                      </div>
                    )}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.birthDateLabel')}</label>
                      <p className="text-gray-800 font-medium">
                        {client.personalData.birthDate
                          ? new Date(client.personalData.birthDate).toLocaleDateString(dateLocale)
                          : t('clientProfile.notSpecified')}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.genderLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.gender}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.ageLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.age} {t('clientProfile.yearsUnit')}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.weightLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.weight} kg</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.heightLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.height} cm</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.maritalStatusLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.maritalStatus}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.educationLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.education || t('clientProfile.notSpecified')}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.occupationLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.personalData.occupation || t('clientProfile.notSpecified')}</p>
                    </div>
                    {client.personalData.bodyFatPercentage && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.bodyFatLabel')}</label>
                        <p className="text-gray-800 font-medium">{client.personalData.bodyFatPercentage}</p>
                      </div>
                    )}
                    {client.personalData.weightVariation && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.weightVariationLabel')}</label>
                        <p className="text-gray-800 font-medium">{valueLabels[client.personalData.weightVariation] || client.personalData.weightVariation}</p>
                      </div>
                    )}
                    {client.personalData.dislikedFoodsActivities && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-blue-700 mb-1">{t('clientProfile.dislikedFoodsLabel')}</label>
                        <p className="text-gray-800 font-medium">{client.personalData.dislikedFoodsActivities}</p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'medical' && (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.mainComplaintLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.mainComplaint}</p>
                    </div>
                    {client.medicalData.mainComplaintIntensity && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.intensityLabel')}</label>
                        <p className="text-gray-800 font-medium">{client.medicalData.mainComplaintIntensity}</p>
                      </div>
                    )}
                    {client.medicalData.mainComplaintImpact && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.impactLabel')}</label>
                        <p className="text-gray-800 font-medium">{client.medicalData.mainComplaintImpact}</p>
                      </div>
                    )}
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.medicationsLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.medications || t('clientProfile.notSpecified')}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.supplementsLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.supplements || t('clientProfile.notSpecified')}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.conditionsLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.currentPastConditions || t('clientProfile.notSpecified')}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.additionalHistoryLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.additionalMedicalHistory || t('clientProfile.notSpecified')}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.allergiesLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.allergies || t('clientProfile.notSpecified')}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.surgeriesLabel')}</label>
                      <p className="text-gray-800 font-medium">{client.medicalData.surgeries || t('clientProfile.notSpecified')}</p>
                    </div>
                    {client.medicalData.appetiteChanges && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-yellow-700 mb-1">{t('clientProfile.appetiteChangesLabel')}</label>
                        <p className="text-gray-800 font-medium">{valueLabels[client.medicalData.appetiteChanges] || client.medicalData.appetiteChanges}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'mental' && (
                  <div className="space-y-4">
                    {Object.entries(mentalHealthMultipleChoiceQuestions).map(([field, question]) => {
                      const value = client.medicalData[field as keyof Client['medicalData']] as string
                      if (!value) return null
                      return (
                        <div key={field} className="bg-purple-50 p-3 rounded-lg">
                          <label className="text-sm font-medium text-purple-700 mb-1">{question}</label>
                          <p className="text-gray-800 font-medium">{getMentalHealthLabel(field, value)}</p>
                        </div>
                      )
                    })}
                    {Object.entries(mentalHealthOpenQuestions).map(([field, question]) => {
                      const value = client.medicalData[field as keyof Client['medicalData']] as string
                      if (!value) return null
                      return (
                        <div key={field} className="bg-purple-50 p-3 rounded-lg">
                          <label className="text-sm font-medium text-purple-700 mb-1">{question}</label>
                          <p className="text-gray-800 font-medium">{value}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                {mode === 'coach' && isAdmin && (
                  <button onClick={handleExportPDF} className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t('clientProfile.downloadPdfBtn')}
                  </button>
                )}
                {mode === 'coach' && (
                  <button
                    onClick={() => setIsSessionSchedulerOpen(true)}
                    className="w-full mt-2 bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition font-medium flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {t('clientProfile.scheduleVideoBtn')}
                  </button>
                )}
                <button onClick={() => setIsEditModalOpen(true)} className="w-full mt-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t('clientProfile.editInfoBtn')}
                </button>
                {mode === 'coach' && (
                  <button onClick={handleDelete} className="w-full mt-2 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t('clientProfile.deleteClientBtn')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha - 70% */}
          <div className="w-full lg:w-2/3 space-y-6">
            {/* TARJETA OBJETIVOS (ámbar) */}
            <div className="bg-amber-50 rounded-xl shadow-md border border-amber-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-amber-800">{t('clientProfile.objectivesTitle')}</h2>
              </div>
              <div className="space-y-4">
                {(() => {
                  const motivationArray = parseArrayField(client.medicalData.motivation);
                  return motivationArray.length > 0 ? (
                    <div className="bg-white p-4 rounded-lg border border-amber-200">
                      <label className="text-sm font-medium text-amber-700 mb-2 block">{objectivesQuestions.motivation}</label>
                      <div className="flex flex-wrap gap-2">
                        {motivationArray.map((value, idx) => (
                          <span key={idx} className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                            {valueLabels[value] || value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
                {client.medicalData.commitmentLevel && (
                  <div className="bg-white p-4 rounded-lg border border-amber-200">
                    <label className="text-sm font-medium text-amber-700 mb-2 block">{objectivesQuestions.commitmentLevel}</label>
                    <p className="text-gray-800 font-medium">{client.medicalData.commitmentLevel} / 10</p>
                  </div>
                )}
                {client.medicalData.previousCoachExperience !== undefined && (
                  <div className="bg-white p-4 rounded-lg border border-amber-200">
                    <label className="text-sm font-medium text-amber-700 mb-2 block">{objectivesQuestions.previousCoachExperience}</label>
                    <p className="text-gray-800 font-medium">
                      {client.medicalData.previousCoachExperience ? t('clientProfile.yes') : t('clientProfile.no')}
                    </p>
                  </div>
                )}
                {client.medicalData.previousCoachExperienceDetails && (
                  <div className="bg-white p-4 rounded-lg border border-amber-200">
                    <label className="text-sm font-medium text-amber-700 mb-2 block">{objectivesQuestions.previousCoachExperienceDetails}</label>
                    <p className="text-gray-800 font-medium">{client.medicalData.previousCoachExperienceDetails}</p>
                  </div>
                )}
                {client.medicalData.targetDate && (
                  <div className="bg-white p-4 rounded-lg border border-amber-200">
                    <label className="text-sm font-medium text-amber-700 mb-2 block">{objectivesQuestions.targetDate}</label>
                    <p className="text-gray-800 font-medium">{client.medicalData.targetDate}</p>
                  </div>
                )}
              </div>
            </div>

            {/* TARJETA ESTILO DE VIDA Y CONTEXTO (teal) */}
            <div className="bg-teal-50 rounded-xl shadow-md border border-teal-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-teal-800">{t('clientProfile.lifestyleTitle')}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-teal-200">
                  <h3 className="font-semibold text-teal-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">💼</span>
                    {t('clientProfile.employmentHistoryLabel')}
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.employmentHistory || <span className="text-gray-600 italic">{t('clientProfile.notSpecified')}</span>}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-teal-200">
                  <h3 className="font-semibold text-teal-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">🏠</span>
                    {t('clientProfile.housingHistoryLabel')}
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.housingHistory || <span className="text-gray-600 italic">{t('clientProfile.notSpecified')}</span>}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-teal-200">
                  <h3 className="font-semibold text-teal-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">🎨</span>
                    {t('clientProfile.hobbiesLabel')}
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.hobbies || <span className="text-gray-600 italic">{t('clientProfile.notSpecified')}</span>}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-teal-200">
                  <h3 className="font-semibold text-teal-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">📅</span>
                    {t('clientProfile.typicalWeekdayLabel')}
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.typicalWeekday || <span className="text-gray-600 italic">{t('clientProfile.notSpecified')}</span>}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-teal-200">
                  <h3 className="font-semibold text-teal-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">🎉</span>
                    {t('clientProfile.typicalWeekendLabel')}
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.typicalWeekend || <span className="text-gray-600 italic">{t('clientProfile.notSpecified')}</span>}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-teal-200">
                  <h3 className="font-semibold text-teal-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">🍳</span>
                    {t('clientProfile.whoCooksLabel')}
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.whoCooks || <span className="text-gray-600 italic">{t('clientProfile.notSpecified')}</span>}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-teal-200">
                  <h3 className="font-semibold text-teal-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">🏃</span>
                    {t('clientProfile.activityLevelLabel')}
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.currentActivityLevel || <span className="text-gray-600 italic">{t('clientProfile.notSpecified')}</span>}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border border-teal-200">
                  <h3 className="font-semibold text-teal-700 mb-2 flex items-center">
                    <span className="mr-2 text-lg">⚠️</span>
                    {t('clientProfile.physicalLimitationsLabel')}
                  </h3>
                  <p className="text-gray-700 text-sm min-h-[60px]">
                    {client.medicalData.physicalLimitations || <span className="text-gray-600 italic">{t('clientProfile.notSpecified')}</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* TARJETA EVALUACIONES DE SALUD (rosa) */}
            <div className="bg-pink-50 rounded-xl shadow-md border border-pink-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-pink-700">{t('clientProfile.evaluationsTitle')}</h2>
              </div>
              <div className="space-y-4">
                {Object.entries(evaluationQuestions).map(([key, evaluation]) => {
                  const answers = getEvaluationAnswers(client.medicalData[key as keyof Client['medicalData']])
                  const isExpanded = expandedEvaluations[key]
                  const marked = answers.filter(a => a && a !== 'no' && a !== 'nunca').length
                  return (
                    <div key={key} className="bg-white rounded-lg border border-pink-200 overflow-hidden">
                      <button onClick={() => toggleEvaluation(key)} className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-pink-100 transition-colors">
                        <div className="flex items-center">
                          <span className="font-semibold text-pink-700">{evaluation.title}</span>
                          <span className="ml-2 text-sm text-pink-500 bg-pink-100 px-2 py-1 rounded-full">
                            {t('clientProfile.markedCount', {
                              count: marked,
                              total: evaluation.questions.length,
                            })}
                          </span>
                        </div>
                        <svg className={`w-5 h-5 text-pink-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="px-4 py-3 border-t border-pink-100 bg-pink-50">
                          <div className="space-y-3">
                            {evaluation.questions.map((question, idx) => (
                              <div key={idx} className="flex flex-col p-3 bg-white rounded-lg border border-pink-100">
                                <span className="text-sm text-gray-700 mb-2">{question}</span>
                                <span className={`text-sm font-semibold px-2 py-1 rounded self-start ${
                                  answers[idx] && answers[idx] !== 'no' && answers[idx] !== 'nunca'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {getEvaluationLabel(answers[idx])}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* TARJETA DOCUMENTOS MÉDICOS (índigo) */}
            <div className="bg-indigo-50 rounded-xl shadow-md border border-indigo-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-indigo-700">{t('clientProfile.medicalDocsTitle')}</h2>
                      <span className="bg-indigo-100 text-indigo-800 text-xs sm:text-sm px-3 py-1 rounded-full font-medium">
                        {client.medicalData.documents?.length || 0}{' '}
                        {client.medicalData.documents?.length === 1
                          ? t('clientProfile.docCountSingle')
                          : t('clientProfile.docCountPlural')}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{t('clientProfile.medicalDocsSubtitle')}</p>
                  </div>
                </div>
                <button onClick={() => setIsDocumentsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-lg transition flex items-center justify-center w-full sm:w-auto shadow-sm">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('clientProfile.addDocumentsBtn')}
                </button>
              </div>
              {client.medicalData.documents && client.medicalData.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.medicalData.documents.map((doc, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-indigo-200 hover:shadow-md transition-shadow relative group">
                      {mode === 'coach' && (
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                          title={t('clientProfile.deleteDocTitle')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <div className="flex items-start mb-3">
                        <div className="mr-3 flex-shrink-0">
                          {doc.type.includes('image') ? (
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-800 text-sm truncate mb-1">{doc.name}</h3>
                          <div className="flex items-center text-xs text-gray-500 space-x-2">
                            <span>{Math.round(doc.size / 1024)} KB</span>
                            <span>•</span>
                            <span className="truncate">{doc.type.split('/').pop()?.toUpperCase() || doc.type}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedDocument(doc); setIsDocumentModalOpen(true); }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 px-3 rounded-lg transition text-sm font-medium"
                      >
                        {t('clientProfile.viewDocumentBtn')}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-indigo-200">
                  <svg className="w-12 h-12 text-indigo-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-indigo-500 font-medium mb-2">{t('clientProfile.noDocumentsTitle')}</p>
                  <p className="text-gray-600 text-sm mb-4 max-w-md mx-auto">{t('clientProfile.noDocumentsDesc')}</p>
                  <button onClick={() => setIsDocumentsModalOpen(true)} className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('clientProfile.addFirstDocBtn')}
                  </button>
                </div>
              )}
            </div>

            {/* TARJETA RECOMENDACIONES DE SALUD / IA (verde) */}
            <div className="bg-green-50 rounded-xl shadow-md border border-green-100 p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-700">
                  {mode === 'client'
                    ? t('clientProfile.healthRecommendationsTitle')
                    : t('clientProfile.aiRecommendationsCoachTitle')}
                </h2>
              </div>
              <div className="text-center py-4">
                {aiGenerationStatus === 'idle' && mode === 'coach' && (
                  <button
                    onClick={() => setIsAIModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition shadow-lg flex items-center justify-center mx-auto"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {t('clientProfile.generateAiBtn')}
                  </button>
                )}
                {aiGenerationStatus === 'idle' && mode === 'client' && (
                  <div className="bg-white border border-green-200 rounded-lg p-4 max-w-xl mx-auto">
                    <p className="text-green-900 font-medium text-sm">
                      {t('clientProfile.clientPendingRecs')}
                    </p>
                  </div>
                )}

                {aiGenerationStatus === 'queued' && (
                  <button
                    disabled
                    className="bg-green-300 text-green-100 font-semibold py-3 px-8 rounded-lg cursor-not-allowed flex items-center justify-center mx-auto opacity-60"
                  >
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('clientProfile.generatingWaitBtn')}
                  </button>
                )}

                {aiGenerationStatus === 'ready' && (
                  <button
                    onClick={() => setIsAIModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition shadow-lg flex items-center justify-center mx-auto"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {t('clientProfile.viewRecommendationsBtn')}
                  </button>
                )}

                {!(mode === 'client' && aiGenerationStatus === 'idle') && (
                  <p className="text-gray-600 text-sm mt-3">
                    {aiGenerationStatus === 'queued'
                      ? t('clientProfile.queuedHint')
                      : aiGenerationStatus === 'idle'
                      ? t('clientProfile.idleHintCoach')
                      : mode === 'client'
                      ? t('clientProfile.clientRecsReadOnlyHint')
                      : t('clientProfile.readyHintCoach')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modales */}
        {isEditModalOpen && client && (
          <EditClientModal
            client={client}
            readOnlyEmail={mode === 'client'}
            onClose={() => setIsEditModalOpen(false)}
            onSave={fetchClient}
          />
        )}
        {isDocumentModalOpen && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            {documents.length > 1 && hasPrevDoc && (
              <button
                onClick={() => { const idx = documents.findIndex(d => d.key === selectedDocument?.key); if (idx > 0) { setSelectedDocument(documents[idx - 1]); setDocViewUrl(''); } }}
                className="fixed left-4 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center text-gray-800 hover:bg-white hover:scale-110 transition-all border border-gray-200"
                aria-label={t('clientProfile.prevDocAria')}
              >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            {documents.length > 1 && hasNextDoc && (
              <button
                onClick={() => { const idx = documents.findIndex(d => d.key === selectedDocument?.key); if (idx >= 0 && idx < documents.length - 1) { setSelectedDocument(documents[idx + 1]); setDocViewUrl(''); } }}
                className="fixed right-4 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center text-gray-800 hover:bg-white hover:scale-110 transition-all border border-gray-200"
                aria-label={t('clientProfile.nextDocAria')}
              >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-gray-800 truncate">{selectedDocument.name}</h3>
                  <p className="text-sm text-gray-600">
                    {Math.round(selectedDocument.size / 1024)} KB • {selectedDocument.type}
                    {documents.length > 1 && (
                      <span className="ml-3 text-gray-400">
                        {currentDocIndex + 1} / {documents.length}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                  <a href={docViewUrl || selectedDocument.url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium flex items-center text-sm" download>
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    {t('clientProfile.downloadBtn')}
                  </a>
                  <button onClick={() => { setIsDocumentModalOpen(false); setSelectedDocument(null); }} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition" title={t('clientProfile.closeEscTitle')}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {selectedDocument.type.includes('image') ? (
                  <div className="flex justify-center">
                    <Image src={docViewUrl || selectedDocument.url} alt={selectedDocument.name} width={800} height={600} className="max-w-full max-h-full object-contain" />
                  </div>
                ) : selectedDocument.name.includes('.pdf') ? (
                  <iframe src={docViewUrl || selectedDocument.url} className="w-full h-[70vh] border-0 rounded" title={selectedDocument.name} />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">{t('clientProfile.previewUnavailableTitle')}</h4>
                    <p className="text-gray-600 mb-6">{t('clientProfile.previewUnavailableDesc')}</p>
                    <a href={docViewUrl || selectedDocument.url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition font-medium inline-flex items-center" download>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      {t('clientProfile.downloadFileBtn')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {isProfilePhotoModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">{t('clientProfile.changePhotoModalTitle')}</h3>
                <button onClick={() => setIsProfilePhotoModalOpen(false)} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">{t('clientProfile.selectNewImagePrompt')}</p>
                  <label className="block bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition font-medium cursor-pointer text-center">
                    <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t('clientProfile.selectFileBtn')}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleProfilePhotoChange(file); }} />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">{t('clientProfile.photoFormatsHint')}</p>
                </div>
                {uploading && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-600 mt-2">{t('clientProfile.uploadingImage')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {isDocumentsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-800">{t('clientProfile.addDocsModalTitle')}</h3>
                <button onClick={() => { setIsDocumentsModalOpen(false); setSelectedFiles([]); }} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <div onDragOver={handleDragOver} onDrop={handleDrop} className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center hover:border-indigo-400 transition mb-6">
                  <svg className="w-12 h-12 text-indigo-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-indigo-600 font-medium mb-2">{t('clientProfile.dragDropHint')}</p>
                  <p className="text-gray-500 text-sm mb-4">{t('clientProfile.orLabel')}</p>
                  <label className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition font-medium cursor-pointer">
                    {t('clientProfile.selectFilesBtn')}
                    <input type="file" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx" className="hidden" onChange={(e) => handleFileSelect(e.target.files)} />
                  </label>
                  <p className="text-xs text-gray-500 mt-3">{t('clientProfile.docFormatsHint')}</p>
                </div>
                {selectedFiles.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">{t('clientProfile.selectedFilesTitle')}</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({Math.round(file.size / 1024)} KB)</span>
                          </div>
                          <button onClick={() => removeSelectedFile(index)} className="text-red-500 hover:text-red-700 p-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button onClick={() => { setIsDocumentsModalOpen(false); setSelectedFiles([]); }} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">
                  {t('clientProfile.cancelBtn')}
                </button>
                <button onClick={handleUploadDocuments} disabled={selectedFiles.length === 0 || uploading} className="bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('clientProfile.uploadingBtn')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {t('clientProfile.uploadDocsBtn', { count: selectedFiles.length })}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {isAIModalOpen && clientId && (
          <AIRecommendationsModal
            clientId={clientId}
            _clientName={client.personalData.name}
            clientEmail={client.personalData.email}
            readOnlyClientMode={mode === 'client'}
            planSummary={client.planSummary || null}
            onClose={() => setIsAIModalOpen(false)}
            generationStatus={aiGenerationStatus}
            generationError={aiError}
            onRecommendationsGenerated={(info?: { status: string; jobId?: string }) => {
              if (info?.status === 'queued') {
                setAiGenerationStatus('queued')
                setAiJobId(info.jobId || null)
                setAiError(null)
              } else {
                setAiGenerationStatus('ready')
                setIsGeneratingAI(false)
                setAiError(null)
                fetchClient()
              }
            }}
          />
        )}
        {isSessionSchedulerOpen && client && mode === 'coach' && clientId && (
          <SessionScheduler
            clientId={clientId}
            clientName={client.personalData.name}
            clientEmail={client.personalData.email}
            clientTimezone={client.personalData.timezone}
            clientAddress={client.personalData.address}
            onClose={() => setIsSessionSchedulerOpen(false)}
            onSessionCreated={() => {
              setIsSessionSchedulerOpen(false);
              showToast(t('clientProfile.videoScheduledToast'), 'success');
              fetchClient();
            }}
          />
        )}
      </Layout>
    </>
  )
}
