import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import React from 'react';
import { apiClient, Exercise } from '@/lib/api';
import RecipeSearchModal from './RecipeSearchModal';
import ExerciseSearchModal from './ExerciseSearchModal';
import SimpleItemModal from './SimpleItemModal';
import RecipeDetailModal from './RecipeDetailModal';
import ExerciseDetailModal from './ExerciseDetailModal';
import AIRecipeEditModal, { AIRecipeData } from './AIRecipeEditModal';
import OriginPin from './OriginPin';
import SessionScheduler from './SessionScheduler';
import VideoCallRoom from './VideoCallRoom';
import { useToast } from '@/components/ui/Toast';
import { ChecklistItem } from '../../../../../packages/types/src/healthForm';
import { Recipe } from '../../../../../packages/types/src/recipe-types';
import { useTranslation } from 'react-i18next';

// ===== TIPOS Y INTERFACES =====

interface RecipeWithDetails extends Recipe {
  ingredients: string[];
  instructions: string[];
}

// Estructura antigua de una semana (cuando incluía checklistItems)
interface OldWeekStructure {
  weekNumber?: number;
  nutrition?: {
    focus?: string;
    meals?: string[];
    recipes?: Array<{
      ingredients: Array<{ name: string; quantity: string; notes?: string }>;
      preparation: string;
      tips?: string;
    }>;
    shoppingList?: unknown[];
  };
  exercise?: {
    focus?: string;
    routine?: string;
    frequency?: string;
    duration?: string;
    equipment?: string[];
    adaptations?: string[];
  };
  habits?: {
    toAdopt?: string[];
    toEliminate?: string[];
    trackingMethod?: string;
    motivationTip?: string;
  };
}

interface AIRecommendationWeek {
  weekNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  nutrition: {
    focus: string;
    shoppingList: Array<{ item: string; quantity: string; priority: 'high' | 'medium' | 'low' }>;
  };
  exercise: {
    focus: string;
    equipment?: string[];
  };
  habits: {
    trackingMethod?: string;
    motivationTip?: string;
  };
}

interface BaselineMetrics {
  currentWeight?: number;
  targetWeight?: number;
  currentLifestyle: string[];
  targetLifestyle: string[];
}

interface RegenerationHistoryItem {
  timestamp: Date;
  previousSessionId: string;
  coachNotes?: string;
  triggeredBy: 'coach' | 'system';
}

interface AIRecommendationSession {
  sessionId: string;
  monthNumber: number;
  totalWeeks?: number; // Número total de semanas en el plan (4 para 1 mes, 12 para 3 meses)
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'approved' | 'sent';
  summary: string;
  vision: string;
  baselineMetrics: BaselineMetrics;
  weeks: AIRecommendationWeek[];
  checklist: ChecklistItem[];
  coachNotes?: string;
  approvedAt?: Date;
  sentAt?: Date;
  previousSessionId?: string;
  regenerationCount?: number;
  regenerationHistory?: RegenerationHistoryItem[];
  lastCoachNotes?: string;
  regeneratedAt?: Date;
  emailSent?: boolean;
  emailError?: string;
}

interface AIProgressMetrics {
  nutritionAdherence: number;
  exerciseConsistency: number;
  habitFormation: number;
  weightProgress?: number;
  energyLevel?: number;
  sleepQuality?: number;
}

interface ClientAIProgress {
  clientId: string;
  currentSessionId?: string;
  sessions: AIRecommendationSession[];
  overallProgress: number;
  lastEvaluation?: Date;
  nextEvaluation?: Date;
  metrics: AIProgressMetrics;
}

interface ApiAIProgressData {
  sessions?: Array<{
    sessionId: string;
    monthNumber?: number;
    summary?: string;
    vision?: string;
    weeks?: unknown[];
    checklist?: ChecklistItem[];
    status?: 'draft' | 'approved' | 'sent';
    createdAt?: string | Date;
    updatedAt?: string | Date;
  }>;
  clientId?: string;
  overallProgress?: number;
  metrics?: AIProgressMetrics;
  currentSessionId?: string;
  lastEvaluation?: string | Date;
  nextEvaluation?: string | Date;
}

interface ApiAIProgressResponse {
  success: boolean;
  data?: {
    aiProgress: ApiAIProgressData;
  };
  message?: string;
}

interface AIRecommendationsModalProps {
  clientId: string;
  _clientName: string;
  onClose: () => void;
  onRecommendationsGenerated?: (info?: { status: string; jobId?: string }) => void;
  // El padre notifica al modal cuándo la generación asíncrona terminó o falló
  generationStatus?: 'idle' | 'queued' | 'ready';
  generationError?: string | null;
}

interface EditingField {
  sessionId: string;
  type: 'summary' | 'vision' | 'checklistItem' | 'checklist' | 'week';
  itemId?: string;
  weekIndex?: number;
  category?: 'nutrition' | 'exercise' | 'habit';
  currentValue: string | ChecklistItem[] | AIRecommendationWeek;
}

type NewNutritionItemData = {
  description: string;
  type: string;
  frequency: number;
  recipeId: string;
  details: {
    recipe: {
      ingredients: Array<{ name: string; quantity: string; notes?: string }>;
      preparation: string;
      tips?: string;
    };
  };
  isRecurring?: boolean;
};

type NewExerciseItemData = {
  description: string;
  type: string;
  details?: {
    duration?: string;
    frequency?: string;
    equipment?: string[];
  };
  isRecurring?: boolean;
};

type NewHabitItemData = {
  description: string;
  type: 'toAdopt' | 'toEliminate';
  isRecurring?: boolean;
};

type NewItemData = NewNutritionItemData | NewExerciseItemData | NewHabitItemData;

interface ImportableAISessionData {
  summary?: string;
  vision?: string;
  weeks?: AIRecommendationWeek[] | unknown[];
  checklist?: ChecklistItem[] | unknown[];
  coachNotes?: string;
  monthNumber?: number;
  status?: 'draft' | 'approved' | 'sent';
  baselineMetrics?: {
    currentWeight?: number;
    targetWeight?: number;
    currentLifestyle?: string[];
    targetLifestyle?: string[];
  };
  // Campos adicionales que podrían estar presentes en JSON importado
  [key: string]: unknown;
}

