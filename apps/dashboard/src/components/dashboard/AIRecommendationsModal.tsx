import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiClient } from '@/lib/api';

// ===== TIPOS Y INTERFACES =====

interface ChecklistItem {
  id: string;
  description: string;
  completed: boolean;
  completedDate?: Date;
  notes?: string;
  weekNumber: number;
  category: 'nutrition' | 'exercise' | 'habit';
  type?: string;
  details?: {
    recipe?: {
      ingredients: Array<{name: string; quantity: string; notes?: string}>;
      preparation: string;
      tips?: string;
    };
    frequency?: string;
    duration?: string;
    equipment?: string[];
  };
  updatedAt?: Date;
}

interface ShoppingListItem {
  item: string;
  quantity: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIRecommendationWeek {
  weekNumber: 1 | 2 | 3 | 4;
  nutrition: {
    focus: string;
    checklistItems: ChecklistItem[];
    shoppingList: ShoppingListItem[];
  };
  exercise: {
    focus: string;
    checklistItems: ChecklistItem[];
    equipment?: string[];
  };
  habits: {
    checklistItems: ChecklistItem[];
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
  clientName: string;
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

// ===== COMPONENTE PRINCIPAL =====
export default function AIRecommendationsModal({ 
  clientId, 
  clientName, 
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

  // ===== FUNCIONES AUXILIARES =====
  /**
   * Convierte estructura antigua de semanas a la nueva estructura
   */
  const convertToNewStructure = useCallback((weeks: unknown[]): AIRecommendationWeek[] => {
    if (!weeks || !Array.isArray(weeks)) return [];
    
    return weeks.map((week: unknown, weekIndex: number) => {
      // Verificar si ya tiene la nueva estructura
      const typedWeek = week as Partial<AIRecommendationWeek>;
      if (typedWeek.nutrition?.checklistItems && Array.isArray(typedWeek.nutrition.checklistItems)) {
        return week as AIRecommendationWeek;
      }
      
      const oldWeek = week as {
        weekNumber?: number;
        nutrition?: {
          focus?: string;
          meals?: string[];
          recipes?: Array<{
            ingredients: Array<{name: string; quantity: string; notes?: string}>;
            preparation: string;
            tips?: string;
          }>;
          shoppingList?: ShoppingListItem[];
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
      };
      
      // Convertir estructura antigua a nueva
      const nutritionChecklistItems: ChecklistItem[] = [];
      const exerciseChecklistItems: ChecklistItem[] = [];
      const habitsChecklistItems: ChecklistItem[] = [];
      
      // Convertir meals a checklistItems
      if (oldWeek.nutrition?.meals && Array.isArray(oldWeek.nutrition.meals)) {
        oldWeek.nutrition.meals.forEach((meal: string, index: number) => {
          nutritionChecklistItems.push({
            id: `nutrition_${weekIndex}_${index}_${Date.now()}`,
            description: meal,
            completed: false,
            weekNumber: oldWeek.weekNumber || (weekIndex + 1),
            category: 'nutrition',
            type: index === 0 ? 'breakfast' : index === 1 ? 'lunch' : 'dinner',
            details: oldWeek.nutrition?.recipes?.[index] ? {
              recipe: oldWeek.nutrition.recipes[index]
            } : undefined
          });
        });
      }
      
      // Convertir exercise routine a checklistItems
      if (oldWeek.exercise?.routine) {
        exerciseChecklistItems.push({
          id: `exercise_${weekIndex}_0_${Date.now()}`,
          description: oldWeek.exercise.routine,
          completed: false,
          weekNumber: oldWeek.weekNumber || (weekIndex + 1),
          category: 'exercise',
          details: {
            frequency: oldWeek.exercise.frequency,
            duration: oldWeek.exercise.duration,
            equipment: oldWeek.exercise.equipment
          }
        });
      }
      
      // Convertir adaptations a checklistItems
      if (oldWeek.exercise?.adaptations && Array.isArray(oldWeek.exercise.adaptations)) {
        oldWeek.exercise.adaptations.forEach((adaptation: string, index: number) => {
          exerciseChecklistItems.push({
            id: `exercise_adapt_${weekIndex}_${index}_${Date.now()}`,
            description: adaptation,
            completed: false,
            weekNumber: oldWeek.weekNumber || (weekIndex + 1),
            category: 'exercise',
            type: 'adaptation'
          });
        });
      }
      
      // Convertir hábitos
      if (oldWeek.habits?.toAdopt && Array.isArray(oldWeek.habits.toAdopt)) {
        oldWeek.habits.toAdopt.forEach((habit: string, index: number) => {
          habitsChecklistItems.push({
            id: `habit_adopt_${weekIndex}_${index}_${Date.now()}`,
            description: habit,
            completed: false,
            weekNumber: oldWeek.weekNumber || (weekIndex + 1),
            category: 'habit',
            type: 'toAdopt'
          });
        });
      }
      
      if (oldWeek.habits?.toEliminate && Array.isArray(oldWeek.habits.toEliminate)) {
        oldWeek.habits.toEliminate.forEach((habit: string, index: number) => {
          habitsChecklistItems.push({
            id: `habit_eliminate_${weekIndex}_${index}_${Date.now()}`,
            description: habit,
            completed: false,
            weekNumber: oldWeek.weekNumber || (weekIndex + 1),
            category: 'habit',
            type: 'toEliminate'
          });
        });
      }
      
      return {
        weekNumber: (oldWeek.weekNumber || (weekIndex + 1)) as 1 | 2 | 3 | 4,
        nutrition: {
          focus: oldWeek.nutrition?.focus || 'Nutrición keto',
          checklistItems: nutritionChecklistItems,
          shoppingList: oldWeek.nutrition?.shoppingList || []
        },
        exercise: {
          focus: oldWeek.exercise?.focus || oldWeek.exercise?.routine || 'Ejercicio adaptado',
          checklistItems: exerciseChecklistItems,
          equipment: oldWeek.exercise?.equipment || []
        },
        habits: {
          checklistItems: habitsChecklistItems,
          trackingMethod: oldWeek.habits?.trackingMethod,
          motivationTip: oldWeek.habits?.motivationTip
        }
      };
    });
  }, []);

  /**
   * Convierte datos de API a ClientAIProgress
   */
  const convertApiDataToClientAIProgress = useCallback((apiData: ApiAIProgressData): ClientAIProgress | null => {
    if (!apiData.sessions || apiData.sessions.length === 0) return null;

    const sessions: AIRecommendationSession[] = apiData.sessions.map(session => {
      // Convertir fechas string a Date
      const createdAt = session.createdAt 
        ? new Date(session.createdAt)
        : new Date();
      const updatedAt = session.updatedAt
        ? new Date(session.updatedAt)
        : createdAt;

      // Procesar semanas
      const weeks = session.weeks 
        ? convertToNewStructure(session.weeks)
        : [];

      return {
        sessionId: session.sessionId,
        monthNumber: session.monthNumber || 1,
        createdAt,
        updatedAt,
        status: session.status || 'draft',
        summary: session.summary || '',
        vision: session.vision || '',
        baselineMetrics: {
          currentLifestyle: [],
          targetLifestyle: []
        },
        weeks,
        checklist: session.checklist || [],
        emailSent: false
      };
    });

    return {
      clientId: apiData.clientId || clientId,
      sessions,
      overallProgress: apiData.overallProgress || 0,
      metrics: apiData.metrics || {
        nutritionAdherence: 0,
        exerciseConsistency: 0,
        habitFormation: 0
      },
      currentSessionId: apiData.currentSessionId,
      lastEvaluation: apiData.lastEvaluation 
        ? new Date(apiData.lastEvaluation)
        : undefined,
      nextEvaluation: apiData.nextEvaluation
        ? new Date(apiData.nextEvaluation)
        : undefined
    };
  }, [clientId, convertToNewStructure]);

  // ===== CÁLCULOS Y MEMOS =====
  /**
   * Calcula el progreso acumulado de todos los meses
   */
  const calculateCumulativeProgress = useCallback((): number => {
    if (!aiProgress || !aiProgress.sessions || aiProgress.sessions.length === 0) return 0;
    
    const allChecklistItems = aiProgress.sessions.flatMap(session => session.checklist);
    const completedItems = allChecklistItems.filter(item => item.completed).length;
    const totalItems = allChecklistItems.length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }, [aiProgress]);

  /**
   * Obtiene la sesión activa basada en activeSessionId
   */
  const activeSession = useMemo(() => {
    if (!aiProgress?.sessions || !activeSessionId) {
      // Si no hay sesión activa, intentar usar la primera sesión
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
    
    const session = aiProgress.sessions.find(s => s.sessionId === activeSessionId);
    
    console.log('🎯 Sesión activa encontrada:', {
      sessionId: session?.sessionId,
      monthNumber: session?.monthNumber,
      status: session?.status,
      weekCount: session?.weeks?.length
    });
    
    return session || null;
  }, [aiProgress, activeSessionId]);

  // ===== MANEJADORES DE DATOS =====
  /**
   * Carga el progreso de IA desde el backend
   */
  const loadAIProgress = useCallback(async () => {
    try {
      console.log('🔄 Cargando IA Progress para cliente:', clientId);
      setLoading(true);
      
      const response = await apiClient.getAIProgress(clientId) as ApiAIProgressResponse;
      
      if (response.success && response.data?.aiProgress) {
        const apiData = response.data.aiProgress;
        console.log('📥 Datos recibidos de API:', {
          sessions: apiData.sessions?.length || 0,
          currentSessionId: apiData.currentSessionId,
          overallProgress: apiData.overallProgress
        });
        
        // Convertir datos de API a ClientAIProgress
        const progress = convertApiDataToClientAIProgress(apiData);
        
        if (progress) {
          setAiProgress(progress);
          
          // Establecer sesión activa si no hay una
          if (progress.sessions && progress.sessions.length > 0) {
            if (!activeSessionId && progress.currentSessionId) {
              console.log('🎯 Estableciendo currentSessionId del backend:', progress.currentSessionId);
              setActiveSessionId(progress.currentSessionId);
              
              // Encontrar el mes correspondiente
              const session = progress.sessions.find(s => s.sessionId === progress.currentSessionId);
              if (session) {
                setActiveMonthTab(session.monthNumber);
              }
            } else if (!activeSessionId) {
              // Usar la primera sesión
              const firstSession = progress.sessions[0];
              console.log('🎯 Estableciendo primera sesión como activa:', firstSession.sessionId);
              setActiveSessionId(firstSession.sessionId);
              setActiveMonthTab(firstSession.monthNumber);
            }
          }
        } else {
          console.warn('⚠️ No se pudieron convertir los datos de API');
          setAiProgress(null);
        }
      } else {
        console.warn('⚠️ No se encontró progreso de IA:', response.message);
        setAiProgress(null);
      }
    } catch (error: unknown) {
      console.error('❌ Error cargando IA Progress:', error);
      alert('Error al cargar recomendaciones: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [clientId, activeSessionId, convertApiDataToClientAIProgress]);

  /**
   * Genera nuevas recomendaciones de IA
   */
  const handleGenerateRecommendations = useCallback(async (monthNumber: number = 1) => {
    try {
      console.log('🚀 Generando recomendaciones para mes:', monthNumber);
      setGenerating(true);
      
      const response = await apiClient.generateAIRecommendations(
        clientId, 
        monthNumber,
        reprocessDocuments,
        coachNotes
      );

      if (response.success) {
        console.log('✅ Recomendaciones generadas:', response.data);
        await loadAIProgress();
        
        if (onRecommendationsGenerated) {
          onRecommendationsGenerated();
        }
        
        // Resetear formulario
        setCoachNotes('');
        setShowNewEvaluationForm(false);
        setReprocessDocuments(false);
      } else {
        throw new Error(response.message || 'Error generando recomendaciones');
      }
    } catch (error: unknown) {
      console.error('❌ Error generando recomendaciones:', error);
      alert('Error al generar recomendaciones: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setGenerating(false);
    }
  }, [clientId, reprocessDocuments, coachNotes, loadAIProgress, onRecommendationsGenerated]);

  // ===== EFECTOS =====
  /**
   * Efecto principal: Cargar datos cuando se abre el modal o se fuerza refresco
   */
  useEffect(() => {
    console.log('🚀 Modal activado, cargando datos...');
    loadAIProgress();
  }, [loadAIProgress]);

  /**
   * Efecto secundario: Sincronizar activeSessionId con activeMonthTab
   */
  useEffect(() => {
    if (aiProgress?.sessions && activeMonthTab) {
      const sessionForMonth = aiProgress.sessions.find(s => s.monthNumber === activeMonthTab);
      if (sessionForMonth && sessionForMonth.sessionId !== activeSessionId) {
        console.log('🔄 Sincronizando activeSessionId con mes activo:', sessionForMonth.sessionId);
        setActiveSessionId(sessionForMonth.sessionId);
      }
    }
  }, [aiProgress, activeMonthTab, activeSessionId]);

  // ===== MANEJADORES DE CHECKLIST =====
  /**
   * Maneja cambios en los checkboxes del checklist
   */
  const handleChecklistChange = useCallback(async (
    sessionId: string,
    itemId: string,
    completed: boolean
  ) => {
    if (!aiProgress) return;

    console.log('✅ handleChecklistChange:', { itemId, completed });

    try {
      // 1. Encontrar la sesión
      const sessionIndex = aiProgress.sessions.findIndex(
        (s) => s.sessionId === sessionId
      );
      
      if (sessionIndex === -1) {
        console.error('❌ Sesión no encontrada:', sessionId);
        return;
      }
      
      const session = aiProgress.sessions[sessionIndex];
      
      // 2. Actualizar localmente para feedback inmediato
      const updatedChecklist = session.checklist.map((item) => 
        item.id === itemId 
          ? { 
              ...item, 
              completed, 
              completedDate: completed ? new Date() : undefined,
              updatedAt: new Date()
            }
          : item
      );
      
      // 3. Actualizar también en las semanas correspondientes
      const updatedWeeks = session.weeks.map(week => {
        // Buscar y actualizar en nutrition
        const updatedNutritionItems = week.nutrition.checklistItems.map(item =>
          item.id === itemId 
            ? { ...item, completed, completedDate: completed ? new Date() : undefined }
            : item
        );
        
        // Buscar y actualizar en exercise
        const updatedExerciseItems = week.exercise.checklistItems.map(item =>
          item.id === itemId 
            ? { ...item, completed, completedDate: completed ? new Date() : undefined }
            : item
        );
        
        // Buscar y actualizar en habits
        const updatedHabitsItems = week.habits.checklistItems.map(item =>
          item.id === itemId 
            ? { ...item, completed, completedDate: completed ? new Date() : undefined }
            : item
        );

        return {
          ...week,
          nutrition: { ...week.nutrition, checklistItems: updatedNutritionItems },
          exercise: { ...week.exercise, checklistItems: updatedExerciseItems },
          habits: { ...week.habits, checklistItems: updatedHabitsItems }
        };
      });

      // 4. Actualizar estado local
      const updatedSessions = [...aiProgress.sessions];
      updatedSessions[sessionIndex] = {
        ...session,
        checklist: updatedChecklist,
        weeks: updatedWeeks,
        updatedAt: new Date()
      };
      
      setAiProgress({
        ...aiProgress,
        sessions: updatedSessions
      });

      // 5. Enviar al backend
      await apiClient.updateAIChecklist(
        clientId,
        sessionId,
        updatedChecklist
      );
      
      console.log('✅ Checkbox actualizado y sincronizado con backend');
      
    } catch (error: unknown) {
      console.error('❌ Error actualizando checkbox:', error);
      alert('Error al actualizar. Recarga la página.');
    }
  }, [aiProgress, clientId]);

  /**
   * Maneja la edición de un item del checklist
   */
  const handleEditChecklistItem = useCallback(async (
    sessionId: string,
    itemId: string,
    newDescription: string
  ) => {
    if (!aiProgress || !activeSession) {
      console.error('❌ No hay datos para editar');
      return false;
    }

    console.log('✏️ Editando item del checklist:', {
      sessionId,
      itemId,
      newDescription
    });

    try {
      // 1. Crear copia del checklist actualizado
      const updatedChecklist = activeSession.checklist.map((item) =>
        item.id === itemId
          ? { ...item, description: newDescription, updatedAt: new Date() }
          : item
      );

      // 2. También actualizar en las semanas
      const updatedWeeks = activeSession.weeks.map(week => {
        // Actualizar en nutrition
        const updatedNutritionItems = week.nutrition.checklistItems.map(item =>
          item.id === itemId ? { ...item, description: newDescription } : item
        );
        
        // Actualizar en exercise
        const updatedExerciseItems = week.exercise.checklistItems.map(item =>
          item.id === itemId ? { ...item, description: newDescription } : item
        );
        
        // Actualizar en habits
        const updatedHabitsItems = week.habits.checklistItems.map(item =>
          item.id === itemId ? { ...item, description: newDescription } : item
        );

        return {
          ...week,
          nutrition: { ...week.nutrition, checklistItems: updatedNutritionItems },
          exercise: { ...week.exercise, checklistItems: updatedExerciseItems },
          habits: { ...week.habits, checklistItems: updatedHabitsItems }
        };
      });

      // 3. Actualizar estado local
      const updatedSessions = aiProgress.sessions.map((s) =>
        s.sessionId === sessionId 
          ? { 
              ...s, 
              checklist: updatedChecklist,
              weeks: updatedWeeks,
              updatedAt: new Date()
            }
          : s
      );
      
      setAiProgress({
        ...aiProgress,
        sessions: updatedSessions
      });

      // 4. Enviar al backend
      const response = await apiClient.updateAIChecklist(
        clientId,
        sessionId,
        updatedChecklist
      );

      if (response.success) {
        console.log('✅ Item editado exitosamente');
        return true;
      } else {
        throw new Error(response.message || 'Error del backend');
      }
    } catch (error: unknown) {
      console.error('❌ Error editando item:', error);
      
      // Recargar datos para sincronizar
      await loadAIProgress();
      
      throw error;
    }
  }, [aiProgress, activeSession, clientId, loadAIProgress]);

  // ===== MANEJADORES DE EDICIÓN =====
  /**
   * Inicia el modo de edición para un campo específico
   */
  const handleStartEdit = useCallback((
    sessionId: string,
    type: 'summary' | 'vision' | 'checklistItem' | 'checklist' | 'week',
    currentValue: string | ChecklistItem[] | AIRecommendationWeek,
    itemId?: string,
    weekIndex?: number,
    category?: 'nutrition' | 'exercise' | 'habit'
  ) => {
    console.log('🔧 Iniciando modo edición:', {
      type,
      itemId,
      weekIndex,
      category,
      currentValueType: typeof currentValue
    });

    setEditMode(true);
    setEditingField({
      sessionId,
      type,
      itemId,
      weekIndex,
      category,
      currentValue
    });
    
    // Determinar qué valor mostrar en el editor
    if (type === 'checklistItem' && itemId) {
      // Buscar el item específico en el checklist
      const item = activeSession?.checklist?.find((item) => item.id === itemId);
      setEditText(item?.description || (typeof currentValue === 'string' ? currentValue : ''));
    } else if (type === 'checklist') {
      // Para edición masiva del checklist
      setEditText('');
    } else {
      setEditText(typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2));
    }
  }, [activeSession]);

  /**
   * Guarda los cambios de edición
   */
  const handleSaveEdit = useCallback(async () => {
    if (!editMode || !editingField || !aiProgress) {
      console.error('❌ No hay nada que guardar');
      return;
    }

    console.log('💾 Guardando edición:', {
      type: editingField.type,
      itemId: editingField.itemId,
      sessionId: editingField.sessionId
    });

    try {
      if (editingField.type === 'checklistItem' && editingField.itemId) {
        // Edición individual de un item
        await handleEditChecklistItem(
          editingField.sessionId,
          editingField.itemId,
          editText
        );
      } else if (editingField.type === 'checklist') {
        // Edición masiva del checklist (ya manejada en el input onChange)
        // Solo salir del modo edición
        console.log('✅ Cambios del checklist ya aplicados en tiempo real');
      } else {
        // Edición de summary, vision, etc.
        console.log('📝 Editando campo:', editingField.type);
        // Implementar según sea necesario
      }
      
      // Salir del modo edición
      setEditMode(false);
      setEditingField(null);
      setEditText('');
      
      console.log('✅ Edición guardada exitosamente');
      
    } catch (error: unknown) {
      console.error('❌ Error guardando edición:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }, [editMode, editingField, aiProgress, editText, handleEditChecklistItem]);

  /**
   * Cancela la edición sin guardar cambios
   */
  const handleCancelEdit = useCallback(() => {
    console.log('❌ Cancelando edición');
    setEditMode(false);
    setEditingField(null);
    setEditText('');
    
    // Recargar datos para restaurar estado original
    loadAIProgress();
  }, [loadAIProgress]);

  // ===== MANEJADORES DE ACCIONES =====
  /**
   * Aprueba una sesión de recomendaciones
   */
  const handleApproveSession = useCallback(async (sessionId: string) => {
    try {
      console.log('✅ Aprobando sesión:', sessionId);
      await apiClient.approveAISession(clientId, sessionId);
      await loadAIProgress();
      console.log('✅ Sesión aprobada exitosamente');
    } catch (error: unknown) {
      console.error('❌ Error aprobando sesión:', error);
      alert('Error al aprobar sesión: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    }
  }, [clientId, loadAIProgress]);

  /**
   * Regenera una sesión con IA
   */
  const handleRegenerate = useCallback(async () => {
    try {
      if (!activeSession) {
        console.error('❌ No hay sesión activa para regenerar');
        return;
      }
      
      setLoading(true);
      console.log('🔄 Iniciando regeneración de sesión:', activeSession.sessionId);
      
      // Solicitar notas opcionales al coach
      const regenerationNotes = prompt(
        '¿Deseas agregar alguna nota o instrucción específica para la regeneración?\n\n' +
        'Ejemplos:\n' +
        '- "Enfocarse más en ejercicios para espalda"\n' +
        '- "Evitar alimentos con lactosa"\n' +
        '- "Incluir más recetas vegetarianas"\n\n' +
        'Deja en blanco si no tienes notas específicas:',
        ''
      );
      
      console.log('📝 Notas del coach para regeneración:', regenerationNotes);
      
      const response = await apiClient.regenerateAISession(
        clientId,
        activeSession.sessionId,
        regenerationNotes || ''
      );
      
      if (response.success) {
        console.log('✅ Recomendaciones regeneradas exitosamente');
        await loadAIProgress();
        
        if (regenerationNotes && regenerationNotes.trim().length > 0) {
          console.log('📝 Notas del coach incluidas en la regeneración');
        }
      } else {
        throw new Error(response.message || 'Error al regenerar recomendaciones');
      }
    } catch (error: unknown) {
      console.error('❌ Error regenerando recomendaciones:', error);
      
      // Manejar error específico de estado
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      if (errorMessage.includes("estado 'draft'")) {
        alert('❌ Solo se pueden regenerar recomendaciones en estado "Borrador". Aprueba o envía las actuales primero.');
      } else {
        alert(`❌ Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [activeSession, clientId, loadAIProgress]);

  /**
   * Envía las recomendaciones al cliente
   */
  const handleSendToClient = useCallback(async (sessionId: string) => {
    try {
      console.log('📤 Enviando recomendaciones al cliente...');
      
      const response = await apiClient.sendAISessionToClient(clientId, sessionId);
      
      if (response.success) {
        console.log('✅ Recomendaciones enviadas al cliente');
        await loadAIProgress();
        
        // Mostrar confirmación
        alert('✅ Recomendaciones enviadas exitosamente al cliente por correo electrónico.');
      } else {
        throw new Error(response.message || 'Error enviando al cliente');
      }
    } catch (error: unknown) {
      console.error('❌ Error enviando al cliente:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }, [clientId, loadAIProgress]);

  // ===== MANEJADORES DE UI =====
  /**
   * Cambia la pestaña de mes activo
   */
  const handleChangeMonthTab = useCallback((monthNumber: number) => {
    console.log('📅 Cambiando mes activo a:', monthNumber);
    setActiveMonthTab(monthNumber);
    
    // Buscar sesión para este mes
    const sessionForMonth = aiProgress?.sessions?.find(
      session => session.monthNumber === monthNumber
    );
    if (sessionForMonth) {
      console.log('🎯 Estableciendo sesión activa:', sessionForMonth.sessionId);
      setActiveSessionId(sessionForMonth.sessionId);
    }
  }, [aiProgress?.sessions]);

  /**
   * Expande o contrae una semana
   */
  const toggleWeekExpansion = useCallback((weekIndex: number) => {
    setExpandedWeeks(prev => 
      prev.includes(weekIndex) 
        ? prev.filter(w => w !== weekIndex)
        : [...prev, weekIndex]
    );
  }, []);

  /**
   * Expande o contrae todas las semanas
   */
  const toggleAllWeeks = useCallback(() => {
    if (expandedWeeks.length === 4) {
      setExpandedWeeks([]);
    } else {
      setExpandedWeeks([0, 1, 2, 3]);
    }
  }, [expandedWeeks.length]);

  /**
   * Expande o contrae una receta
   */
  const toggleRecipeExpansion = useCallback((itemId: string) => {
    setExpandedRecipes(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  /**
   * Expande o contrae detalles de ejercicio
   */
  const toggleExerciseDetailsExpansion = useCallback((itemId: string) => {
    setExpandedExerciseDetails(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // ===== RENDERIZADORES =====
  /**
   * Renderiza un item del checklist con checkbox
   */
  const renderChecklistItem = useCallback((item: ChecklistItem, sessionId: string) => {
    // Determinar si el item está marcado
    const isChecked = item.completed;
    const isRecipeExpanded = expandedRecipes.includes(item.id);
    const isExerciseDetailsExpanded = expandedExerciseDetails.includes(item.id);
    
    const handleCheckboxClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Actualizar estado local y backend
      await handleChecklistChange(sessionId, item.id, !isChecked);
    };

    return (
      <div key={item.id} className="flex items-start py-2 border-b border-gray-100 last:border-0">
        <div 
          onClick={handleCheckboxClick}
          className={`mt-1 mr-3 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
            isChecked 
              ? 'bg-green-500 border-green-500' 
              : 'bg-white border-gray-300 hover:border-green-400'
          }`}
        >
          {isChecked && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        
        <div className="flex-1">
          {editMode && editingField?.type === 'checklistItem' && editingField?.itemId === item.id ? (
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              autoFocus
              className="w-full px-2 py-1 border border-green-300 rounded"
            />
          ) : (
            <span 
              className={`${isChecked ? 'line-through text-gray-500' : 'text-gray-700'} cursor-pointer`}
              onClick={handleCheckboxClick}
              onDoubleClick={() => handleStartEdit(
                sessionId, 
                'checklistItem', 
                item.description, 
                item.id
              )}
            >
              {item.description}
            </span>
          )}
          
          {/* Mostrar detalles de receta si existen */}
          {item.details?.recipe && (
            <div className="mt-2 ml-6 pl-2 border-l-2 border-green-200">
              <button
                onClick={() => toggleRecipeExpansion(item.id)}
                className="text-sm text-green-600 hover:text-green-800 flex items-center mb-1"
              >
                {isRecipeExpanded ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Ocultar receta
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Ver receta completa
                  </>
                )}
              </button>
              
              {isRecipeExpanded && (
                <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="mb-3">
                    <h5 className="font-medium text-yellow-700 mb-2 flex items-center">
                      <span className="mr-2">📝</span>
                      Receta:
                    </h5>
                    
                    {/* Ingredientes */}
                    {item.details.recipe.ingredients && item.details.recipe.ingredients.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-sm font-medium text-gray-700 mb-1">Ingredientes:</h6>
                        <ul className="space-y-1">
                          {item.details.recipe.ingredients.map((ingredient, idx) => (
                            <li key={idx} className="text-sm text-gray-600">
                              <span className="font-medium">{ingredient.name}</span>: {ingredient.quantity}
                              {ingredient.notes && (
                                <span className="text-gray-500 text-xs ml-2">({ingredient.notes})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Preparación */}
                    {item.details.recipe.preparation && (
                      <div className="mb-3">
                        <h6 className="text-sm font-medium text-gray-700 mb-1">Preparación:</h6>
                        <p className="text-sm text-gray-600 whitespace-pre-line">
                          {item.details.recipe.preparation}
                        </p>
                      </div>
                    )}
                    
                    {/* Consejos */}
                    {item.details.recipe.tips && (
                      <div>
                        <h6 className="text-sm font-medium text-gray-700 mb-1">💡 Consejo:</h6>
                        <p className="text-sm text-gray-600">{item.details.recipe.tips}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Mostrar detalles de ejercicio si existen */}
          {item.category === 'exercise' && item.details && (
            <div className="mt-2 ml-4 md:ml-6 pl-3 border-l-2 border-blue-200">
              <button
                onClick={() => toggleExerciseDetailsExpansion(item.id)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center mb-2 font-medium"
              >
                <svg 
                  className={`w-4 h-4 mr-1 transition-transform ${isExerciseDetailsExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {isExerciseDetailsExpanded ? 'Ocultar detalles' : 'Ver detalles del ejercicio'}
              </button>
              
              {isExerciseDetailsExpanded && item.details && (
                <div className="mt-2 p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                  <div className="space-y-3">
                    {item.details.frequency && (
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 w-28">
                          <span className="mr-2 text-base">🕒</span> Frecuencia:
                        </span>
                        <span className="sm:ml-2 mt-1 sm:mt-0">{item.details.frequency}</span>
                      </div>
                    )}
                    
                    {item.details.duration && (
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 w-28">
                          <span className="mr-2 text-base">⏱️</span> Duración:
                        </span>
                        <span className="sm:ml-2 mt-1 sm:mt-0">{item.details.duration}</span>
                      </div>
                    )}
                    
                    {item.details.equipment && item.details.equipment.length > 0 && (
                      <div className="text-sm text-gray-700">
                        <span className="flex items-center font-medium text-blue-700 mb-2">
                          <span className="mr-2 text-base">🎽</span> Equipo necesario:
                        </span>
                        <div className="flex flex-wrap gap-2 ml-6 sm:ml-8">
                          {item.details.equipment.map((equipment, idx) => (
                            <span 
                              key={idx} 
                              className="px-3 py-1.5 bg-white rounded-full text-xs sm:text-sm border border-blue-200 shadow-sm"
                            >
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
      </div>
    );
  }, [editMode, editingField, editText, handleChecklistChange, handleSaveEdit, handleStartEdit, expandedRecipes, expandedExerciseDetails, toggleRecipeExpansion, toggleExerciseDetailsExpansion]);

  /**
   * Renderiza una semana completa con sus secciones
   */
  const renderWeek = useCallback((week: AIRecommendationWeek, weekIndex: number, sessionId: string) => {
    // Asegurar estructura correcta
    const processedWeek = week.nutrition?.checklistItems ? week : convertToNewStructure([week])[0];
    
    const isExpanded = expandedWeeks.includes(weekIndex);
    const weekId = `${sessionId}_week_${weekIndex}`;
    
    // Calcular progreso de la semana
    const weekItems = activeSession?.checklist?.filter(item => item.weekNumber === processedWeek.weekNumber) || [];
    const completedWeekItems = weekItems.filter(item => item.completed).length;
    const weekProgress = weekItems.length > 0 ? Math.round((completedWeekItems / weekItems.length) * 100) : 0;

    return (
      <div key={weekIndex} className="bg-white rounded-xl border border-green-200 mb-4 overflow-hidden">
        {/* Encabezado de semana */}
        <div 
          className="p-3 md:p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 cursor-pointer hover:from-green-100 transition-colors"
          onClick={() => toggleWeekExpansion(weekIndex)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-bold text-green-700">
                Semana {week.weekNumber}
              </h3>
              <div className="flex items-center gap-1">
                <div className="w-16 md:w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${weekProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs md:text-sm text-gray-600">{weekProgress}%</span>
              </div>
            </div>
            <button 
              className="text-green-600 p-1 hover:bg-green-200 rounded-full transition-colors"
              aria-label={isExpanded ? 'Contraer semana' : 'Expandir semana'}
              onClick={(e) => {
                e.stopPropagation(); // Evita doble llamada si el botón está dentro del div clickeable
                toggleWeekExpansion(weekIndex);
              }}
            >
              <svg 
                className={`w-5 h-5 md:w-6 md:h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Contenido expandible */}
        {isExpanded && (
          <div className="p-6 space-y-6">
            {/* Nutrición */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-green-600 flex items-center">
                  <span className="mr-2">🍽️</span>
                  Nutrición: {week.nutrition.focus}
                </h4>
                <button
                  onClick={() => setExpandedShoppingLists(prev => 
                    prev.includes(weekId) 
                      ? prev.filter(id => id !== weekId)
                      : [...prev, weekId]
                  )}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  {expandedShoppingLists.includes(weekId) ? '▲ Ocultar compras' : '▼ Ver lista de compras'}
                </button>
              </div>
              
              <div className="space-y-2">
                {week.nutrition.checklistItems.map(item => renderChecklistItem(item, sessionId))}
              </div>
              
              {expandedShoppingLists.includes(weekId) && week.nutrition.shoppingList?.length > 0 && (
                <div className="mt-4 ml-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h5 className="font-medium text-blue-700 mb-3 flex items-center">
                    <span className="mr-2">🛒</span>
                    Lista de Compras - Semana {week.weekNumber}
                  </h5>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-blue-100">
                          <th className="py-2 px-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-b border-blue-200">
                            Producto
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-b border-blue-200">
                            Cantidad
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider border-b border-blue-200">
                            Prioridad
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {week.nutrition.shoppingList.map((shopItem: ShoppingListItem, idx: number) => (
                          <tr key={idx} className="hover:bg-blue-50 transition-colors">
                            <td className="py-2 px-3 border-b border-blue-100 text-sm text-gray-700">
                              {shopItem.item}
                            </td>
                            <td className="py-2 px-3 border-b border-blue-100 text-sm text-gray-700">
                              {shopItem.quantity}
                            </td>
                            <td className="py-2 px-3 border-b border-blue-100">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                shopItem.priority === 'high' 
                                  ? 'bg-red-100 text-red-800' 
                                  : shopItem.priority === 'medium' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {shopItem.priority === 'high' ? 'Alta' : 
                                shopItem.priority === 'medium' ? 'Media' : 'Baja'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            {/* Ejercicio */}
            <div className="space-y-3">
              <h4 className="font-bold text-blue-600 flex items-center">
                <span className="mr-2">🏋️</span>
                Ejercicio: {week.exercise.focus}
              </h4>
              <div className="space-y-2">
                {week.exercise.checklistItems.map(item => renderChecklistItem(item, sessionId))}
              </div>
            </div>
            
            {/* Hábitos */}
            <div className="space-y-3">
              <h4 className="font-bold text-purple-600 flex items-center">
                <span className="mr-2">🌟</span>
                Hábitos
              </h4>
              <div className="space-y-2">
                {week.habits.checklistItems.map(item => renderChecklistItem(item, sessionId))}
              </div>
              
              {week.habits.motivationTip && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-sm text-purple-700">
                    <span className="font-medium">💡 Consejo motivacional:</span> {week.habits.motivationTip}
                  </p>
                </div>
              )}
              
              {week.habits.trackingMethod && (
                <p className="text-xs text-gray-500 mt-2">
                  📋 <span className="font-medium">Método de seguimiento:</span> {week.habits.trackingMethod}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }, [expandedWeeks, activeSession?.checklist, expandedShoppingLists, toggleWeekExpansion, convertToNewStructure, renderChecklistItem]);

  // ===== RENDERIZADO CONDICIONAL =====
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando recomendaciones de IA...</p>
        </div>
      </div>
    );
  }

  const cumulativeProgress = calculateCumulativeProgress();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8 flex flex-col border border-green-200 max-h-[90vh]">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-green-200 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-xl">
          <div className="flex justify-between items-start mb-4">
            {/* Contenido principal (título, cliente, progreso) */}
            <div className="flex-1 pr-4">
              <div className="flex items-center mb-2">
                <svg className="w-6 h-6 md:w-8 md:h-8 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold">Recomendaciones de IA</h2>
                </div>
              </div>
              
              {/* Progreso - en móvil debajo del título, en desktop a la derecha */}
              <div className="md:hidden mt-3">
                <p className="text-green-100 text-sm mb-1">Progreso Acumulado</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-green-800 bg-opacity-30 rounded-full h-3">
                    <div 
                      className="bg-white h-3 rounded-full transition-all duration-500"
                      style={{ width: `${cumulativeProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-white font-bold text-base min-w-[40px]">{cumulativeProgress}%</p>
                </div>
              </div>
            </div>
            
            {/* Progreso en desktop (a la derecha) */}
            <div className="hidden md:flex flex-col items-end min-w-[200px] ml-4">
              <p className="text-green-100 text-sm mb-1">Progreso Acumulado</p>
              <div className="w-48 bg-green-800 bg-opacity-30 rounded-full h-4 mt-1">
                <div 
                  className="bg-white h-4 rounded-full transition-all duration-500"
                  style={{ width: `${cumulativeProgress}%` }}
                ></div>
              </div>
              <p className="text-white font-bold text-lg mt-1">{cumulativeProgress}%</p>
            </div>
            
            {/* Botón cerrar - SIEMPRE EN ESQUINA SUPERIOR DERECHA */}
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 p-2 rounded-full hover:bg-green-700 transition-colors flex-shrink-0 ml-2 -mt-2 -mr-2 md:mt-0 md:mr-0 mb-2 md:mb-0"
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Advertencia si es fallback */}
        {activeSession?.sessionId?.startsWith('fallback_') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-700 font-medium">
                ⚠️ Modo offline: Recomendaciones generadas localmente
              </span>
            </div>
            <p className="text-yellow-600 text-sm mt-1">
              Para obtener recomendaciones personalizadas con IA, verifica tu cuenta de DeepSeek.
            </p>
          </div>
        )}
        
        {/* Tabs de meses */}
        {aiProgress && aiProgress.sessions.length > 0 && (
          <div className="border-b border-green-200 bg-white">
            <div className="flex space-x-1 px-6 overflow-x-auto">
              {aiProgress.sessions
                .sort((a, b) => a.monthNumber - b.monthNumber)
                .map(session => (
                  <button
                    key={session.sessionId}
                    onClick={() => handleChangeMonthTab(session.monthNumber)}
                    className={`py-4 px-6 font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeSessionId === session.sessionId
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-green-600'
                    }`}
                  >
                    Mes {session.monthNumber}
                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                      session.status === 'approved' ? 'bg-green-100 text-green-800' :
                      session.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {session.status === 'draft' ? 'Borrador' :
                      session.status === 'approved' ? 'Aprobado' : 'Enviado'}
                    </span>
                  </button>
              ))}
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 bg-green-50">
          {!aiProgress || aiProgress.sessions.length === 0 ? (
            // Sin recomendaciones
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-green-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No hay recomendaciones generadas</h3>
              <p className="text-gray-600 mb-6">Comienza generando las primeras recomendaciones para este cliente</p>
              
              <button
                onClick={() => setShowNewEvaluationForm(true)}
                className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
              >
                Generar Primera Evaluación
              </button>
            </div>
          ) : !activeSession ? (
            // Mes no encontrado
            <div className="text-center py-12">
              <p className="text-gray-600">No se encontró la sesión del mes {activeMonthTab}</p>
            </div>
          ) : (
            // Contenido de la sesión activa
            <div className="space-y-6">
              {/* Modo edición */}
              {editMode && editingField?.type === 'checklist' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <h3 className="text-lg font-bold text-yellow-700">Modo Edición - Checklist</h3>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {activeSession.checklist.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => handleChecklistChange(activeSession.sessionId, item.id, e.target.checked)}
                          className="text-green-600"
                        />
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const newDescription = e.target.value;
                            
                            // Actualizar checklist global
                            const updatedChecklist = activeSession.checklist.map((checklistItem, idx) => 
                              idx === index 
                                ? { ...checklistItem, description: newDescription }
                                : checklistItem
                            );

                            // Actualizar también en las semanas
                            const updatedWeeks = activeSession.weeks.map(week => ({
                              ...week,
                              nutrition: {
                                ...week.nutrition,
                                checklistItems: week.nutrition.checklistItems.map(weekItem =>
                                  weekItem.id === item.id 
                                    ? { ...weekItem, description: newDescription }
                                    : weekItem
                                )
                              },
                              exercise: {
                                ...week.exercise,
                                checklistItems: week.exercise.checklistItems.map(weekItem =>
                                  weekItem.id === item.id 
                                    ? { ...weekItem, description: newDescription }
                                    : weekItem
                                )
                              },
                              habits: {
                                ...week.habits,
                                checklistItems: week.habits.checklistItems.map(weekItem =>
                                  weekItem.id === item.id 
                                    ? { ...weekItem, description: newDescription }
                                    : weekItem
                                )
                              }
                            }));

                            // Actualizar el estado completo
                            const updatedSessions = aiProgress?.sessions.map(s =>
                              s.sessionId === activeSession.sessionId
                                ? { 
                                    ...s, 
                                    checklist: updatedChecklist,
                                    weeks: updatedWeeks
                                  }
                                : s
                            );

                            if (aiProgress && updatedSessions) {
                              setAiProgress({
                                ...aiProgress,
                                sessions: updatedSessions
                              });
                            }
                          }}
                          className="flex-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-md"
                          placeholder="Descripción del item..."
                        />
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.category === 'nutrition' ? 'bg-green-100 text-green-800' :
                          item.category === 'exercise' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {item.category === 'nutrition' ? 'Nutrición' :
                           item.category === 'exercise' ? 'Ejercicio' : 'Hábito'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen y Visión */}
              <div className="bg-white rounded-xl p-4 md:p-6 border border-green-200">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 md:mb-6">
                  <h3 className="text-lg md:text-xl font-bold text-green-700">📊 Análisis y Visión</h3>
                </div>
                
                {/* Contenedor en columna para móvil, fila para desktop */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  {/* Resumen */}
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold text-gray-700 flex items-center text-sm md:text-base">
                      <span className="mr-2">🔍</span>
                      Resumen del Estado Actual
                    </h4>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm md:text-base text-gray-700 whitespace-pre-line leading-relaxed">
                        {activeSession.summary}
                      </p>
                    </div>
                  </div>
                  
                  {/* Visión */}
                  <div className="flex-1 space-y-2">
                    <h4 className="font-semibold text-gray-700 flex items-center text-sm md:text-base">
                      <span className="mr-2">🎯</span>
                      Visión para el siguiente mes
                    </h4>
                    <div className="p-3 md:p-4 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-sm md:text-base text-gray-700 whitespace-pre-line leading-relaxed">
                        {activeSession.vision}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Semanas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-green-700">📅 Plan Semanal</h3>
                  <button
                    onClick={toggleAllWeeks}
                    className="text-sm text-green-600 hover:text-green-800"
                  >
                    {expandedWeeks.length === 4 ? 'Contraer todas' : 'Expandir todas'}
                  </button>
                </div>
                {!editMode && activeSession.status === 'draft' && (
                  <button
                    onClick={() => handleStartEdit(
                      activeSession.sessionId,
                      'checklist',
                      activeSession.checklist
                    )}
                    className="text-green-600 hover:text-green-800 flex items-center text-sm md:text-base"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar Checklist
                  </button>
                )}
                
                {activeSession.weeks.map((week, weekIndex) => 
                  renderWeek(week, weekIndex, activeSession.sessionId)
                )}
              </div>
            </div>
          )}

          {/* Formulario para nueva evaluación */}
          {showNewEvaluationForm && (
            <div className="bg-white rounded-xl p-6 border border-green-200 shadow-sm mt-6">
              <h3 className="text-xl font-bold text-green-700 mb-4">
                Nueva Evaluación - Mes {aiProgress ? aiProgress.sessions.length + 1 : 1}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas para la IA (opcional)
                  </label>
                  <textarea
                    value={coachNotes}
                    onChange={(e) => setCoachNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Agrega observaciones específicas o instrucciones para la IA..."
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="reprocessDocuments"
                    checked={reprocessDocuments}
                    onChange={(e) => setReprocessDocuments(e.target.checked)}
                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="reprocessDocuments" className="ml-2 text-sm text-gray-700">
                    Reprocesar documentos médicos con IA
                  </label>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowNewEvaluationForm(false);
                      setCoachNotes('');
                      setReprocessDocuments(false);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleGenerateRecommendations(aiProgress ? aiProgress.sessions.length + 1 : 1)}
                    disabled={generating}
                    className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {generating ? 'Generando...' : 'Generar Nuevas Recomendaciones'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con botones de acción */}
        <div className="p-4 md:p-6 border-t border-green-200 bg-white rounded-b-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            {/* Parte siempre visible (estado + fecha) */}
            <div className="w-full md:w-auto flex items-center justify-between md:justify-start">
              {activeSession ? (
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500">Estado: </span>
                    <span className={`font-medium px-2 py-1 rounded-full text-xs md:text-sm ml-2 ${
                      activeSession.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      activeSession.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {activeSession.status === 'draft' ? 'Borrador' :
                      activeSession.status === 'approved' ? 'Aprobado' : 'Enviado al cliente'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 md:ml-4">
                    Mes {activeSession.monthNumber} • {new Date(activeSession.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">Sin sesiones activas</span>
              )}
              
              {/* Botón de expandir/contraer solo en móvil */}
              <button
                onClick={() => setFooterExpanded(!footerExpanded)}
                className="md:hidden ml-2 p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                aria-label={footerExpanded ? 'Contraer acciones' : 'Expandir acciones'}
              >
                <svg
                  className={`w-5 h-5 transform transition-transform ${footerExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>

            {/* Botones de acción - visibles en desktop siempre, en móvil solo si expandido */}
            <div className={`${footerExpanded ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-2 justify-end w-full md:w-auto transition-all`}>
              {!showNewEvaluationForm && (
                <button
                  onClick={() => setShowNewEvaluationForm(true)}
                  className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm md:text-base"
                >
                  Nueva Evaluación
                </button>
              )}
              
              {activeSession && (
                <>
                  <button
                    onClick={handleRegenerate}
                    disabled={loading || activeSession.status !== 'draft'}
                    className="w-full md:w-auto flex items-center justify-center gap-1 px-3 py-2 md:px-4 md:py-2.5 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    title={activeSession.status !== 'draft' ? 'Solo se pueden regenerar recomendaciones en estado "Borrador"' : ''}
                  >
                    {loading ? (
                      <svg className="h-3 w-3 md:h-4 md:w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" strokeOpacity="0.25"></circle>
                        <path d="M22 12a10 10 0 00-10-10" strokeWidth="4" stroke="currentColor" strokeLinecap="round"></path>
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 md:h-4 md:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 10-8 8" />
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 4v6h-6" />
                      </svg>
                    )}
                    <span className="md:ml-1">Regenerar</span>
                  </button>
                  
                  {activeSession.status === 'draft' && (
                    <button
                      onClick={() => handleApproveSession(activeSession.sessionId)}
                      className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm md:text-base"
                    >
                      Aprobar
                    </button>
                  )}
                  
                  {activeSession.status === 'approved' && (
                    <button
                      onClick={() => handleSendToClient(activeSession.sessionId)}
                      className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base"
                    >
                      Enviar al Cliente
                    </button>
                  )}

                  {activeSession.status === 'sent' && (
                    <div className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm md:text-base text-center">
                      ✅ Enviado el {new Date(activeSession.sentAt || activeSession.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}