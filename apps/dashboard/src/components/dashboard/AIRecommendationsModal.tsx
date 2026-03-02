import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import RecipeSearchModal from './RecipeSearchModal';
import SimpleItemModal from './SimpleItemModal';
import RecipeDetailModal from './RecipeDetailModal';
import AIRecipeEditModal, { AIRecipeData } from './AIRecipeEditModal';
import OriginPin from './OriginPin';
import { ChecklistItem } from '../../../../../packages/types/src/healthForm';
import { Recipe } from '../../../../../packages/types/src/recipe-types';

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
  weekNumber: 1 | 2 | 3 | 4;
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
  onRecommendationsGenerated?: () => void;
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

// ===== COMPONENTE PRINCIPAL =====
export default function AIRecommendationsModal({ 
  clientId, 
  onClose, 
  onRecommendationsGenerated 
}: AIRecommendationsModalProps) {
  // ===== ESTADOS PRINCIPALES =====
  const [aiProgress, setAiProgress] = useState<ClientAIProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  
  // ===== ESTADOS DE NAVEGACIÓN =====
  const [activeMonthTab, setActiveMonthTab] = useState<number>(1);
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([0]);
  
  // ===== ESTADOS DE FORMULARIOS =====
  const [showNewEvaluationForm, setShowNewEvaluationForm] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');
  const [reprocessDocuments, setReprocessDocuments] = useState(false);
  
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

  // ===== ESTADOS PARA MODALES DE EDICIÓN =====
  const [showRecipeSearch, setShowRecipeSearch] = useState(false);
  const [searchCategory, setSearchCategory] = useState<'nutrition' | 'exercise' | 'habit'>('nutrition');
  const [searchWeek, setSearchWeek] = useState<number>(1);
  const [editingItem, setEditingItem] = useState<{
    item: ChecklistItem;
    weekNumber: number;
    category: 'exercise' | 'habit';
  } | null>(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithDetails | null>(null);
  const [showRecipeDetail, setShowRecipeDetail] = useState(false);
  const [editingAIRecipe, setEditingAIRecipe] = useState<{
    item: ChecklistItem;
    weekNumber: number;
  } | null>(null);
  const [showAIRecipeEditModal, setShowAIRecipeEditModal] = useState(false);

  // ===== FUNCIONES AUXILIARES =====
  const convertToNewStructure = useCallback((weeks: unknown[]): AIRecommendationWeek[] => {
    if (!weeks || !Array.isArray(weeks)) return [];
    
    return weeks.map((week: unknown, weekIndex: number) => {
      const typedWeek = week as Partial<AIRecommendationWeek>;
      
      // Caso 1: Ya tiene estructura nueva (sin checklistItems)
      if (typedWeek.nutrition && !('checklistItems' in typedWeek.nutrition)) {
        return {
          weekNumber: typedWeek.weekNumber || (weekIndex + 1) as 1 | 2 | 3 | 4,
          nutrition: {
            focus: typedWeek.nutrition?.focus || 'Nutrición keto',
            shoppingList: [] // Ignoramos shoppingList legacy
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
        weekNumber: (oldWeek.weekNumber || (weekIndex + 1)) as 1 | 2 | 3 | 4,
        nutrition: {
          focus: oldWeek.nutrition?.focus || 'Nutrición keto',
          shoppingList: [] // Descartamos shoppingList antiguo
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
  }, []);

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
  const calculateCumulativeProgress = useCallback((): number => {
    if (!aiProgress || !aiProgress.sessions || aiProgress.sessions.length === 0) return 0;
    const allChecklistItems = aiProgress.sessions.flatMap(session => session.checklist);
    const completedItems = allChecklistItems.filter(item => item.completed).length;
    const totalItems = allChecklistItems.length;
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }, [aiProgress]);

  const activeSession = useMemo(() => {
    if (!aiProgress?.sessions || !activeSessionId) {
      if (aiProgress?.sessions && aiProgress.sessions.length > 0) {
        const firstSession = aiProgress.sessions[0];
        if (!activeSessionId) {
          setActiveSessionId(firstSession.sessionId);
          setActiveMonthTab(firstSession.monthNumber);
        }
        return firstSession;
      }
      return null;
    }
    return aiProgress.sessions.find(s => s.sessionId === activeSessionId) || null;
  }, [aiProgress, activeSessionId]);

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
              const session = progress.sessions.find(s => s.sessionId === progress.currentSessionId);
              if (session) setActiveMonthTab(session.monthNumber);
            } else if (!activeSessionId) {
              setActiveSessionId(progress.sessions[0].sessionId);
              setActiveMonthTab(progress.sessions[0].monthNumber);
            }
          }
        } else {
          setAiProgress(null);
        }
      } else {
        setAiProgress(null);
      }
    } catch {
      alert('Error al cargar recomendaciones');
    } finally {
      setLoading(false);
    }
  }, [clientId, activeSessionId, convertApiDataToClientAIProgress]);

  const handleGenerateRecommendations = useCallback(async (monthNumber: number = 1) => {
    try {
      setGenerating(true);
      const response = await apiClient.generateAIRecommendations(clientId, monthNumber, reprocessDocuments, coachNotes);
      if (response.success) {
        await loadAIProgress();
        if (onRecommendationsGenerated) onRecommendationsGenerated();
        setCoachNotes('');
        setShowNewEvaluationForm(false);
        setReprocessDocuments(false);
      } else {
        throw new Error(response.message);
      }
    } catch {
      alert('Error al generar recomendaciones');
    } finally {
      setGenerating(false);
    }
  }, [clientId, reprocessDocuments, coachNotes, loadAIProgress, onRecommendationsGenerated]);

  // ===== EFECTOS =====
  useEffect(() => {
    loadAIProgress();
  }, [loadAIProgress]);

  useEffect(() => {
    if (aiProgress?.sessions && activeMonthTab) {
      const sessionForMonth = aiProgress.sessions.find(s => s.monthNumber === activeMonthTab);
      if (sessionForMonth && sessionForMonth.sessionId !== activeSessionId) {
        setActiveSessionId(sessionForMonth.sessionId);
      }
    }
  }, [aiProgress, activeMonthTab, activeSessionId]);

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
      const response = await apiClient.updateAIChecklist(clientId, sessionId, updatedChecklist);
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
        throw new Error(response.message || 'Error al actualizar');
      }
    } catch {
      alert('Error al actualizar');
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
      const response = await apiClient.updateAIChecklist(clientId, sessionId, updatedChecklist);
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
        throw new Error(response.message || 'Error al guardar cambios');
      }
    } catch {
      alert('Error al guardar cambios');
      await loadAIProgress();
    }
  }, [aiProgress, clientId, loadAIProgress]);

  const deleteItemViaFullChecklist = useCallback(async (updatedChecklist: ChecklistItem[]) => {
    if (!activeSession || !aiProgress) return;

    try {
      const response = await apiClient.updateAIChecklist(clientId, activeSession.sessionId, updatedChecklist);
      if (response.success && response.data && (response.data as { session?: AIRecommendationSession }).session) {
        const sessionData = (response.data as { session: AIRecommendationSession }).session;
        setAiProgress(prev => {
          if (!prev) return prev;
          const sessions = prev.sessions.map(s =>
            s.sessionId === activeSession.sessionId ? sessionData : s
          );
          return { ...prev, sessions };
        });
      } else {
        throw new Error(response.message || 'Error al eliminar');
      }
    } catch {
      alert('Error al eliminar');
      await loadAIProgress();
    }
  }, [activeSession, aiProgress, clientId, loadAIProgress]);

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
      alert('Error al guardar');
    }
  }, [editMode, editingField, aiProgress, editText, clientId, updateItemViaFullChecklist]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    setEditingField(null);
    setEditText('');
    loadAIProgress();
  }, [loadAIProgress]);

  const fetchRecipeAndOpenModal = useCallback(async (recipeId: string) => {
    try {
      const response = await apiClient.getRecipeById(recipeId);
      if (response.success) {
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
    if (!confirm('¿Estás seguro de eliminar este ítem?')) return;

    // Eliminar solo el ítem con ese ID (sin importar el grupo)
    const updatedChecklist = activeSession.checklist.filter(i => i.id !== itemId);

    try {
      const response = await apiClient.updateAIChecklist(clientId, activeSession.sessionId, updatedChecklist);
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
        throw new Error(response.message || 'Error al eliminar');
      }
    } catch {
      alert('Error al eliminar');
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
        isRecurring: false, // No recurrente
        updatedAt: new Date(),
      };
    } else if (searchCategory === 'exercise') {
      const exerciseData = data as NewExerciseItemData;
      newItem = {
        id: newItemId,
        groupId: undefined,
        description: exerciseData.description,
        completed: false,
        weekNumber: week,
        category: 'exercise',
        type: exerciseData.type,
        details: exerciseData.details,
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
        type: habitData.type,
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
      const response = await apiClient.updateAIChecklist(clientId, activeSession.sessionId, updatedChecklist);
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
      } else {
        throw new Error(response.message || 'Error al crear el ítem');
      }
    } catch {
      alert('Error al crear el ítem');
      await loadAIProgress();
    }
  }, [activeSession, aiProgress, clientId, searchWeek, searchCategory, loadAIProgress]);

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
    } catch {
      alert('Error al aprobar');
    }
  }, [clientId, loadAIProgress]);

  const handleRegenerate = useCallback(async () => {
    if (!activeSession) return;
    setLoading(true);
    const notes = prompt('Notas para la regeneración (opcional):', '');
    try {
      await apiClient.regenerateAISession(clientId, activeSession.sessionId, notes || '');
      await loadAIProgress();
    } catch {
      alert('Error al regenerar');
    } finally {
      setLoading(false);
    }
  }, [activeSession, clientId, loadAIProgress]);

  const handleSendToClient = useCallback(async (sessionId: string) => {
    try {
      await apiClient.sendAISessionToClient(clientId, sessionId);
      await loadAIProgress();
      alert('Enviado al cliente');
    } catch {
      alert('Error al enviar');
    }
  }, [clientId, loadAIProgress]);

  // ===== MANEJADORES DE UI =====
  const handleChangeMonthTab = useCallback((monthNumber: number) => {
    setActiveMonthTab(monthNumber);
    const sessionForMonth = aiProgress?.sessions?.find(s => s.monthNumber === monthNumber);
    if (sessionForMonth) setActiveSessionId(sessionForMonth.sessionId);
  }, [aiProgress?.sessions]);

  const toggleWeekExpansion = useCallback((weekIndex: number) => {
    setExpandedWeeks(prev => prev.includes(weekIndex) ? prev.filter(w => w !== weekIndex) : [...prev, weekIndex]);
  }, []);

  const toggleAllWeeks = useCallback(() => {
    setExpandedWeeks(prev => prev.length === 4 ? [] : [0, 1, 2, 3]);
  }, []);

  const calculateShoppingList = useCallback((nutritionItems: ChecklistItem[]): Array<{ item: string; quantity: string }> => {
    const shoppingMap = new Map<string, number>();

    nutritionItems.forEach(item => {
      if (!item.details?.recipe) return;
      item.details.recipe.ingredients.forEach(ing => {
        const key = ing.name;
        const quantityMatch = ing.quantity.match(/^(\d+(?:\.\d+)?)/);
        let quantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
        if (Math.abs(quantity - Math.round(quantity)) < 0.01) {
          quantity = Math.round(quantity);
        }
        const total = quantity * (item.frequency || 1);
        const current = shoppingMap.get(key) || 0;
        shoppingMap.set(key, current + total);
      });
    });

    return Array.from(shoppingMap.entries())
      .map(([item, quantity]) => ({
        item,
        quantity: Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(1),
      }))
      .sort((a, b) => a.item.localeCompare(b.item));
  }, []);

  const toggleShoppingList = useCallback((weekId: string) => {
    setExpandedShoppingLists(prev => 
      prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId]
    );
  }, []);

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
        <div onClick={handleCheckboxClick} className={`mt-1 mr-3 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${isChecked ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300 hover:border-green-400'}`}>
          {isChecked && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            {item.category === 'nutrition' && (
              <>
                <OriginPin origin={item.recipeId ? 'db' : 'ai'} />
                {item.frequency && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
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
              className={`${isChecked ? 'line-through text-gray-500' : 'text-gray-700'} cursor-pointer`}
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
                          <li key={idx} className="text-sm text-gray-600"><span className="font-medium">{ingredient.name}</span>: {ingredient.quantity}{ingredient.notes && <span className="text-gray-500 text-xs ml-2">({ingredient.notes})</span>}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {item.details.recipe.preparation && (
                    <div className="mb-3">
                      <h6 className="text-sm font-medium text-gray-700 mb-1">Preparación:</h6>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{item.details.recipe.preparation}</p>
                    </div>
                  )}
                  {item.details.recipe.tips && (
                    <div>
                      <h6 className="text-sm font-medium text-gray-700 mb-1">💡 Consejo:</h6>
                      <p className="text-sm text-gray-600">{item.details.recipe.tips}</p>
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
                        <span className="sm:ml-2 mt-1 sm:mt-0">{item.details.frequency}</span>
                      </div>
                    )}
                    {item.details.duration && (
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 w-28"><span className="mr-2 text-base">⏱️</span> Duración:</span>
                        <span className="sm:ml-2 mt-1 sm:mt-0">{item.details.duration}</span>
                      </div>
                    )}
                    {item.details.equipment && item.details.equipment.length > 0 && (
                      <div className="text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 mb-2"><span className="mr-2 text-base">🎽</span> Equipo necesario:</span>
                        <div className="flex flex-wrap gap-2 ml-6 sm:ml-8">
                          {item.details.equipment.map((equipment, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-white rounded-full text-xs sm:text-sm border border-blue-200 shadow-sm">{equipment}</span>
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

    // Los items se obtienen del checklist plano de la sesión
    const nutritionItems = session.checklist.filter(
      item => item.weekNumber === weekNumber && item.category === 'nutrition'
    );
    const exerciseItems = session.checklist.filter(
      item => item.weekNumber === weekNumber && item.category === 'exercise'
    );
    const habitItems = session.checklist.filter(
      item => item.weekNumber === weekNumber && item.category === 'habit'
    );

    // Calcular progreso semanal
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
                <div className="w-16 md:w-24 bg-gray-200 rounded-full h-2"><div className="bg-green-600 h-2 rounded-full transition-all duration-500" style={{ width: `${weekProgress}%` }}></div></div>
                <span className="text-xs md:text-sm text-gray-600">{weekProgress}%</span>
              </div>
            </div>
            <button className="text-green-600 p-1 hover:bg-green-200 rounded-full transition-colors" aria-label={isExpanded ? 'Contraer semana' : 'Expandir semana'} onClick={(e) => { e.stopPropagation(); toggleWeekExpansion(weekIndex); }}>
              <svg className={`w-5 h-5 md:w-6 md:h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="p-6 space-y-6">
            {/* Nutrición */}
            <div className="space-y-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-green-700 flex items-center">
                  <span className="mr-2">🍽️</span>
                  Nutrición: {week.nutrition.focus}
                </h4>
                <button
                  onClick={() => toggleShoppingList(weekId)}
                  className="text-xs text-green-600 hover:text-green-800 bg-white px-3 py-1 rounded-full shadow-sm"
                >
                  {expandedShoppingLists.includes(weekId) ? '▲ Ocultar compras' : '▼ Ver lista de compras'}
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
                <div className="mt-4 ml-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h5 className="font-medium text-emerald-700 mb-3 flex items-center">
                    <span className="mr-2">🛒</span>
                    Lista de Compras - Semana {week.weekNumber}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {calculateShoppingList(nutritionItems).map((shopItem, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-sm text-gray-700">{shopItem.item}</span>
                        <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          {shopItem.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ejercicio */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-bold text-blue-700 flex items-center">
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
              <h4 className="font-bold text-purple-700 flex items-center">
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
                  <p className="text-sm text-purple-700"><span className="font-medium">💡 Consejo motivacional:</span> {week.habits.motivationTip}</p>
                </div>
              )}
              {week.habits.trackingMethod && (
                <p className="text-xs text-gray-500 mt-2">📋 <span className="font-medium">Método de seguimiento:</span> {week.habits.trackingMethod}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [editMode, expandedWeeks, expandedShoppingLists, toggleWeekExpansion, toggleShoppingList, renderChecklistItem, handleAddItem, calculateShoppingList]);

  // ===== RENDERIZADO CONDICIONAL =====
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div><p className="mt-4 text-gray-600">Cargando recomendaciones...</p></div>
      </div>
    );
  }

  const cumulativeProgress = calculateCumulativeProgress();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 flex flex-col border border-green-200 max-h-[90vh]">
        <div className="p-4 md:p-6 border-b border-green-200 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 pr-4">
              <div className="flex items-center mb-2">
                <svg className="w-6 h-6 md:w-8 md:h-8 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                <div className="flex-1"><h2 className="text-xl md:text-2xl font-bold">Recomendaciones de IA</h2></div>
              </div>
              <div className="md:hidden mt-3">
                <p className="text-green-100 text-sm mb-1">Progreso Acumulado</p>
                <div className="flex items-center space-x-2"><div className="flex-1 bg-green-800 bg-opacity-30 rounded-full h-3"><div className="bg-white h-3 rounded-full transition-all duration-500" style={{ width: `${cumulativeProgress}%` }}></div></div><p className="text-white font-bold text-base min-w-[40px]">{cumulativeProgress}%</p></div>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-end min-w-[200px] ml-4">
              <p className="text-green-100 text-sm mb-1">Progreso Acumulado</p>
              <div className="w-48 bg-green-800 bg-opacity-30 rounded-full h-4 mt-1"><div className="bg-white h-4 rounded-full transition-all duration-500" style={{ width: `${cumulativeProgress}%` }}></div></div>
              <p className="text-white font-bold text-lg mt-1">{cumulativeProgress}%</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-green-200 p-2 rounded-full hover:bg-green-700 transition-colors flex-shrink-0 ml-2 -mt-2 -mr-2 md:mt-0 md:mr-0 mb-2 md:mb-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>

        {activeSession?.sessionId?.startsWith('fallback_') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center"><svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg><span className="text-yellow-700 font-medium">⚠️ Modo offline: Recomendaciones generadas localmente</span></div>
            <p className="text-yellow-600 text-sm mt-1">Para obtener recomendaciones personalizadas con IA, verifica tu cuenta de DeepSeek.</p>
          </div>
        )}

        {aiProgress && aiProgress.sessions.length > 0 && (
          <div className="border-b border-green-200 bg-white">
            <div className="flex space-x-1 px-6 overflow-x-auto">
              {aiProgress.sessions.sort((a, b) => a.monthNumber - b.monthNumber).map(session => (
                <button key={session.sessionId} onClick={() => handleChangeMonthTab(session.monthNumber)} className={`py-4 px-6 font-medium border-b-2 transition-colors whitespace-nowrap ${activeSessionId === session.sessionId ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-green-600'}`}>
                  Mes {session.monthNumber}
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full ${session.status === 'approved' ? 'bg-green-100 text-green-800' : session.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {session.status === 'draft' ? 'Borrador' : session.status === 'approved' ? 'Aprobado' : 'Enviado'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 bg-green-50">
          {!aiProgress || aiProgress.sessions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-green-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No hay recomendaciones generadas</h3>
              <p className="text-gray-600 mb-6">Comienza generando las primeras recomendaciones para este cliente</p>
              <button onClick={() => setShowNewEvaluationForm(true)} className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 transition-colors font-medium text-lg">Generar Primera Evaluación</button>
            </div>
          ) : !activeSession ? (
            <div className="text-center py-12"><p className="text-gray-600">No se encontró la sesión del mes {activeMonthTab}</p></div>
          ) : (
            <div className="space-y-6">
              {editMode && editingField?.type === 'checklist' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center"><svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg><h3 className="text-lg font-bold text-yellow-700">Modo Edición - Checklist</h3></div>
                    <div className="flex space-x-3"><button onClick={handleCancelEdit} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">Cancelar</button><button onClick={handleSaveEdit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">Guardar Cambios</button></div>
                  </div>
                  <div className="space-y-4">
                    {activeSession.checklist.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                        <input type="checkbox" checked={item.completed} onChange={(e) => handleChecklistChange(activeSession.sessionId, item.id, e.target.checked)} className="text-green-600" />
                        <input type="text" value={item.description} onChange={(e) => {
                          const newDescription = e.target.value;
                          // Actualización local temporal para respuesta rápida
                          const updatedChecklist = activeSession.checklist.map((ci, idx) => idx === index ? { ...ci, description: newDescription } : ci);
                          const updatedSessions = aiProgress?.sessions.map(s => s.sessionId === activeSession.sessionId ? { ...s, checklist: updatedChecklist } : s);
                          if (aiProgress && updatedSessions) setAiProgress({ ...aiProgress, sessions: updatedSessions });
                        }} className="flex-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-md" placeholder="Descripción del item..." />
                        <span className={`text-xs px-2 py-1 rounded ${item.category === 'nutrition' ? 'bg-green-100 text-green-800' : item.category === 'exercise' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {item.category === 'nutrition' ? 'Nutrición' : item.category === 'exercise' ? 'Ejercicio' : 'Hábito'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        <p className="text-sm md:text-base text-gray-700 whitespace-pre-line leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-100">
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
                        <p className="text-sm md:text-base text-gray-700 whitespace-pre-line leading-relaxed p-3 bg-gray-50 rounded-lg border border-gray-100">
                          {activeSession.vision}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Semanas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="text-xl font-bold text-green-700">📅 Plan Semanal</h3><button onClick={toggleAllWeeks} className="text-sm text-green-600 hover:text-green-800">{expandedWeeks.length === 4 ? 'Contraer todas' : 'Expandir todas'}</button></div>
                {!editMode && activeSession.status === 'draft' && (
                  <button onClick={() => handleStartEdit(activeSession.sessionId, 'checklist', activeSession.checklist)} className="text-green-600 hover:text-green-800 flex items-center text-sm md:text-base">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Editar Checklist
                  </button>
                )}
                {activeSession.weeks.map((week, weekIndex) => renderWeek(week, weekIndex, activeSession.sessionId, activeSession))}
              </div>
            </div>
          )}

          {showNewEvaluationForm && (
            <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm mt-6">
              <h3 className="text-xl font-bold text-green-700 mb-4">Nueva Evaluación - Mes {aiProgress ? aiProgress.sessions.length + 1 : 1}</h3>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Notas para la IA (opcional)</label><textarea value={coachNotes} onChange={(e) => setCoachNotes(e.target.value)} rows={3} className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Agrega observaciones específicas..." /></div>
                <div className="flex items-center"><input type="checkbox" id="reprocessDocuments" checked={reprocessDocuments} onChange={(e) => setReprocessDocuments(e.target.checked)} className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500" /><label htmlFor="reprocessDocuments" className="ml-2 text-sm text-gray-700">Reprocesar documentos médicos con IA</label></div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button onClick={() => { setShowNewEvaluationForm(false); setCoachNotes(''); setReprocessDocuments(false); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
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
                  <div className="flex items-center"><span className="text-sm text-gray-500">Estado: </span><span className={`font-medium px-2 py-1 rounded-full text-xs md:text-sm ml-2 ${activeSession.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : activeSession.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {activeSession.status === 'draft' ? 'Borrador' : activeSession.status === 'approved' ? 'Aprobado' : 'Enviado al cliente'}
                  </span></div>
                  <span className="text-sm text-gray-500 md:ml-4">Mes {activeSession.monthNumber} • {new Date(activeSession.createdAt).toLocaleDateString()}</span>
                </div>
              ) : <span className="text-sm text-gray-500">Sin sesiones activas</span>}
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
                    <div className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm md:text-base text-center">✅ Enviado el {new Date(activeSession.sentAt || activeSession.updatedAt).toLocaleDateString()}</div>
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
          onSelect={async (recipe, frequency) => {
            try {
              const fullRecipe = await apiClient.getRecipeById(recipe.id);
              if (fullRecipe.success) {
                const recipeData = fullRecipe.data as RecipeWithDetails;
                handleSaveNewItem({
                  description: recipeData.title,
                  type: 'meal',
                  frequency,
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
                alert('Error al obtener la receta completa');
              }
            } catch {
              alert('Error al cargar la receta');
            }
          }}
          onClose={() => setShowRecipeSearch(false)}
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
    </div>
  );
}