// ===== COMPONENTE PRINCIPAL =====
export default function AIRecommendationsModal({
  clientId,
  _clientName,
  onClose,
  onRecommendationsGenerated,
  generationStatus = 'idle',
  generationError = null,
}: AIRecommendationsModalProps) {
  const { t } = useTranslation();
  const { showToast, ToastComponent } = useToast();
  // ===== ESTADOS PRINCIPALES =====
  const [aiProgress, setAiProgress] = useState<ClientAIProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  // Error mostrado dentro del modal (se limpia al cerrar o al iniciar nueva generación)
  const [displayError, setDisplayError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // ===== ESTADOS DE NAVEGACIÓN =====

  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([0]);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);

  // ===== ESTADOS DE FORMULARIOS =====
  const [showNewEvaluationForm, setShowNewEvaluationForm] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');

  // ===== ESTADOS DE EDICIÓN =====
  const [editMode, setEditMode] = useState(false);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editText, setEditText] = useState('');

  // ===== ESTADOS DE DETALLES EXPANDIDOS =====
  const [expandedShoppingLists, setExpandedShoppingLists] = useState<string[]>([]);
  const [expandedRecipes, setExpandedRecipes] = useState<string[]>([]);
  const [expandedExerciseDetails, setExpandedExerciseDetails] = useState<string[]>([]);
  const [footerExpanded, setFooterExpanded] = useState(false);

  // ===== REFERENCIA PARA SCROLL =====
  const modalContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== ESTADOS PARA MODALES DE EDICIÓN =====
  const [showRecipeSearch, setShowRecipeSearch] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [searchCategory, setSearchCategory] = useState<'nutrition' | 'exercise' | 'habit'>('nutrition');
  const [searchWeek, setSearchWeek] = useState<number>(1);
  const [searchDay, setSearchDay] = useState<string>('');
  const [searchMeal, setSearchMeal] = useState<string>('');
  const [addingAlternative, setAddingAlternative] = useState(false);
  const [newHabitType, setNewHabitType] = useState<'toAdopt' | 'toEliminate'>('toAdopt');
  const [editingItem, setEditingItem] = useState<{
    item: ChecklistItem;
    weekNumber: number;
    category: 'exercise' | 'habit';
  } | null>(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithDetails | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [exerciseCache, setExerciseCache] = useState<Record<string, Exercise>>({});
  const [recipeCache, setRecipeCache] = useState<Record<string, { title: string; image?: { url: string }; cookTime?: number }>>({});
  const [isMaximized, setIsMaximized] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aiModalMaximized') === 'true';
    }
    return false;
  });

  // Persist maximized state
  useEffect(() => {
    localStorage.setItem('aiModalMaximized', String(isMaximized));
  }, [isMaximized]);
  const [editingAIRecipe, setEditingAIRecipe] = useState<{
    item: ChecklistItem;
    weekNumber: number;
  } | null>(null);
  const [showAIRecipeEditModal, setShowAIRecipeEditModal] = useState(false);
  const [loadingShoppingList, setLoadingShoppingList] = useState<Record<number, boolean>>({});
  const [uploadingFile, setUploadingFile] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);

  // ===== ESTADOS DE VIDEOLlAMADA =====
  const [showSessionScheduler, setShowSessionScheduler] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [videoRoomName, setVideoRoomName] = useState<string>('');
  const [videoSessionId, setVideoSessionId] = useState<string>('');
  const [clientSessionLink, setClientSessionLink] = useState<string>('');
  const [schedulingSession, setSchedulingSession] = useState(false);

  // ===== FUNCIONES AUXILIARES =====
  const convertToNewStructure = useCallback((weeks: unknown[]): AIRecommendationWeek[] => {
    if (!weeks || !Array.isArray(weeks)) return [];

    return weeks.map((week: unknown, weekIndex: number) => {
      const typedWeek = week as Partial<AIRecommendationWeek>;

      // Caso 1: Ya tiene estructura nueva (sin checklistItems)
      if (typedWeek.nutrition && !('checklistItems' in typedWeek.nutrition)) {
        return {
          weekNumber: typedWeek.weekNumber || (weekIndex + 1) as AIRecommendationWeek['weekNumber'],
          nutrition: {
            focus: typedWeek.nutrition?.focus || 'Nutrición keto',
            shoppingList: typedWeek.nutrition?.shoppingList || [] // ¡Conservamos shoppingList!
          },
          exercise: {
            focus: typedWeek.exercise?.focus || 'Ejercicio adaptado',
            equipment: typedWeek.exercise?.equipment || []
          },
          habits: {
            trackingMethod: typedWeek.habits?.trackingMethod,
            motivationTip: typedWeek.habits?.motivationTip
          }
        };
      }

      // Caso 2: Estructura antigua, extraemos solo metadatos
      const oldWeek = week as OldWeekStructure;
      return {
        weekNumber: (oldWeek.weekNumber || (weekIndex + 1)) as AIRecommendationWeek['weekNumber'],
        nutrition: {
          focus: oldWeek.nutrition?.focus || 'Nutrición keto',
          shoppingList: [] // Las viejas no tienen shoppingList
        },
        exercise: {
          focus: oldWeek.exercise?.focus || oldWeek.exercise?.routine || 'Ejercicio adaptado',
          equipment: oldWeek.exercise?.equipment || []
        },
        habits: {
          trackingMethod: oldWeek.habits?.trackingMethod,
          motivationTip: oldWeek.habits?.motivationTip
        }
      };
    });
  }, []);;

  const convertApiDataToClientAIProgress = useCallback((apiData: ApiAIProgressData): ClientAIProgress | null => {
    if (!apiData.sessions || apiData.sessions.length === 0) return null;
    const sessions: AIRecommendationSession[] = apiData.sessions.map(session => {
      const createdAt = session.createdAt ? new Date(session.createdAt) : new Date();
      const updatedAt = session.updatedAt ? new Date(session.updatedAt) : createdAt;
      // Convertimos las semanas a la nueva estructura (sin checklistItems)
      const weeks = session.weeks ? convertToNewStructure(session.weeks) : [];
       return {
         sessionId: session.sessionId,
         monthNumber: session.monthNumber || 1,
         totalWeeks: (session as { totalWeeks?: number }).totalWeeks || 4,
         createdAt,
         updatedAt,
         status: session.status || 'draft',
         summary: session.summary || '',
         vision: session.vision || '',
         baselineMetrics: { currentLifestyle: [], targetLifestyle: [] },
         weeks,
         checklist: session.checklist || [],
         emailSent: false
       };
    });
    return {
      clientId: apiData.clientId || clientId,
      sessions,
      overallProgress: apiData.overallProgress || 0,
      metrics: apiData.metrics || { nutritionAdherence: 0, exerciseConsistency: 0, habitFormation: 0 },
      currentSessionId: apiData.currentSessionId,
      lastEvaluation: apiData.lastEvaluation ? new Date(apiData.lastEvaluation) : undefined,
      nextEvaluation: apiData.nextEvaluation ? new Date(apiData.nextEvaluation) : undefined
    };
  }, [clientId, convertToNewStructure]);

  // ===== CÁLCULOS Y MEMOS =====
  const activeSession = useMemo(() => {
    if (!aiProgress?.sessions || !activeSessionId) {
      if (aiProgress?.sessions && aiProgress.sessions.length > 0) {
        const firstSession = aiProgress.sessions[0];
        if (!activeSessionId) {
          setActiveSessionId(firstSession.sessionId);

        }
        return firstSession;
      }
      return null;
    }
    return aiProgress.sessions.find(s => s.sessionId === activeSessionId) || null;
  }, [aiProgress, activeSessionId]);

  const sessionTabs = useMemo(() => {
    if (!aiProgress?.sessions) return [];
    return aiProgress.sessions.map((session, index) => ({
      sessionId: session.sessionId,
      label: `Sesión ${index + 1}`,
      sessionNumber: index + 1,
      monthNumber: session.monthNumber,
      totalWeeks: session.totalWeeks || 4,
    }));
  }, [aiProgress]);

  const sessionMonths = useMemo(() => {
    if (!activeSession) return [];
    const months = [];
    if (activeSession.totalWeeks === 12) {
      // 12-week session: divide into 3 months
      for (let month = 1; month <= 3; month++) {
        const startWeek = (month - 1) * 4 + 1;
        const endWeek = month * 4;
        const weeks = activeSession.weeks
          .map((week, originalIndex) => ({ week, originalIndex }))
          .filter(({ week }) => week.weekNumber >= startWeek && week.weekNumber <= endWeek);
        months.push({
          monthNumber: month,
          label: `Mes ${month}`,
          weeks,
          startWeek,
          endWeek,
        });
      }
    } else {
      // 4-week session: single month
      const startWeek = activeSession.weeks[0]?.weekNumber || 1;
      const endWeek = activeSession.weeks[activeSession.weeks.length - 1]?.weekNumber || activeSession.weeks.length;
      months.push({
        monthNumber: activeSession.monthNumber,
        label: `Mes ${activeSession.monthNumber}`,
        weeks: activeSession.weeks.map((week, originalIndex) => ({ week, originalIndex })),
        startWeek,
        endWeek,
      });
    }
    return months;
  }, [activeSession]);



  // ===== MANEJADORES DE DATOS =====
  const loadAIProgress = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAIProgress(clientId) as ApiAIProgressResponse;
      if (response.success && response.data?.aiProgress) {
        const progress = convertApiDataToClientAIProgress(response.data.aiProgress);
        if (progress) {
          setAiProgress(progress);
          if (progress.sessions && progress.sessions.length > 0) {
            if (!activeSessionId && progress.currentSessionId) {
              setActiveSessionId(progress.currentSessionId);


            } else if (!activeSessionId) {
              setActiveSessionId(progress.sessions[0].sessionId);

            }
          }
        } else {
          setAiProgress(null);
        }
      } else {
        setAiProgress(null);
      }
    } catch {
      showToast(t('ai.errorGenerating'), 'error');
    } finally {
      setLoading(false);
    }
  }, [clientId, activeSessionId, convertApiDataToClientAIProgress]);

  // Load recipe images for nutrition items and alternatives
  useEffect(() => {
    if (!activeSession?.checklist) return;
    const nutritionItems = activeSession.checklist.filter(
      item => (item.category === 'nutrition') && item.recipeId
    );
    const recipeIds = [...new Set(nutritionItems.map(item => item.recipeId!))];
    for (const id of recipeIds) {
      if (recipeCache[id]) continue;
      apiClient.getRecipeById(id).then(res => {
        if (res.data) {
          setRecipeCache(prev => ({ ...prev, [id]: { title: res.data.title, image: res.data.image, cookTime: res.data.cookTime } }));
        }
      }).catch(() => {});
    }
  }, [activeSession?.sessionId]);

  const handleGenerateRecommendations = useCallback(async (monthNumber: number = 1) => {
    try {
      setGenerating(true);
      const response = await apiClient.generateAIRecommendations(clientId, monthNumber, false, coachNotes);
      if (response.success) {
        // Check if it's a queued response (202 from Inngest)
        const data = response.data as { status?: string; jobId?: string } | undefined;
        if (data?.status === 'queued') {
          // Inngest is processing - notify parent to start polling
          if (onRecommendationsGenerated) {
            (onRecommendationsGenerated as (info?: { status: string; jobId?: string }) => void)({
              status: 'queued',
              jobId: data.jobId,
            });
          }
        } else {
          // Synchronous response (fallback)
          await loadAIProgress();
          if (onRecommendationsGenerated) onRecommendationsGenerated();
          setCoachNotes('');
          setShowNewEvaluationForm(false);
        }
      } else {
        throw new Error(response.message);
      }
    } catch {
      showToast(t('ai.errorGenerating'), 'error');
      // En caso de error de red o del servidor, detener el estado "generando"
      setGenerating(false);
    }
    // No usamos finally para setGenerating(false) porque cuando la respuesta
    // es 'queued', el padre controla el estado generating vía generationStatus prop.
  }, [clientId, coachNotes, loadAIProgress, onRecommendationsGenerated]);

  // ===== EFECTOS =====
  useEffect(() => {
    loadAIProgress();
  }, [loadAIProgress]);

  // Reaccionar a cambios en generationStatus/generationError desde el padre
  useEffect(() => {
    if (generationStatus === 'queued') {
      setGenerating(true);
      setDisplayError(null);
    } else if (generationStatus === 'ready') {
      setGenerating(false);
      // Recargar datos de IA (el polling del padre ya encontró resultados o error)
      loadAIProgress();
    }
  }, [generationStatus, loadAIProgress]);

  // Mostrar error de generación cuando el padre lo notifica
  useEffect(() => {
    if (generationError) {
      setDisplayError(generationError);
      setGenerating(false);
    }
  }, [generationError]);

  // useEffect removed - month tabs replaced with session tabs
  // activeMonthTab now represents month within active session (1,2,3) for 12-week plans

  // Expand first month when session changes
  useEffect(() => {
    if (activeSession && sessionMonths.length > 0) {
      const firstMonthId = `${activeSession.sessionId}_month_${sessionMonths[0].monthNumber}`;
      setExpandedMonths(prev => prev.includes(firstMonthId) ? prev : [...prev, firstMonthId]);
    }
  }, [activeSession, sessionMonths]);

  // ===== MANEJADORES DE CHECKLIST (CON SINCRONIZACIÓN POST-OPERACIÓN) =====
  const handleChecklistChange = useCallback(async (sessionId: string, itemId: string, completed: boolean) => {
    if (!aiProgress) return;
    const sessionIndex = aiProgress.sessions.findIndex(s => s.sessionId === sessionId);
    if (sessionIndex === -1) return;
    const session = aiProgress.sessions[sessionIndex];

    const updatedChecklist = session.checklist.map(item =>
      item.id === itemId ? { ...item, completed, completedDate: completed ? new Date() : undefined, updatedAt: new Date() } : item
    );

    try {
      const response = await apiClient.updateSessionItems(clientId, sessionId, updatedChecklist);
      if (
        response.success &&
        response.data &&
        (response.data as { session?: AIRecommendationSession }).session
      ) {
        const sessionData = (response.data as { session: AIRecommendationSession }).session;
        setAiProgress(prev => {
          if (!prev) return prev;
          const sessions = prev.sessions.map(s =>
            s.sessionId === sessionId ? sessionData : s
          );
          return { ...prev, sessions };
        });
      } else {
        throw new Error(response.message || t('common.error'));
      }
    } catch {
      showToast(t('common.error'), 'error');
      await loadAIProgress();
    }
  }, [aiProgress, clientId, loadAIProgress]);

  const updateItemViaFullChecklist = useCallback(async (sessionId: string, updatedChecklist: ChecklistItem[]) => {
    console.log('updateItemViaFullChecklist - checklist recibido:', updatedChecklist.map(item => ({
      id: item.id,
      groupId: item.groupId,
      description: item.description,
      weekNumber: item.weekNumber
    })));
    if (!aiProgress) return;
    try {
      const response = await apiClient.updateSessionItems(clientId, sessionId, updatedChecklist);
      if (response.success && (response.data as { session?: AIRecommendationSession }).session) {
        const sessionData = (response.data as { session: AIRecommendationSession }).session;
        setAiProgress(prev => {
          if (!prev) return prev;
          const sessions = prev.sessions.map(s =>
            s.sessionId === sessionId ? sessionData : s
          );
          return { ...prev, sessions };
        });
        // ✅ FORZAR ACTUALIZACIÓN DE LAS SEMANAS EXPANDIDAS
        setExpandedWeeks(prev => [...prev]);
      } else {
        throw new Error(response.message || t('common.error'));
      }
    } catch {
      showToast(t('common.error'), 'error');
      await loadAIProgress();
    }
  }, [aiProgress, clientId, loadAIProgress]);

  // ===== MANEJADORES DE EDICIÓN =====
  const handleStartEdit = useCallback((
    sessionId: string,
    type: 'summary' | 'vision' | 'checklistItem' | 'checklist' | 'week',
    currentValue: string | ChecklistItem[] | AIRecommendationWeek,
    itemId?: string,
    weekIndex?: number,
    category?: 'nutrition' | 'exercise' | 'habit'
  ) => {
    setEditMode(true);
    setEditingField({ sessionId, type, itemId, weekIndex, category, currentValue });
    if (type === 'checklistItem' && itemId) {
      const item = activeSession?.checklist?.find(item => item.id === itemId);
      setEditText(item?.description || '');
    } else {
      setEditText(typeof currentValue === 'string' ? currentValue : '');
    }
  }, [activeSession]);

  const handleSaveEdit = useCallback(async () => {
    if (!editMode || !editingField || !aiProgress) return;

    try {
      // 1. Obtener la sesión directamente desde aiProgress
      const session = aiProgress.sessions.find(s => s.sessionId === editingField.sessionId);
      if (!session) {
        console.error('❌ Sesión no encontrada en aiProgress');
        return;
      }

      if (editingField.type === 'checklistItem' && editingField.itemId) {
        // 2. Buscar el ítem original en el checklist de la sesión
        const originalItem = session.checklist.find(item => item.id === editingField.itemId);
        if (!originalItem) {
          console.error('❌ Item no encontrado en checklist');
          return;
        }

        // 3. LOGS para depuración
        console.log('=== HANDLE_SAVE_EDIT ===');
        console.log('Grupo a actualizar:', originalItem.groupId);
        const groupItems = session.checklist.filter(item => item.groupId === originalItem.groupId);
        console.log('Items del grupo en sesión:', groupItems.map(i => ({ id: i.id, week: i.weekNumber, desc: i.description })));

        // 4. Construir nuevo checklist: todos los ítems del grupo con la nueva descripción
        const updatedChecklist = session.checklist.map(item => {
          if (originalItem.groupId && item.groupId === originalItem.groupId) {
            return {
              ...item,
              description: editText,
              updatedAt: new Date()
            };
          }
          return item;
        });

        // 5. Verificar cuántos se actualizaron
        const updatedGroupItems = updatedChecklist.filter(item => item.groupId === originalItem.groupId);
        console.log(`✅ Items actualizados (${updatedGroupItems.length}):`, updatedGroupItems.map(i => ({ week: i.weekNumber, desc: i.description })));

        // 6. Enviar al backend
        await updateItemViaFullChecklist(session.sessionId, updatedChecklist);
      }
      else if (editingField.type === 'summary' || editingField.type === 'vision') {
        const field = editingField.type;
        const value = editText;
        const response = await apiClient.updateAISessionFields(
          clientId,
          session.sessionId,
          { [field]: value }
        );
        if (response.success) {
          setAiProgress(prev => {
            if (!prev) return prev;
            const sessions = prev.sessions.map(s =>
              s.sessionId === session.sessionId
                ? { ...s, [field]: value }
                : s
            );
            return { ...prev, sessions };
          });
        } else {
          throw new Error(response.message);
        }
      }

      setEditMode(false);
      setEditingField(null);
      setEditText('');
    } catch (error) {
      console.error('💥 Error en handleSaveEdit:', error);
      showToast(t('common.error'), 'error');
    }
  }, [editMode, editingField, aiProgress, editText, clientId, updateItemViaFullChecklist]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    setEditingField(null);
    setEditText('');
    loadAIProgress();
  }, [loadAIProgress]);

  const handleUpdateShoppingList = useCallback(async (sessionId: string, weekNumber: number) => {
    try {
      setLoadingShoppingList(prev => ({ ...prev, [weekNumber]: true }));

      console.log('handleUpdateShoppingList llamada con', { sessionId, weekNumber });

      const response = await apiClient.updateAIShoppingList(clientId, sessionId, weekNumber);
      if (response.success) {
        await loadAIProgress(); // Recarga toda la data (incluyendo la lista actualizada)
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Error actualizando lista de compras', error);
      showToast(t('common.error'), 'error');
    } finally {
      setLoadingShoppingList(prev => ({ ...prev, [weekNumber]: false }));
    }
  }, [clientId, loadAIProgress]);

  const fetchRecipeAndOpenModal = useCallback(async (recipeId: string) => {
    try {
      const response = await apiClient.getRecipeById(recipeId);
      if (response.success) {
        // La respuesta ya viene desencriptada desde el backend
        setSelectedRecipe(response.data as RecipeWithDetails);
        setShowRecipeDetail(true);
      }
    } catch {
      console.error('Error fetching recipe');
    }
  }, []);

  const handleEditItemClick = useCallback((item: ChecklistItem) => {
    if (item.category === 'nutrition') {
      if (item.recipeId) {
        fetchRecipeAndOpenModal(item.recipeId);
      } else {
        setEditingAIRecipe({ item, weekNumber: item.weekNumber });
        setShowAIRecipeEditModal(true);
      }
    } else {
      setEditingItem({
        item,
        weekNumber: item.weekNumber,
        category: item.category as 'exercise' | 'habit'
      });
      setShowEditItemModal(true);
    }
  }, [fetchRecipeAndOpenModal]);

  const handleAddItem = useCallback((weekNumber: number, category: 'nutrition' | 'exercise' | 'habit') => {
    setSearchWeek(weekNumber);
    setSearchCategory(category);
    if (category === 'nutrition') {
      setShowRecipeSearch(true);
    } else {
      setShowEditItemModal(true);
    }
  }, []);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!activeSession || !aiProgress) return;
    const item = activeSession.checklist.find(i => i.id === itemId);
    if (!item) return;
    if (!confirm(t('common.confirmDelete'))) return;

    // Eliminar solo el ítem con ese ID (sin importar el grupo)
    const updatedChecklist = activeSession.checklist.filter(i => i.id !== itemId);

    try {
      const response = await apiClient.updateSessionItems(clientId, activeSession.sessionId, updatedChecklist);
      if (
        response.success &&
        response.data &&
        typeof response.data === 'object' &&
        response.data !== null &&
        'session' in response.data
      ) {
        const sessionData = (response.data as { session: AIRecommendationSession }).session;
        setAiProgress(prev => {
          if (!prev) return prev;
          const sessions = prev.sessions.map(s =>
            s.sessionId === activeSession.sessionId ? sessionData : s
          );
          return { ...prev, sessions };
        });
        setExpandedWeeks(prev => [...prev]); // Forzar actualización
      } else {
        throw new Error(response.message || t('common.error'));
      }
    } catch {
      showToast(t('common.error'), 'error');
      await loadAIProgress();
    }
  }, [activeSession, aiProgress, clientId, loadAIProgress]);

  const handleSaveNewItem = useCallback(async (data: NewItemData) => {
    if (!activeSession || !aiProgress) return;

    // Solo añadimos a la semana actual (searchWeek)
    const week = searchWeek;

    const newItemId = `item_${Date.now()}_${week}_${Math.random().toString(36).substr(2, 9)}`;
    let newItem: ChecklistItem;

    if (searchCategory === 'nutrition') {
      const nutritionData = data as NewNutritionItemData;
      newItem = {
        id: newItemId,
        groupId: undefined, // Sin grupo, para que sea individual
        description: nutritionData.description,
        completed: false,
        weekNumber: week,
        category: 'nutrition',
        type: nutritionData.type,
        frequency: nutritionData.frequency,
        recipeId: nutritionData.recipeId,
        details: {
          recipe: nutritionData.details.recipe,
        },
        isRecurring: addingAlternative, // true si es alternativa
        updatedAt: new Date(),
      };
    } else if (searchCategory === 'exercise') {
      const exerciseData = data as NewExerciseItemData;
      // Inherit searchDay into details.frequency if not provided
      const dayForItem = searchDay || exerciseData.details?.frequency;
      const descriptionWithDay = dayForItem && !exerciseData.description.startsWith(dayForItem)
        ? `${dayForItem}: ${exerciseData.description}`
        : exerciseData.description;
      newItem = {
        id: newItemId,
        groupId: undefined,
        description: descriptionWithDay,
        completed: false,
        weekNumber: week,
        category: 'exercise',
        type: exerciseData.type,
        details: {
          ...exerciseData.details,
          frequency: dayForItem || exerciseData.details?.frequency,
        },
        isRecurring: false,
        updatedAt: new Date(),
      };
    } else { // habit
      const habitData = data as NewHabitItemData;
      newItem = {
        id: newItemId,
        groupId: undefined,
        description: habitData.description,
        completed: false,
        weekNumber: week,
        category: 'habit',
        type: newHabitType || habitData.type || 'toAdopt',
        isRecurring: false,
        updatedAt: new Date(),
      };
    }

    console.log('🆕 Nuevo ítem individual a añadir:', { week: newItem.weekNumber, desc: newItem.description });

    const sessionIndex = aiProgress.sessions.findIndex(s => s.sessionId === activeSession.sessionId);
    if (sessionIndex === -1) return;
    const session = aiProgress.sessions[sessionIndex];

    const updatedChecklist = [...session.checklist, newItem];

    try {
      const response = await apiClient.updateSessionItems(clientId, activeSession.sessionId, updatedChecklist);
      if (
        response.success &&
        response.data &&
        typeof response.data === 'object' &&
        response.data !== null &&
        'session' in response.data
      ) {
        const sessionData = (response.data as { session: AIRecommendationSession }).session;
        setAiProgress(prev => {
          if (!prev) return prev;
          const sessions = prev.sessions.map(s =>
            s.sessionId === activeSession.sessionId ? sessionData : s
          );
          return { ...prev, sessions };
        });
        setExpandedWeeks(prev => [...prev]); // Forzar actualización
        setShowRecipeSearch(false);
        setShowEditItemModal(false);
        setAddingAlternative(false);
      } else {
        throw new Error(response.message || t('common.error'));
      }
    } catch {
      showToast(t('common.error'), 'error');
      await loadAIProgress();
      setAddingAlternative(false);
    }
  }, [activeSession, aiProgress, clientId, searchWeek, searchCategory, loadAIProgress, addingAlternative, newHabitType]);

  const handleUpdateItem = useCallback(async (
    itemId: string,
    data: NewExerciseItemData | NewHabitItemData,
    weekNumber: number,
    category: 'exercise' | 'habit'
  ) => {
    if (!activeSession || !aiProgress) return;

    const originalItem = activeSession.checklist.find(item => item.id === itemId);
    if (!originalItem) return;

    // Base del ítem actualizado (sin weekNumber ni id)
    const baseUpdates = {
      description: data.description,
      type: data.type,
      updatedAt: new Date(),
      ...(category === 'exercise' && { details: (data as NewExerciseItemData).details }),
      ...(category === 'habit' && { details: undefined }),
    };

    if (originalItem.groupId) {
      // Actualizar TODOS los ítems del grupo
      const updatedChecklist = activeSession.checklist.map(item => {
        if (item.groupId === originalItem.groupId) {
          return { ...item, ...baseUpdates };
        }
        return item;
      });
      await updateItemViaFullChecklist(activeSession.sessionId, updatedChecklist);
    } else {
      // Actualizar solo ese ítem
      const updatedChecklist = activeSession.checklist.map(item =>
        item.id === itemId ? { ...item, ...baseUpdates } : item
      );
      await updateItemViaFullChecklist(activeSession.sessionId, updatedChecklist);
    }

    setShowEditItemModal(false);
    setEditingItem(null);
  }, [activeSession, aiProgress, updateItemViaFullChecklist]);

  const handleSaveAIRecipe = useCallback(async (data: AIRecipeData) => {
    if (!activeSession || !editingAIRecipe) return;

    const originalItem = editingAIRecipe.item;

    // Si tiene grupo, actualizar TODOS los ítems del grupo (cada uno con su weekNumber)
    if (originalItem.groupId) {
      const updatedChecklist = activeSession.checklist.map(item => {
        // Si el ítem pertenece al grupo, crear una copia actualizada
        if (item.groupId === originalItem.groupId) {
          return {
            ...item, // conserva id, weekNumber, etc.
            description: data.description,
            type: data.type,
            frequency: data.frequency,
            details: {
              recipe: data.details.recipe,
            },
            updatedAt: new Date(),
          };
        }
        // Si no es del grupo, lo dejamos igual
        return item;
      });

      await updateItemViaFullChecklist(activeSession.sessionId, updatedChecklist);
    } else {
      // Si no tiene grupo, actualizar solo ese ítem
      const updatedChecklist = activeSession.checklist.map(item =>
        item.id === originalItem.id
          ? {
              ...item,
              description: data.description,
              type: data.type,
              frequency: data.frequency,
              details: {
                recipe: data.details.recipe,
              },
              updatedAt: new Date(),
            }
          : item
      );
      await updateItemViaFullChecklist(activeSession.sessionId, updatedChecklist);
    }

    setShowAIRecipeEditModal(false);
    setEditingAIRecipe(null);
  }, [activeSession, editingAIRecipe, updateItemViaFullChecklist]);

  // ===== MANEJADORES DE ACCIONES =====
  const handleApproveSession = useCallback(async (sessionId: string) => {
    try {
      await apiClient.approveAISession(clientId, sessionId);
      await loadAIProgress();
    } catch (e) {
      showToast((e as Error).message || 'Error', 'error');
    }
  }, [clientId, loadAIProgress]);

  const handleRegenerate = useCallback(async () => {
    if (!activeSession) return;
    setLoading(true);
    const notes = prompt('Notas para la regeneración (opcional):', '');
    try {
      await apiClient.regenerateAISession(clientId, activeSession.sessionId, notes || '');
      await loadAIProgress();
    } catch (e) {
      showToast((e as Error).message || 'Error', 'error');
      setLoading(false);
    }
  }, [activeSession, clientId, loadAIProgress]);

  const handleSendToClient = useCallback(async (sessionId: string) => {
    try {
      await apiClient.sendAISessionToClient(clientId, sessionId);
      await loadAIProgress();
      showToast(t('common.success'), 'success');
    } catch (e) {
      showToast((e as Error).message || 'Error', 'error');
    }
  }, [clientId, loadAIProgress]);

  // ===== HANDLERS DE VIDEOLlAMADA =====

  /**
   * Abre el modal para agendar una nueva videollamada.
   * Solo disponible cuando hay una sesión activa enviada al cliente.
   */
  const handleOpenScheduler = useCallback(() => {
    setShowSessionScheduler(true);
  }, []);

  /**
   * Callback cuando el SessionScheduler creó exitosamente la sala.
   * Pregunta si se quiere unirse ahora o después.
   */
  const handleSessionCreated = useCallback(
    (data: { roomName: string; sessionId: string; sessionNumber: number }): void => {
      setShowSessionScheduler(false);
      setVideoRoomName(data.roomName);
      setVideoSessionId(data.sessionId);
      // Opcional: generar enlace para el cliente automáticamente
      generateClientJoinLink(data.sessionId);
      // Preguntar si quiere unirse ahora
      const joinNow = window.confirm(
        `Sesión #${data.sessionNumber} agendada exitosamente.\n\n¿Deseas unirte a la videollamada ahora?`
      );
      if (joinNow) {
        setShowVideoCall(true);
      }
    },
    []
  );

  /**
   * Genera el enlace con token temporal para que el cliente acceda a la sala.
   */
  const generateClientJoinLink = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/video/session-link`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ clientId, sessionId }),
          }
        );

        if (response.ok) {
          const data = (await response.json()) as {
            success: boolean;
            data: { joinLink: string };
          };
          setClientSessionLink(data.data.joinLink);
        }
      } catch (err: unknown) {
        console.error('Error generating client join link:', err);
      }
    },
    [clientId]
  );

  /**
   * Abre la videollamada directamente (si hay una sala creada).
   */
  const handleJoinVideoCall = useCallback(() => {
    setShowVideoCall(true);
  }, []);

  /**
   * Cierra el modal de videollamada.
   */
  const handleCloseVideoCall = useCallback(() => {
    setShowVideoCall(false);
    // Recargar para reflejar el estado 'completed'
    loadAIProgress();
  }, [loadAIProgress]);

  /**
   * Copia el enlace del cliente al portapapeles.
   */
  const handleCopyClientLink = useCallback(async () => {
    if (clientSessionLink) {
      try {
        await navigator.clipboard.writeText(clientSessionLink);
        showToast('Enlace copiado al portapapeles. Pégalo en un email para el cliente.', 'success');
      } catch {
        showToast('No se pudo copiar el enlace. Copia manualmente:\n' + clientSessionLink, 'error');
      }
    }
  }, [clientSessionLink]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadingFile(true);
    setUploadError(null);

    // Validar tamaño del archivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande (máximo 5MB)');
      setUploadingFile(false);
      return;
    }

    // Validar extensión del archivo
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const supportedExtensions = ['txt', 'json', 'doc', 'docx', 'pdf'];
    if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
      setUploadError(`Formato de archivo no soportado. Formatos permitidos: ${supportedExtensions.join(', ')}`);
      setUploadingFile(false);
      return;
    }

    try {
      let text: string;
      const isTextFile = fileExtension === 'txt' || fileExtension === 'json';
      const isDocumentFile = fileExtension === 'doc' || fileExtension === 'docx' || fileExtension === 'pdf';

      console.log('Archivo subido:', { name: file.name, size: file.size, type: file.type, fileExtension, isTextFile, isDocumentFile });

      // Determinar si necesitamos extraer texto del documento
      if (isDocumentFile) {
        // Llamar al endpoint de extracción de texto para DOC/DOCX/PDF
        console.log('Extrayendo texto del documento...');
        try {
          const extractionResponse = await apiClient.extractTextFromFile(file);
          if (!extractionResponse.success) {
            throw new Error(extractionResponse.message || 'Error extrayendo texto del documento');
          }
          text = extractionResponse.data.extractedText;
          console.log('Texto extraído:', { length: text.length, preview: text.substring(0, 200) });
        } catch (extractionError: unknown) {
          console.error('Error en extracción de texto:', extractionError);
          const errorMessage = extractionError instanceof Error ? extractionError.message : String(extractionError);
          throw new Error(`No se pudo extraer texto del archivo ${file.name}. Asegúrate de que sea un documento válido. Detalles: ${errorMessage}`);
        }
      } else {
        // Para .txt y .json, usar file.text()
        text = await file.text();
      }

      let sessionData: ImportableAISessionData;

      // Intentar parsear como JSON si es .json o si el contenido parece JSON
      if (fileExtension === 'json' || text.trim().startsWith('{')) {
        try {
          sessionData = JSON.parse(text) as ImportableAISessionData;
          console.log('JSON parseado exitosamente:', sessionData);
        } catch (jsonError: unknown) {
          console.error('Error parseando JSON:', jsonError);
          throw new Error('El archivo JSON tiene formato inválido');
        }
      } else {
        // Texto plano: crear estructura básica
        console.log('Procesando como texto plano');
        sessionData = {
          summary: text.substring(0, 1000), // Limitar longitud
          vision: 'Plan personalizado importado desde archivo',
          weeks: [],
          checklist: [],
          coachNotes: `Archivo importado: ${file.name}`
        };
      }

      // Validar estructura mínima
      if (!sessionData.summary || typeof sessionData.summary !== 'string') {
        sessionData.summary = sessionData.summary || 'Resumen importado';
      }
      if (!sessionData.vision || typeof sessionData.vision !== 'string') {
        sessionData.vision = sessionData.vision || 'Visión importada';
      }
      sessionData.weeks = sessionData.weeks || [];
      sessionData.checklist = sessionData.checklist || [];

      // Determinar monthNumber: si no hay sesiones, usar 1
      const monthNumber = 1; // Siempre primera sesión cuando no hay sesiones existentes

      console.log('Enviando datos de sesión a API:', { monthNumber, sessionData });

      // Llamar al endpoint de importación
      const response = await apiClient.importAISession(clientId, sessionData, monthNumber);

      if (response.success) {
        console.log('✅ Sesión importada exitosamente:', response);
        // Recargar progreso de IA para reflejar la nueva sesión
        await loadAIProgress();
        setUploadError(null);
        // Opcional: cerrar el modal o mostrar mensaje de éxito
        showToast(t('ai.sessionImported'), 'success');
      } else {
        throw new Error(response.message || 'Error desconocido al importar sesión');
      }

    } catch (error: unknown) {
      console.error('Error subiendo archivo:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setUploadError(errorMessage || 'Error procesando el archivo');
      showToast(t('ai.sessionImportError', { error: errorMessage || '' }), 'error');
    } finally {
      setUploadingFile(false);
    }
  }, [clientId, loadAIProgress]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    // reset input to allow same file again
    e.target.value = '';
  }, [handleFileUpload]);

  // ===== MANEJADORES DE UI =====
  const handleChangeMonthTab = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const toggleWeekExpansion = useCallback((weekIndex: number) => {
    setExpandedWeeks(prev => prev.includes(weekIndex) ? prev.filter(w => w !== weekIndex) : [...prev, weekIndex]);
  }, []);

  const toggleAllWeeks = useCallback(() => {
    if (!activeSession) return;
    const weekCount = activeSession.weeks.length;
    setExpandedWeeks(prev => prev.length === weekCount ? [] : Array.from({ length: weekCount }, (_, i) => i));
  }, [activeSession]);

  const toggleMonthExpansion = useCallback((monthId: string) => {
    setExpandedMonths(prev => prev.includes(monthId) ? prev.filter(id => id !== monthId) : [...prev, monthId]);
  }, []);

  const toggleAllMonths = useCallback(() => {
    if (!activeSession) return;
    const monthIds = sessionMonths.map(month => `${activeSession.sessionId}_month_${month.monthNumber}`);
    setExpandedMonths(prev => prev.length === monthIds.length ? [] : monthIds);
  }, [activeSession, sessionMonths]);

  const toggleShoppingList = useCallback(async (weekId: string, weekNumber: number, sessionId: string) => {

    const isExpanding = !expandedShoppingLists.includes(weekId);

    console.log('toggleShoppingList', { weekId, weekNumber, sessionId, isExpanding: !expandedShoppingLists.includes(weekId) });

    // Actualizar el estado de expansión
    setExpandedShoppingLists(prev =>
      prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId]
    );

    // Si se está expandiendo y la lista está vacía, generar automáticamente
    if (isExpanding && activeSession) {
      const week = activeSession.weeks.find(w => w.weekNumber === weekNumber);
      if (week && week.nutrition.shoppingList.length === 0) {
        try {
          setLoadingShoppingList(prev => ({ ...prev, [weekNumber]: true }));
          await handleUpdateShoppingList(sessionId, weekNumber);
        } catch (error) {
          console.error('Error generando lista automática', error);
          showToast(t('ai.shoppingListError'), 'error');
        } finally {
          setLoadingShoppingList(prev => ({ ...prev, [weekNumber]: false }));
        }
      }
    }
  }, [expandedShoppingLists, activeSession, handleUpdateShoppingList]);

  const toggleRecipeExpansion = useCallback((itemId: string) => {
    setExpandedRecipes(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  }, []);

  const toggleExerciseDetailsExpansion = useCallback((itemId: string) => {
    setExpandedExerciseDetails(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  }, []);

  // ===== RENDERIZADORES =====
  const renderChecklistItem = useCallback((item: ChecklistItem, sessionId: string) => {
    const isChecked = item.completed;
    const isRecipeExpanded = expandedRecipes.includes(item.id);
    const isExerciseDetailsExpanded = expandedExerciseDetails.includes(item.id);
    const handleCheckboxClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      await handleChecklistChange(sessionId, item.id, !isChecked);
    };

    return (
      <div key={item.id} className="flex items-start py-2 border-b border-gray-100 last:border-0 group relative">
        <div onClick={handleCheckboxClick} className={`mt-1 mr-3 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${isChecked ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300 hover:border-green-400'}`}>
          {isChecked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            {item.category === 'nutrition' && (
              <>
                <OriginPin origin={item.recipeId ? 'db' : 'ai'} />
                {item.frequency && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {item.frequency} {item.frequency === 1 ? 'vez' : 'veces'}/semana
                  </span>
                )}
              </>
            )}
          </div>
          {editMode && editingField?.type === 'checklistItem' && editingField?.itemId === item.id ? (
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              autoFocus
              className="w-full px-2 py-1 border border-green-300 rounded text-gray-700"
            />
          ) : (
            <span
              className={`${isChecked ? 'line-through text-gray-500' : 'text-gray-700'} break-words`}
              onClick={handleCheckboxClick}
            >
              {item.description}
            </span>
          )}
          {item.details?.recipe && (
            <div className="mt-2 ml-6 pl-2 border-l-2 border-green-200">
              <button
                onClick={() => toggleRecipeExpansion(item.id)}
                className="text-sm text-green-600 hover:text-green-800 flex items-center mb-1"
              >
                {isRecipeExpanded ? (
                  <><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Ocultar receta</>
                ) : (
                  <><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Ver receta completa</>
                )}
              </button>
              {isRecipeExpanded && (
                <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h5 className="font-medium text-yellow-700 mb-2">📝 Receta:</h5>
                  {item.details.recipe.ingredients && (
                    <div className="mb-3">
                      <h6 className="text-sm font-medium text-gray-700 mb-1">Ingredientes:</h6>
                      <ul className="space-y-1">
                        {item.details.recipe.ingredients.map((ingredient, idx) => (
                          <li key={idx} className="text-sm text-gray-600 break-words">
                            <span className="font-medium">{ingredient.name}</span>: {ingredient.quantity}
                            {ingredient.notes && <span className="text-gray-700 text-xs ml-2">({ingredient.notes})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {item.details.recipe.preparation && (
                    <div className="mb-3">
                      <h6 className="text-sm font-medium text-gray-700 mb-1">Preparación:</h6>
                      <p className="text-sm text-gray-600 whitespace-pre-line break-words text-justify">{item.details.recipe.preparation}</p>
                    </div>
                  )}
                  {item.details.recipe.tips && (
                    <div>
                      <h6 className="text-sm font-medium text-gray-700 mb-1">💡 Consejo:</h6>
                      <p className="text-sm text-gray-600 break-words text-justify">{item.details.recipe.tips}</p>
                    </div>
                  )}
                  {(item.details.macros || item.details.calories || item.details.metabolicPurpose) && (
                    <div className="mt-3 pt-3 border-t border-yellow-300">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">📊 Información Nutricional:</h6>
                      {item.details.macros && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Macros:</span>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {item.details.macros.protein && <span className="text-sm text-gray-600">Proteína: {item.details.macros.protein}</span>}
                            {item.details.macros.fat && <span className="text-sm text-gray-600">Grasas: {item.details.macros.fat}</span>}
                            {item.details.macros.carbs && <span className="text-sm text-gray-600">Carbos: {item.details.macros.carbs}</span>}
                            {item.details.macros.ratio && <span className="text-sm text-gray-600 col-span-2">Ratio: {item.details.macros.ratio}</span>}
                          </div>
                        </div>
                      )}
                      {item.details.calories && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Calorías:</span>
                          <span className="text-sm text-gray-600 ml-2">{item.details.calories} kcal</span>
                        </div>
                      )}
                      {item.details.metabolicPurpose && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Propósito metabólico:</span>
                          <p className="text-sm text-gray-600 mt-1">{item.details.metabolicPurpose}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {item.category === 'exercise' && item.details && (
            <div className="mt-2 ml-4 md:ml-6 pl-3 border-l-2 border-blue-200">
              <button
                onClick={() => toggleExerciseDetailsExpansion(item.id)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center mb-2 font-medium"
              >
                <svg className={`w-4 h-4 mr-1 transition-transform ${isExerciseDetailsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                {isExerciseDetailsExpanded ? 'Ocultar detalles' : 'Ver detalles del ejercicio'}
              </button>
              {isExerciseDetailsExpanded && (
                <div className="mt-2 p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                  <div className="space-y-3">
                    {item.details.frequency && (
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 w-28"><span className="mr-2 text-base">🕒</span> Frecuencia:</span>
                        <span className="sm:ml-2 mt-1 sm:mt-0 break-words flex-1">{item.details.frequency}</span>
                      </div>
                    )}
                    {item.details.duration && (
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 w-28"><span className="mr-2 text-base">⏱️</span> Duración:</span>
                        <span className="sm:ml-2 mt-1 sm:mt-0 break-words flex-1">{item.details.duration}</span>
                      </div>
                    )}
                    {(item.details.sets || item.details.repetitions || item.details.timeUnderTension || item.details.progression) && (
                      <div className="text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 mb-2"><span className="mr-2 text-base">🏋️</span> Detalles de ejercicio:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6 sm:ml-8">
                          {item.details.sets && (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-gray-600">Series</span>
                              <span className="text-sm text-gray-800">{item.details.sets}</span>
                            </div>
                          )}
                          {item.details.repetitions && (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-gray-600">Repeticiones</span>
                              <span className="text-sm text-gray-800">{item.details.repetitions}</span>
                            </div>
                          )}
                          {item.details.timeUnderTension && (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-gray-600">Tiempo bajo tensión</span>
                              <span className="text-sm text-gray-800">{item.details.timeUnderTension}</span>
                            </div>
                          )}
                          {item.details.progression && (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-gray-600">Progresión</span>
                              <span className="text-sm text-gray-800">{item.details.progression}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {item.details.equipment && item.details.equipment.length > 0 && (
                      <div className="text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 mb-2"><span className="mr-2 text-base">🎽</span> Equipo necesario:</span>
                        <div className="flex flex-wrap gap-2 ml-6 sm:ml-8">
                          {item.details.equipment.map((equipment, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-white rounded-full text-xs sm:text-sm border border-blue-200 shadow-sm break-words">
                              {equipment}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 flex space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 bg-white/80 md:bg-white pl-2 rounded-l-lg">
          <button
            onClick={(e) => { e.stopPropagation(); handleEditItemClick(item); }}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            title="Eliminar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    );
  }, [editMode, editingField, editText, handleChecklistChange, handleSaveEdit, expandedRecipes, expandedExerciseDetails, toggleRecipeExpansion, toggleExerciseDetailsExpansion, handleEditItemClick, handleDeleteItem]);

  const renderWeek = useCallback((week: AIRecommendationWeek, weekIndex: number, sessionId: string, session: AIRecommendationSession) => {
    const weekNumber = week.weekNumber;
    const isExpanded = expandedWeeks.includes(weekIndex);
    const weekId = `${sessionId}_week_${weekIndex}`;

    const nutritionItems = session.checklist.filter(
      item => item.weekNumber === weekNumber && item.category === 'nutrition'
    );
    const exerciseItems = session.checklist.filter(
      item => item.weekNumber === weekNumber && item.category === 'exercise'
    );
    const habitItems = session.checklist.filter(
      item => item.weekNumber === weekNumber && item.category === 'habit'
    );

    const totalWeekItems = nutritionItems.length + exerciseItems.length + habitItems.length;
    const completedWeekItems =
      nutritionItems.filter(i => i.completed).length +
      exerciseItems.filter(i => i.completed).length +
      habitItems.filter(i => i.completed).length;
    const weekProgress = totalWeekItems > 0 ? Math.round((completedWeekItems / totalWeekItems) * 100) : 0;

    return (
      <div key={weekIndex} className="bg-white rounded-xl border border-green-200 mb-4 overflow-hidden">
        <div className="p-3 md:p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 cursor-pointer hover:from-green-100 transition-colors" onClick={() => toggleWeekExpansion(weekIndex)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-bold text-green-700">Semana {week.weekNumber}</h3>
              <div className="flex items-center gap-1">
                <div className="w-16 md:w-24 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${weekProgress}%` }}></div>
                </div>
                <span className="text-xs md:text-sm text-gray-600">{weekProgress}%</span>
              </div>
            </div>
            <button className="text-green-600 p-1 hover:bg-green-200 rounded-full transition-colors" aria-label={isExpanded ? 'Contraer semana' : 'Expandir semana'}>
              <svg className={`w-5 h-5 md:w-6 md:h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 md:p-6 space-y-6">
            {/* Nutrición */}
            <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h4 className="font-bold text-green-700 flex items-center text-base md:text-lg">
                  <span className="mr-2">🍽️</span>
                  Nutrición: {week.nutrition.focus}
                </h4>
                <button
                  onClick={() => toggleShoppingList(weekId, week.weekNumber, session.sessionId)}
                  className="text-xs text-green-600 hover:text-green-800 bg-white px-3 py-2 rounded-full shadow-sm w-full sm:w-auto text-center"
                  disabled={loadingShoppingList[week.weekNumber]}
                >
                  {loadingShoppingList[week.weekNumber] ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generando...
                    </span>
                  ) : (
                    expandedShoppingLists.includes(weekId) ? '▲ Ocultar compras' : '▼ Ver lista de compras'
                  )}
                </button>
              </div>

              <div className="space-y-2">
                {nutritionItems.map(item => renderChecklistItem(item, sessionId))}
              </div>

              {!editMode && session.status === 'draft' && (
                <div className="mt-2">
                  <button
                    onClick={() => handleAddItem(week.weekNumber, 'nutrition')}
                    className="w-full sm:w-auto px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium flex items-center justify-center sm:inline-flex"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar nuevo ítem de nutrición
                  </button>
                </div>
              )}

              {expandedShoppingLists.includes(weekId) && (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h5 className="font-medium text-emerald-700 flex items-center text-base">
                      <span className="mr-2">🛒</span>
                      Lista de Compras - Semana {week.weekNumber}
                    </h5>
                    {session.status === 'draft' && (
                      <button
                        onClick={() => handleUpdateShoppingList(session.sessionId, week.weekNumber)}
                        disabled={loadingShoppingList[week.weekNumber]}
                        className={`text-xs px-3 py-2 rounded-full transition-colors w-full sm:w-auto ${
                          loadingShoppingList[week.weekNumber]
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {loadingShoppingList[week.weekNumber] ? 'Actualizando...' : 'Actualizar'}
                      </button>
                    )}
                  </div>

                  {week.nutrition.shoppingList.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">
                      {loadingShoppingList[week.weekNumber]
                        ? 'Generando lista...'
                        : 'No hay productos en la lista. Presiona "Actualizar" para generarla.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {week.nutrition.shoppingList.map((shopItem, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr,auto] items-start gap-1 p-2 bg-white rounded-lg border border-emerald-100">
                          <span className="text-sm text-gray-700 break-words">{shopItem.item}</span>
                          <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full text-left sm:text-right justify-self-start sm:justify-self-end break-words max-w-full">
                            {shopItem.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ejercicio */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-bold text-blue-700 flex items-center text-base md:text-lg">
                <span className="mr-2">🏋️</span>
                Ejercicio: {week.exercise.focus}
              </h4>
              <div className="space-y-2">
                {exerciseItems.map(item => renderChecklistItem(item, sessionId))}
              </div>
              {!editMode && session.status === 'draft' && (
                <div className="mt-2">
                  <button
                    onClick={() => handleAddItem(week.weekNumber, 'exercise')}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center justify-center sm:inline-flex"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar nuevo ítem de ejercicio
                  </button>
                </div>
              )}
            </div>

            {/* Hábitos */}
            <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h4 className="font-bold text-purple-700 flex items-center text-base md:text-lg">
                <span className="mr-2">🌟</span>
                Hábitos
              </h4>
              <div className="space-y-2">
                {habitItems.map(item => renderChecklistItem(item, sessionId))}
              </div>
              {!editMode && session.status === 'draft' && (
                <div className="mt-2">
                  <button
                    onClick={() => handleAddItem(week.weekNumber, 'habit')}
                    className="w-full sm:w-auto px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium flex items-center justify-center sm:inline-flex"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar nuevo ítem de hábitos
                  </button>
                </div>
              )}
              {week.habits.motivationTip && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-sm text-purple-700 text-justify"><span className="font-medium">💡 Consejo motivacional:</span> {week.habits.motivationTip}</p>
                </div>
              )}
              {week.habits.trackingMethod && (
                 <p className="text-xs text-gray-700 mt-2">📋 <span className="font-medium">Método de seguimiento:</span> {week.habits.trackingMethod}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [expandedWeeks, expandedShoppingLists, loadingShoppingList, editMode, toggleWeekExpansion, toggleShoppingList, renderChecklistItem, handleAddItem, handleUpdateShoppingList]);

  // ===== RENDERIZADO CONDICIONAL =====
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div><p className="mt-4 text-gray-600">Cargando recomendaciones...</p></div>
      </div>
    );
  }

  const activeSessionNumber = aiProgress?.sessions && activeSessionId
    ? aiProgress.sessions.findIndex(s => s.sessionId === activeSessionId) + 1
    : 0;

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${
        isMaximized ? 'p-0 overflow-hidden' : 'p-4 overflow-y-auto'
      }`}>
      <div className={`bg-white shadow-2xl flex flex-col border border-green-200 ${
        isMaximized
          ? 'fixed inset-2 rounded-xl'
          : 'rounded-xl w-full max-w-6xl my-8 max-h-[90vh]'
      }`}>
        <div className="p-4 md:p-6 border-b border-green-200 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 pr-4">
              <div className="flex items-center mb-2">
                <svg className="w-6 h-6 md:w-8 md:h-8 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                <div className="flex-1"><h2 className="text-xl md:text-2xl font-bold">Recomendaciones de IA</h2></div>
              </div>
            </div>
            <div className="hidden md:flex items-center">
              {isMaximized ? (
                <button onClick={() => setIsMaximized(false)} className="text-white hover:text-green-200 p-2 rounded-full hover:bg-green-700 transition-colors flex-shrink-0" title="Minimizar">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
                </button>
              ) : (
                <button onClick={() => setIsMaximized(true)} className="text-white hover:text-green-200 p-2 rounded-full hover:bg-green-700 transition-colors flex-shrink-0" title="Maximizar">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
              )}
            </div>
            <button onClick={onClose} className="text-white hover:text-green-200 p-2 rounded-full hover:bg-green-700 transition-colors flex-shrink-0 ml-2 -mt-2 -mr-2 md:mt-0 md:mr-0 mb-2 md:mb-0" title="Cerrar"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>

        {/* Banner de estado: Generando... o Error */}
        {generating && (
          <div className="bg-blue-50 border border-blue-200 rounded-none px-6 py-4">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-700 font-medium">Generando recomendaciones personalizadas con IA... Esto puede tomar hasta 2 minutos.</span>
            </div>
            <p className="text-blue-500 text-sm mt-1 ml-8">La IA está analizando los datos del cliente, planificando nutrición, ejercicio y hábitos. No cierres esta ventana.</p>
          </div>
        )}

        {displayError && !generating && (
          <div className="bg-red-50 border border-red-200 rounded-none px-6 py-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 font-medium">Error al generar recomendaciones</p>
                <p className="text-red-600 text-sm mt-1">{displayError}</p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => {
                      setDisplayError(null);
                      handleGenerateRecommendations(aiProgress ? aiProgress.sessions.length + 1 : 1);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    🔄 Reintentar
                  </button>
                  <button
                    onClick={() => setDisplayError(null)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                  >
                    Cerrar
                  </button>
                </div>
                <p className="text-red-400 text-xs mt-2">Si el error persiste, notifica al equipo de desarrollo.</p>
              </div>
            </div>
          </div>
        )}

        {activeSession?.sessionId?.startsWith('fallback_') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center"><svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg><span className="text-yellow-700 font-medium">⚠️ Modo offline: Recomendaciones generadas localmente</span></div>
            <p className="text-yellow-600 text-sm mt-1">Para obtener recomendaciones personalizadas con IA, verifica tu cuenta de DeepSeek.</p>
          </div>
        )}

        {aiProgress && aiProgress.sessions.length > 0 && (
          <div className="border-b border-green-200 bg-white">
            <div className="flex space-x-1 px-6 overflow-x-auto">
               {sessionTabs.map(tab => {
                 const session = aiProgress.sessions.find(s => s.sessionId === tab.sessionId);
                 if (!session) return null;
                 const isActive = activeSessionId === tab.sessionId;
                 return (
                   <button
                     key={`${tab.sessionId}`}
                      onClick={() => handleChangeMonthTab(tab.sessionId)}
                     className={`py-4 px-6 font-medium border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-green-600'}`}
                   >
                     {tab.label}
                     <span className={`ml-2 text-xs px-2 py-1 rounded-full ${session.status === 'approved' ? 'bg-green-100 text-green-800' : session.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                       {session.status === 'draft' ? 'Borrador' : session.status === 'approved' ? 'Aprobado' : 'Enviado'}
                     </span>
                   </button>
                 );
               })}
            </div>
          </div>
        )}

        <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 bg-green-50">
          {!aiProgress || aiProgress.sessions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-green-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No hay recomendaciones generadas</h3>
              <p className="text-gray-600 mb-6">Comienza generando las primeras recomendaciones para este cliente</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setShowNewEvaluationForm(true)} className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 transition-colors font-medium text-lg">Generar Primera Evaluación</button>
                <button onClick={triggerFileInput} disabled={uploadingFile} className="bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploadingFile ? 'Subiendo...' : 'Subir Archivo de Recomendaciones'}
                </button>
              </div>
              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">Error: {uploadError}</p>
                </div>
              )}
                <p className="text-gray-700 text-sm mt-4">Formatos aceptados: .txt (texto plano), .json (estructura de sesión AI), .doc/.docx (documento Word) o .pdf (documento PDF)</p>
            </div>
          ) : !activeSession ? (
             <div className="text-center py-12"><p className="text-gray-600">No se encontró la sesión seleccionada</p></div>
          ) : (
            <div className="space-y-6">

              {/* Resumen y Visión */}
              <div className="bg-white rounded-xl p-4 md:p-6 border border-green-200">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  {/* Resumen */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700 flex items-center text-sm md:text-base">
                        <span className="mr-2">🔍</span>
                        Resumen del Estado Actual
                      </h4>
                      {!editMode && activeSession.status === 'draft' && (
                        <button
                          onClick={() => handleStartEdit(activeSession.sessionId, 'summary', activeSession.summary)}
                          className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50 transition-colors"
                          title="Editar resumen"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div>
                      {editMode && editingField?.type === 'summary' ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            rows={4}
                            autoFocus
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                      <p className="text-sm md:text-base text-gray-900 whitespace-pre-line leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-100">
                        {activeSession.summary}
                      </p>
                      )}
                    </div>
                  </div>
                  {/* Visión */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700 flex items-center text-sm md:text-base">
                        <span className="mr-2">🎯</span>
                        Visión para el siguiente mes
                      </h4>
                      {!editMode && activeSession.status === 'draft' && (
                        <button
                          onClick={() => handleStartEdit(activeSession.sessionId, 'vision', activeSession.vision)}
                          className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50 transition-colors"
                          title="Editar visión"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div>
                      {editMode && editingField?.type === 'vision' ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            rows={4}
                            autoFocus
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm md:text-base text-gray-900 whitespace-pre-line leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-100">
                          {activeSession.vision}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* === 4 ACORDEONES: Nutrición, Ejercicios, Hábitos, Checklist === */}

              {/* 🟢 NUTRICIÓN */}
              <div className="bg-white rounded-xl border border-green-300 overflow-hidden">
                <div
                  className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white cursor-pointer hover:from-green-700 transition-colors flex justify-between items-center"
                  onClick={() => {
                    const key = 'accordion-nutrition';
                    setExpandedMonths(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
                  }}
                >
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span>🥗</span> Plan de Nutrición
                  </h3>
                  <svg className={`w-6 h-6 transform transition-transform ${expandedMonths.includes('accordion-nutrition') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedMonths.includes('accordion-nutrition') && activeSession.weeks.length > 0 && (
                  <div className="p-4 space-y-6">
                    {/* Tarjetas de recetas: Columnas por día fijo Lunes→Domingo */}
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {activeSession.weeks.map((week) => {
                        const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                        const meals = ['desayuno', 'almuerzo', 'cena'] as const;
                        const mealIcons: Record<string, string> = { desayuno: '🌅', almuerzo: '☀️', cena: '🌙' };
                        const mealLabels: Record<string, string> = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena' };
                        const nutritionItems = activeSession.checklist.filter(
                          item => item.category === 'nutrition' && item.weekNumber === week.weekNumber
                        );

                        return dayOrder.map((day) => (
                          <div key={day} className={`flex-shrink-0 ${isMaximized ? 'w-64' : 'w-36'} flex flex-col`}>
                            {/* Day header */}
                            <div className="bg-green-600 text-white rounded-t-lg py-1.5 px-2 text-center font-semibold text-xs">{day}</div>
                            {/* Meal cards */}
                            <div className="bg-green-50 rounded-b-lg border border-green-200 border-t-0 p-1.5 space-y-1.5 min-h-[60px]">
                              {meals.map((mealType) => {
                                const item = nutritionItems.find(it => it.description.startsWith(day) && it.type === mealType);
                                const recipeName = item ? item.description.split(': ').slice(1).join(': ') : '';
                                return (
                                  <div
                                    key={`${day}-${mealType}`}
                                    className={`group/nut relative rounded-lg border p-1.5 shadow-sm transition-all ${
                                      item
                                        ? 'bg-white border-green-200 hover:shadow-md cursor-pointer cursor-grab active:cursor-grabbing'
                                        : 'bg-green-50/50 border-dashed border-green-300 min-h-[64px] flex flex-col items-center justify-center'
                                    }`}
                                    draggable={!!item && activeSession.status === 'draft'}
                                    onDragStart={(e) => {
                                      if (!item) return;
                                      e.dataTransfer.setData('application/nutrition-drag', JSON.stringify({ day, mealType, itemId: item.id }));
                                      e.currentTarget.classList.add('opacity-50');
                                    }}
                                    onDragEnd={(e) => { e.currentTarget.classList.remove('opacity-50'); }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      (e.currentTarget as HTMLElement).classList.add('ring-2', 'ring-green-400');
                                    }}
                                    onDragLeave={(e) => {
                                      (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-green-400');
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-green-400');
                                      try {
                                        const dragData = JSON.parse(e.dataTransfer.getData('application/nutrition-drag'));
                                        if (!dragData?.itemId || !activeSession) return;
                                        const sourceItem = nutritionItems.find(it => it.id === dragData.itemId);
                                        if (!sourceItem || (dragData.day === day && dragData.mealType === mealType)) return;
                                        const targetItem = nutritionItems.find(it => it.description.startsWith(day) && it.type === mealType);
                                        // Swap descriptions and details
                                        const updatedItems = activeSession.checklist.map(ci => {
                                          if (ci.id === sourceItem.id) {
                                            // Move source to target position
                                            return {
                                              ...ci,
                                              description: targetItem
                                                ? targetItem.description
                                                : `${day} ${mealLabels[mealType]}: ${sourceItem.description.split(': ').slice(1).join(': ') || sourceItem.description}`,
                                              type: mealType,
                                            };
                                          }
                                          if (targetItem && ci.id === targetItem.id) {
                                            // Move target to source position
                                            return {
                                              ...ci,
                                              description: `${dragData.day} ${mealLabels[dragData.mealType as string]}: ${targetItem.description.split(': ').slice(1).join(': ') || targetItem.description}`,
                                              type: dragData.mealType,
                                            };
                                          }
                                          return ci;
                                        });
                                        apiClient.updateSessionItems(clientId, activeSession.sessionId, updatedItems).then((res) => {
                                          if (res?.success && res?.data && typeof res.data === 'object' && res.data !== null && 'session' in res.data) {
                                            setAiProgress(prev => prev ? { ...prev, sessions: prev.sessions.map(s => s.sessionId === activeSession.sessionId ? (res.data as { session: AIRecommendationSession }).session : s) } : prev);
                                          }
                                        }).catch(() => {});
                                      } catch { /* ignore parse errors */ }
                                    }}
                                  >
                                    {item ? (
                                      <>
                                        {/* Delete on hover */}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                          className="absolute top-0.5 right-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/nut:opacity-100 transition-opacity text-[10px] z-10"
                                          title="Eliminar"
                                        >✕</button>
                                        {/* Image placeholder */}
                                        <div
                                          onClick={async () => {
                                            if (item.recipeId) {
                                              try {
                                                const res = await apiClient.getRecipeById(item.recipeId);
                                                if (res.data) { setSelectedRecipe(res.data); setShowRecipeDetail(true); }
                                              } catch { /* fallback */ }
                                            }
                                          }}
                                          className="w-full h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded mb-1 flex items-center justify-center text-green-400 text-lg overflow-hidden"
                                        >
                                          {item.recipeId && recipeCache[item.recipeId]?.image?.url ? (
                                            <img src={recipeCache[item.recipeId].image!.url} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <span>🍳</span>
                                          )}
                                        </div>
                                        {/* Meal label + recipe name */}
                                        <p className="text-[10px] font-semibold text-gray-900 line-clamp-1 leading-snug mb-0.5">
                                          {mealIcons[mealType]} {mealLabels[mealType]}
                                        </p>
                                        <p
                                          onClick={async () => {
                                            if (item.recipeId) {
                                              try {
                                                const res = await apiClient.getRecipeById(item.recipeId);
                                                if (res.data) { setSelectedRecipe(res.data); setShowRecipeDetail(true); }
                                              } catch { /* fallback */ }
                                            }
                                          }}
                                          className="text-[11px] text-gray-800 line-clamp-2 leading-snug hover:text-green-700 hover:underline cursor-pointer"
                                        >
                                          {recipeName}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-[10px] font-semibold text-gray-500 mb-1">
                                          {mealIcons[mealType]} {mealLabels[mealType]}
                                        </p>
                                        <span className="text-[10px] text-gray-400 italic">Vacío</span>
                                        {activeSession.status === 'draft' && (
                                          <button
                                            onClick={() => { setSearchDay(day); setSearchMeal(mealType); setSearchCategory('nutrition'); setSearchWeek(week.weekNumber); setShowRecipeSearch(true); }}
                                            className="mt-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors text-[10px]"
                                            title="Agregar receta"
                                          >+</button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })}
                    </div>

                    {/* Lista de compras semanal */}
                    {activeSession.weeks.some(w => w.nutrition.shoppingList?.length > 0) && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-green-800 flex items-center gap-2">
                            <span>🛒</span> Lista de compras
                          </h4>
                          <button
                            onClick={() => handleUpdateShoppingList(activeSession.sessionId, 1)}
                            disabled={loadingShoppingList[1]}
                            className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {loadingShoppingList[1] ? 'Actualizando...' : 'Actualizar'}
                          </button>
                        </div>
                        {activeSession.weeks.map((week, wi) => (
                          week.nutrition.shoppingList?.length > 0 && (
                            <div key={wi} className="mb-2">
                              <p className="text-xs font-medium text-green-700 mb-1">Semana {week.weekNumber}</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                                {week.nutrition.shoppingList.map((item, si) => (
                                  <div key={si} className="flex items-center gap-1 text-xs">
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      item.priority === 'high' ? 'bg-red-400' : item.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                                    }`} />
                                    <span>{item.item} <span className="text-gray-600">({item.quantity})</span></span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}

                    {/* Alternativas sugeridas */}
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-800 text-sm mb-1">💡 Alternativas sugeridas</h4>
                      <p className="text-xs text-amber-600 mb-3">Para variar el plan, puedes reemplazar cualquier receta por una alternativa con perfil nutricional similar.</p>
                      <div className="flex flex-wrap gap-3">
                        {activeSession.checklist
                          .filter(item => item.category === 'nutrition' && item.isRecurring)
                          .map((item, ai) => (
                            <div key={ai} className="group/alt relative bg-white rounded-lg border border-amber-200 p-2 w-36 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                              {/* Delete on hover */}
                              {activeSession.status === 'draft' && (
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="absolute top-1 right-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/alt:opacity-100 transition-opacity text-[10px] z-10"
                                  title="Eliminar"
                                >✕</button>
                              )}
                              {/* Image / Placeholder */}
                              <div
                                onClick={async () => {
                                  if (item.recipeId) {
                                    try {
                                      const res = await apiClient.getRecipeById(item.recipeId);
                                      if (res.data) { setSelectedRecipe(res.data); setShowRecipeDetail(true); }
                                    } catch { /* fallback */ }
                                  }
                                }}
                                 className="w-full h-20 bg-gradient-to-br from-amber-100 to-yellow-100 rounded mb-1.5 flex items-center justify-center text-amber-400 text-xl overflow-hidden cursor-pointer"
                              >
                                {item.recipeId && recipeCache[item.recipeId]?.image?.url ? (
                                  <img src={recipeCache[item.recipeId].image!.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span>🍳</span>
                                )}
                              </div>
                              {/* Recipe name */}
                              <p
                                onClick={async () => {
                                  if (item.recipeId) {
                                    try {
                                      const res = await apiClient.getRecipeById(item.recipeId);
                                      if (res.data) { setSelectedRecipe(res.data); setShowRecipeDetail(true); }
                                    } catch { /* fallback */ }
                                  }
                                }}
                                className="text-[11px] font-medium text-amber-900 line-clamp-2 leading-snug"
                              >
                                {item.description}
                              </p>
                            </div>
                          ))}
                        {/* Add button card-sized like items */}
                        {activeSession.status === 'draft' && (
                          <button
                            onClick={() => { setAddingAlternative(true); setSearchCategory('nutrition'); setSearchWeek(1); setShowRecipeSearch(true); }}
                            className="h-[120px] w-36 rounded-lg border-2 border-dashed border-amber-300 p-2 text-xs flex flex-col items-center justify-center gap-1 text-amber-600 hover:text-amber-800 hover:border-amber-400 hover:bg-amber-100/50 transition-colors"
                          >
                            <span className="text-lg leading-none">+</span>
                            <span>Agregar</span>
                          </button>
                        )}
                        {activeSession.checklist.filter(item => item.category === 'nutrition' && item.isRecurring).length === 0 && activeSession.status !== 'draft' && (
                          <p className="text-xs text-amber-500 italic">Sin alternativas generadas aún.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {expandedMonths.includes('accordion-nutrition') && activeSession.weeks.length === 0 && (
                    <div className="p-6 text-center text-gray-700">Sin datos de nutrición para esta sesión.</div>
                )}
              </div>

              {/* 🔵 EJERCICIOS */}
              <div className="bg-white rounded-xl border border-blue-300 overflow-hidden">
                <div
                  className="p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white cursor-pointer hover:from-blue-700 transition-colors flex justify-between items-center"
                  onClick={() => {
                    const key = 'accordion-exercise';
                    setExpandedMonths(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
                  }}
                >
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span>🏋️</span> Plan de Ejercicios
                  </h3>
                  <svg className={`w-6 h-6 transform transition-transform ${expandedMonths.includes('accordion-exercise') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedMonths.includes('accordion-exercise') && activeSession.weeks.length > 0 && (
                  <div className="p-4">
                    {/* Tarjetas de ejercicios: Columnas por día fijo Lunes→Domingo */}
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {activeSession.weeks.map((week, wi) => {
                        const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                        const dayMapEN: Record<string, string> = { Lunes: 'Monday', Martes: 'Tuesday', Miércoles: 'Wednesday', Jueves: 'Thursday', Viernes: 'Friday', Sábado: 'Saturday', Domingo: 'Sunday' };
                        const exerciseItems = activeSession.checklist.filter(
                          item => item.category === 'exercise' && item.weekNumber === week.weekNumber
                        );
                        // Group items by day
                        const byDay: Record<string, typeof exerciseItems> = {};
                        exerciseItems.forEach(item => {
                          let day = item.details?.frequency || '';
                          if (!day) {
                            const match = item.description?.match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/);
                            day = match ? match[1] : '';
                          } else {
                            day = Object.entries(dayMapEN).find(([, en]) => en === day)?.[0] || day;
                          }
                          if (day) { byDay[day] = byDay[day] || []; byDay[day].push(item); }
                        });

                        return (
                          <React.Fragment key={wi}>
                            {dayOrder.map((day, idx) => {
                              const items = byDay[day] || [];
                              return (
                                <div
                                  key={day}
                                  className={`flex-shrink-0 ${isMaximized ? 'w-64' : 'w-36'} flex flex-col group/col`}
                                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-blue-400'); }}
                                  onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-blue-400'); }}
                                  onDrop={(e) => {
                                    e.currentTarget.classList.remove('ring-2', 'ring-blue-400');
                                    const dragId = e.dataTransfer.getData('text/plain');
                                    if (!dragId || !activeSession) return;
                                    const draggedItem = exerciseItems.find(it => it.id === dragId);
                                    if (!draggedItem) return;
                                    // Only handle if dropping on empty area (card drops are handled by card onDrop with stopPropagation)
                                    // Move item to this day and append at end
                                    const otherItems = exerciseItems.filter(it => it.id !== dragId);
                                    const updatedDragged = {
                                      ...draggedItem,
                                      description: draggedItem.description.replace(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/, day),
                                      details: { ...draggedItem.details, frequency: day },
                                    };
                                    otherItems.push(updatedDragged);
                                    // Rebuild full checklist with NEW order
                                    const nonExerciseItems = activeSession.checklist.filter(ci => ci.category !== 'exercise');
                                    const firstExIdx = activeSession.checklist.findIndex(ci => ci.category === 'exercise');
                                    const insertPos = firstExIdx >= 0 ? firstExIdx : nonExerciseItems.length;
                                    const allItems = [...nonExerciseItems];
                                    allItems.splice(insertPos, 0, ...otherItems);
                                    apiClient.updateSessionItems(clientId, activeSession.sessionId, allItems).then((res) => {
                                      if (res?.success && res?.data && typeof res.data === 'object' && res.data !== null && 'session' in res.data) {
                                        const sessionData = (res.data as { session: AIRecommendationSession }).session;
                                        setAiProgress(prev => prev ? { ...prev, sessions: prev.sessions.map(s => s.sessionId === activeSession.sessionId ? sessionData : s) } : prev);
                                      }
                                    }).catch(() => {});
                                  }}
                                >
                                  {/* Day header */}
                                  <div className="bg-blue-600 text-white rounded-t-lg py-1.5 px-2 text-center font-semibold text-xs">
                                    {day}
                                  </div>
                                  {/* Exercise cards */}
                                  <div className="relative bg-blue-50 rounded-b-lg border border-blue-200 border-t-0 p-1.5 space-y-1.5 min-h-[60px]">
                                    {items.map((item, ei) => (
                                      <div
                                        key={item.id}
                                        draggable={activeSession.status === 'draft'}
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData('text/plain', item.id);
                                          e.currentTarget.classList.add('opacity-50');
                                        }}
                                        onDragEnd={(e) => { e.currentTarget.classList.remove('opacity-50'); }}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          (e.currentTarget as HTMLElement).classList.add('border-t-2', 'border-blue-500', '-mt-0.5');
                                        }}
                                        onDragLeave={(e) => {
                                          (e.currentTarget as HTMLElement).classList.remove('border-t-2', 'border-blue-500', '-mt-0.5');
                                        }}
                                        onDrop={(e) => {
                                          e.stopPropagation();
                                          (e.currentTarget as HTMLElement).classList.remove('border-t-2', 'border-blue-500', '-mt-0.5');
                                          const dragId = e.dataTransfer.getData('text/plain');
                                          if (!dragId || !activeSession) return;
                                          // Find dragged item in all exercise items
                                          const draggedItem = exerciseItems.find(it => it.id === dragId);
                                          if (!draggedItem || item.id === dragId) return;
                                          // Create new ordered list
                                          const allExerciseItems = [...exerciseItems];
                                          const dragIdx = allExerciseItems.findIndex(it => it.id === dragId);
                                          if (dragIdx === -1) return;
                                          const [dragged] = allExerciseItems.splice(dragIdx, 1);
                                          // Update dragged item's day to target day
                                          const updatedDragged = {
                                            ...dragged,
                                            description: dragged.description.replace(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)/, day),
                                            details: { ...dragged.details, frequency: day },
                                          };
                                          // Find insert position for target item in the updated array (after removing dragged)
                                          let insertIdx = allExerciseItems.findIndex(it => it.id === item.id);
                                          if (insertIdx === -1) insertIdx = allExerciseItems.length;
                                          allExerciseItems.splice(insertIdx, 0, updatedDragged);
                                          // Rebuild full checklist with NEW order
                                          const nonExerciseItems = activeSession.checklist.filter(ci => ci.category !== 'exercise');
                                          const firstExIdx = activeSession.checklist.findIndex(ci => ci.category === 'exercise');
                                          const insertPos = firstExIdx >= 0 ? firstExIdx : nonExerciseItems.length;
                                          const allItems = [...nonExerciseItems];
                                          allItems.splice(insertPos, 0, ...allExerciseItems);
                                          apiClient.updateSessionItems(clientId, activeSession.sessionId, allItems).then((res) => {
                                            if (res?.success && res?.data && typeof res.data === 'object' && res.data !== null && 'session' in res.data) {
                                              const sessionData = (res.data as { session: AIRecommendationSession }).session;
                                              setAiProgress(prev => prev ? { ...prev, sessions: prev.sessions.map(s => s.sessionId === activeSession.sessionId ? sessionData : s) } : prev);
                                            }
                                          }).catch(() => {});
                                        }}
                                        className="group/ex relative bg-white rounded-lg border border-blue-200 p-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer cursor-grab active:cursor-grabbing"
                                      >
                                        {/* Delete on hover */}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                                          className="absolute top-0.5 right-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/ex:opacity-100 transition-opacity text-[10px] z-10"
                                          title="Eliminar"
                                        >✕</button>
                                        {/* Image placeholder */}
                                        <div
                                          onClick={async () => {
                                            if (item.recipeId) {
                                              // Check cache first
                                              if (exerciseCache[item.recipeId]) {
                                                setSelectedExercise(exerciseCache[item.recipeId]);
                                                setShowExerciseDetail(true);
                                                return;
                                              }
                                              try {
                                                const res = await apiClient.getExercises();
                                                if (res.success && res.data) {
                                                  const found = res.data.find((ex: Exercise) => ex.id === item.recipeId);
                                                  if (found) {
                                                    setExerciseCache(prev => ({ ...prev, [item.recipeId!]: found }));
                                                    setSelectedExercise(found);
                                                    setShowExerciseDetail(true);
                                                  }
                                                }
                                              } catch { /* fallback */ }
                                            }
                                          }}
                                          className="w-full h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded mb-1 flex items-center justify-center text-blue-400 text-xl overflow-hidden"
                                        >
                                          <span>🏋️</span>
                                        </div>
                                        {/* Title */}
                                        <p
                                          onClick={async () => {
                                            if (item.recipeId) {
                                              if (exerciseCache[item.recipeId]) {
                                                setSelectedExercise(exerciseCache[item.recipeId]);
                                                setShowExerciseDetail(true);
                                                return;
                                              }
                                              try {
                                                const res = await apiClient.getExercises();
                                                if (res.success && res.data) {
                                                  const found = res.data.find((ex: Exercise) => ex.id === item.recipeId);
                                                  if (found) {
                                                    setExerciseCache(prev => ({ ...prev, [item.recipeId!]: found }));
                                                    setSelectedExercise(found);
                                                    setShowExerciseDetail(true);
                                                  }
                                                }
                                              } catch { /* fallback */ }
                                            }
                                          }}
                                          className="text-[11px] font-semibold text-gray-900 line-clamp-2 leading-snug"
                                        >
                                          {item.description.includes(': ') ? item.description.split(': ').slice(1).join(': ') : item.description}
                                        </p>
                                        {/* Basic info */}
                                        {item.details?.duration && (
                                          <p className="text-[10px] text-gray-600 mt-0.5">{item.details.duration}</p>
                                        )}
                                        {item.details?.equipment && item.details.equipment.length > 0 && (
                                          <p className="text-[10px] text-gray-600 truncate">{item.details.equipment.join(', ')}</p>
                                        )}
                                      </div>
                                    ))}
                                    {/* Add exercise button */}
                                    {activeSession.status === 'draft' && (
                                      <button
                                        onClick={() => { setSearchCategory('exercise'); setSearchWeek(week.weekNumber); setSearchDay(day); setShowExerciseSearch(true); }}
                                        className="w-full py-1 border border-dashed border-blue-300 rounded text-blue-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-100 transition-colors text-[10px] font-medium flex items-center justify-center gap-0.5"
                                      >
                                        <span className="text-xs leading-none">+</span> Ejercicio
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {/* Recommendations box — usa las notas generadas por IA */}
                    <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 text-sm mb-2">💡 Recomendaciones personalizadas</h4>
                      {activeSession.weeks.map((week, wi) => {
                        const focus = week.exercise?.focus || '';
                        return focus ? (
                          <p key={wi} className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">{focus}</p>
                        ) : null;
                      })}
                      {!activeSession.weeks.some(w => w.exercise?.focus) && (
                        <ul className="space-y-1 text-sm text-blue-800">
                          <li>• Mejor horario: mañana (6-9 AM) o tarde (4-6 PM).</li>
                          <li>• Aumenta peso cuando completes todas las series con buena técnica.</li>
                          <li>• Descansa 48h entre sesiones del mismo grupo muscular.</li>
                          <li>• 5-10 min de calentamiento antes de cada sesión.</li>
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 🟣 HÁBITOS */}
              <div className="bg-white rounded-xl border border-purple-300 overflow-hidden">
                <div
                  className="p-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white cursor-pointer hover:from-purple-700 transition-colors flex justify-between items-center"
                  onClick={() => {
                    const key = 'accordion-habits';
                    setExpandedMonths(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
                  }}
                >
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span>🧠</span> Plan de Hábitos
                  </h3>
                  <svg className={`w-6 h-6 transform transition-transform ${expandedMonths.includes('accordion-habits') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedMonths.includes('accordion-habits') && (
                  <div className="p-4 space-y-4">
                    {activeSession.weeks.map((week, wi) => {
                      const adoptItems = activeSession.checklist.filter(
                        item => item.category === 'habit' && item.weekNumber === week.weekNumber && item.type !== 'toEliminate'
                      );
                      const eliminateItems = activeSession.checklist.filter(
                        item => item.category === 'habit' && item.weekNumber === week.weekNumber && item.type === 'toEliminate'
                      );
                      const hasHabits = adoptItems.length > 0 || eliminateItems.length > 0 || activeSession.status === 'draft';

                      if (!hasHabits) return null;

                      return (
                        <div key={wi} className="space-y-3">
                          {/* Desktop: side by side | Mobile: stacked */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* A ADOPTAR */}
                            <div className="bg-white rounded-lg p-3 border border-purple-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-purple-800">✅ A adoptar</p>
                              </div>
                              <div className="space-y-1.5">
                                {adoptItems.length > 0 ? adoptItems.map((item, hi) => (
                                  <div key={hi} className="flex items-center justify-between bg-purple-50 rounded px-2.5 py-1.5 group border border-purple-100">
                                    <button
                                      onClick={() => { setEditingItem({ item, weekNumber: week.weekNumber, category: 'habit' }); setSearchCategory('habit'); setShowEditItemModal(true); }}
                                      className="text-left flex-1 text-sm text-gray-900 hover:text-purple-700 leading-snug"
                                    >{item.description}</button>
                                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => { setEditingItem({ item, weekNumber: week.weekNumber, category: 'habit' }); setSearchCategory('habit'); setShowEditItemModal(true); }}
                                        className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                        title="Editar hábito"
                                      >✏️</button>
                                      <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                        title="Eliminar hábito"
                                      >✕</button>
                                    </div>
                                  </div>
                                )) : (
                                  <p className="text-xs text-gray-600 italic py-2">Sin hábitos a adoptar</p>
                                )}
                                {/* Add item at end of list */}
                                {activeSession.status === 'draft' && (
                                  <button
                                    onClick={() => { setNewHabitType('toAdopt'); setSearchCategory('habit'); setSearchWeek(week.weekNumber); setEditingItem(null); setShowEditItemModal(true); }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border-2 border-dashed border-purple-300 text-purple-500 hover:text-purple-700 hover:border-purple-400 hover:bg-purple-50 transition-colors text-xs"
                                  >
                                    <span className="text-sm leading-none">+</span> Agregar hábito a adoptar
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* A ELIMINAR */}
                            <div className="bg-white rounded-lg p-3 border border-red-200">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-red-800">❌ A eliminar</p>
                              </div>
                              <div className="space-y-1.5">
                                {eliminateItems.length > 0 ? eliminateItems.map((item, hi) => (
                                  <div key={hi} className="flex items-center justify-between bg-red-50 rounded px-2.5 py-1.5 group border border-red-100">
                                    <button
                                      onClick={() => { setEditingItem({ item, weekNumber: week.weekNumber, category: 'habit' }); setSearchCategory('habit'); setShowEditItemModal(true); }}
                                      className="text-left flex-1 text-sm text-gray-900 hover:text-red-700 leading-snug"
                                    >{item.description}</button>
                                    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => { setEditingItem({ item, weekNumber: week.weekNumber, category: 'habit' }); setSearchCategory('habit'); setShowEditItemModal(true); }}
                                        className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                        title="Editar hábito"
                                      >✏️</button>
                                      <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                        title="Eliminar hábito"
                                      >✕</button>
                                    </div>
                                  </div>
                                )) : (
                                  <p className="text-xs text-gray-600 italic py-2">Sin hábitos a eliminar</p>
                                )}
                                {/* Add item at end of list */}
                                {activeSession.status === 'draft' && (
                                  <button
                                    onClick={() => { setNewHabitType('toEliminate'); setSearchCategory('habit'); setSearchWeek(week.weekNumber); setEditingItem(null); setShowEditItemModal(true); }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border-2 border-dashed border-red-300 text-red-500 hover:text-red-700 hover:border-red-400 hover:bg-red-50 transition-colors text-xs"
                                  >
                                    <span className="text-sm leading-none">+</span> Agregar hábito a eliminar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Recommendations box */}
                          {(week.habits.trackingMethod || week.habits.motivationTip) && (
                            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-200">
                              <h5 className="font-semibold text-purple-900 text-xs mb-2">💡 Recomendaciones de hábitos</h5>
                              <ul className="space-y-1 text-xs text-purple-800">
                                {week.habits.trackingMethod && (
                                  <li>📊 Seguimiento: {week.habits.trackingMethod}</li>
                                )}
                                {week.habits.motivationTip && (
                                  <li>💡 Tip: {week.habits.motivationTip}</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {showNewEvaluationForm && (
            <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm mt-6">
               <h3 className="text-xl font-bold text-green-700 mb-4">Nueva Evaluación - Sesión {aiProgress ? aiProgress.sessions.length + 1 : 1}</h3>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Notas para la IA (opcional)</label><textarea value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} rows={3} className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Agrega observaciones específicas..." /></div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button onClick={() => { setShowNewEvaluationForm(false); setCoachNotes(''); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                  <button onClick={() => handleGenerateRecommendations(aiProgress ? aiProgress.sessions.length + 1 : 1)} disabled={generating} className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50">{generating ? 'Generando...' : 'Generar Nuevas Recomendaciones'}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t border-green-200 bg-white rounded-b-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start">
              {activeSession ? (
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="flex items-center"><span className="text-sm text-gray-700">Estado: </span><span className={`font-medium px-2 py-1 rounded-full text-xs md:text-sm ml-2 ${activeSession.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : activeSession.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {activeSession.status === 'draft' ? 'Borrador' : activeSession.status === 'approved' ? 'Aprobado' : 'Enviado al cliente'}
                  </span></div>
                   <span className="text-sm text-gray-700 md:ml-4">Sesión {activeSessionNumber || 1} • {new Date(activeSession.createdAt).toLocaleDateString()}</span>
                </div>
              ) : <span className="text-sm text-gray-700">Sin sesiones activas</span>}
              <button onClick={() => setFooterExpanded(!footerExpanded)} className="md:hidden ml-2 p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors">
                <svg className={`w-5 h-5 transform transition-transform ${footerExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
              </button>
            </div>
            <div className={`${footerExpanded ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-2 justify-end w-full md:w-auto transition-all`}>
              {!showNewEvaluationForm && (
                <button onClick={() => setShowNewEvaluationForm(true)} className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm md:text-base">Nueva Evaluación</button>
              )}
              {activeSession && (
                <>
                  <button onClick={handleRegenerate} disabled={loading || activeSession.status !== 'draft'} className="w-full md:w-auto flex items-center justify-center gap-1 px-3 py-2 md:px-4 md:py-2.5 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base" title={activeSession.status !== 'draft' ? 'Solo se pueden regenerar en estado "Borrador"' : ''}>
                    {loading ? <svg className="h-3 w-3 md:h-4 md:w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" strokeOpacity="0.25"></circle><path d="M22 12a10 10 0 00-10-10" strokeWidth="4" stroke="currentColor" strokeLinecap="round"></path></svg> : <svg className="h-3 w-3 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 10-8 8" /><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 4v6h-6" /></svg>}
                    <span className="md:ml-1">Regenerar</span>
                  </button>
                  {activeSession.status === 'draft' && (
                    <button onClick={() => handleApproveSession(activeSession.sessionId)} className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm md:text-base">Aprobar</button>
                  )}
                  {activeSession.status === 'approved' && (
                    <button onClick={() => handleSendToClient(activeSession.sessionId)} className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base">Enviar al Cliente</button>
                  )}
                  {activeSession.status === 'sent' && (
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                      <div className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm md:text-base text-center">
                        ✅ Enviado el {new Date(activeSession.sentAt || activeSession.updatedAt).toLocaleDateString()}
                      </div>
                      {!videoRoomName ? (
                        <button
                          onClick={handleOpenScheduler}
                          className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm md:text-base flex items-center justify-center gap-1"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Agendar Videollamada
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleJoinVideoCall}
                            className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm md:text-base flex items-center justify-center gap-1"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Unirse a Videollamada
                          </button>
                          {clientSessionLink && (
                            <button
                              onClick={handleCopyClientLink}
                              className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium text-sm md:text-base flex items-center justify-center gap-1"
                              title="Copiar enlace para el cliente"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Copiar enlace
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showRecipeSearch && (
        <RecipeSearchModal
          onSelect={async (recipe) => {
            try {
              const fullRecipe = await apiClient.getRecipeById(recipe.id);
              if (fullRecipe.success) {
                const recipeData = fullRecipe.data as RecipeWithDetails;
                const mealLabel = searchMeal === 'desayuno' ? 'Desayuno' : searchMeal === 'almuerzo' ? 'Almuerzo' : searchMeal === 'cena' ? 'Cena' : '';
                const description = searchDay && mealLabel
                  ? `${searchDay} ${mealLabel}: ${recipeData.title}`
                  : recipeData.title;
                handleSaveNewItem({
                  description,
                  type: searchMeal || 'meal',
                  frequency: 1,
                  recipeId: recipeData.id,
                  details: {
                    recipe: {
                      ingredients: recipeData.ingredients.map((ing: string) => ({ name: ing, quantity: '', notes: '' })),
                      preparation: recipeData.instructions?.join('\n') || '',
                      tips: '',
                    },
                  },
                });
              } else {
                showToast('Error al cargar la receta', 'error');
              }
            } catch {
              showToast('Error al cargar la receta', 'error');
            }
          }}
          onClose={() => setShowRecipeSearch(false)}
        />
      )}

      {showExerciseSearch && (
        <ExerciseSearchModal
          onSelect={(exercise) => {
            const dayForItem = searchDay || '';
            const description = dayForItem ? `${dayForItem}: ${exercise.name}` : exercise.name;
            handleSaveNewItem({
              description,
              type: 'ejercicio',
              frequency: 1,
              recipeId: exercise.id,
              details: {
                duration: `${exercise.sets || 3} series x ${exercise.repetitions || '12'} reps`,
                frequency: dayForItem,
                equipment: exercise.equipment || [],
              },
            });
          }}
          onClose={() => setShowExerciseSearch(false)}
        />
      )}

      {showExerciseDetail && selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => { setShowExerciseDetail(false); setSelectedExercise(null); }}
          onEdit={() => {}}
          onDelete={() => {}}
          onPrevious={() => {}}
          onNext={() => {}}
          hasPrevious={false}
          hasNext={false}
        />
      )}

      {showEditItemModal && (
        <SimpleItemModal
          category={editingItem ? editingItem.category : (searchCategory as 'exercise' | 'habit')}
          onSave={(data) => {
            if (editingItem) {
              handleUpdateItem(editingItem.item.id, data, editingItem.weekNumber, editingItem.category);
            } else {
              handleSaveNewItem(data);
            }
          }}
          onClose={() => {
            setShowEditItemModal(false);
            setEditingItem(null);
          }}
          initialData={editingItem ? {
            description: editingItem.item.description,
            type: editingItem.item.type || (editingItem.category === 'exercise' ? 'cardio' : 'toAdopt'),
            details: editingItem.item.details ? {
              duration: editingItem.item.details.duration,
              frequency: editingItem.item.details.frequency,
              equipment: editingItem.item.details.equipment,
            } : undefined,
          } : undefined}
        />
      )}

      {showAIRecipeEditModal && editingAIRecipe && (
        <AIRecipeEditModal
          initialData={{
            description: editingAIRecipe.item.description,
            type: editingAIRecipe.item.type || 'meal',
            frequency: editingAIRecipe.item.frequency || 1,
            details: {
              recipe: editingAIRecipe.item.details?.recipe || { ingredients: [], preparation: '', tips: '' }
            }
          }}
          onSave={handleSaveAIRecipe}
          onClose={() => {
            setShowAIRecipeEditModal(false);
            setEditingAIRecipe(null);
          }}
        />
      )}

      {showRecipeDetail && selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setShowRecipeDetail(false)}
          onEdit={() => {
            setShowRecipeDetail(false);
            loadAIProgress();
          }}
          onDelete={() => {
            setShowRecipeDetail(false);
            loadAIProgress();
          }}
        />
      )}

      {/* Input file oculto para subir archivos */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".txt,.json,.doc,.docx,.pdf"
        className="hidden"
      />

      {/* ===== MODALES DE VIDEOLlAMADA ===== */}

      {/* Modal para agendar sesión */}
      {showSessionScheduler && (
        <SessionScheduler
          clientId={clientId}
          clientName={_clientName}
          onClose={() => setShowSessionScheduler(false)}
          onSessionCreated={handleSessionCreated}
        />
      )}

      {/* Videollamada en curso */}
      {showVideoCall && videoRoomName && (
        <VideoCallRoom
          roomName={videoRoomName}
          role="coach"
          onLeave={handleCloseVideoCall}
          clientId={clientId}
        />
      )}
      <ToastComponent />
    </div>
  );
}
