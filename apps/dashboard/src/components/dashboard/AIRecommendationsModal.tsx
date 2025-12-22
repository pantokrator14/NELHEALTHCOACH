import { useState, useEffect, useRef, useMemo } from 'react';
import { apiClient } from '@/lib/api';

// ===== FUNCIONES AUXILIARES =====
/**
 * Verifica si un texto está encriptado (formato AES-256)
 */
const isEncrypted = (text: string): boolean => {
  return !!text && typeof text === 'string' && text.startsWith('U2FsdGVkX1');
};

/**
 * Limpia texto encriptado temporalmente para mostrar placeholder
 */
const cleanEncryptedText = (text: string): string => {
  if (isEncrypted(text)) {
    return '[Datos encriptados - Cargando...]';
  }
  return text;
};

/**
 * Procesa datos recursivamente para mostrar texto limpio
 */
const processDataForDisplay = (data: any): any => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    return cleanEncryptedText(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => processDataForDisplay(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const result: any = {};
    for (const key in data) {
      result[key] = processDataForDisplay(data[key]);
    }
    return result;
  }
  
  return data;
};

// ===== INTERFACES =====
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
}

interface AIRecommendationWeek {
  weekNumber: 1 | 2 | 3 | 4;
  nutrition: {
    focus: string;
    checklistItems: ChecklistItem[];
    shoppingList: Array<{item: string; quantity: string; priority: 'high' | 'medium' | 'low'}>;
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

interface AIRecommendationSession {
  sessionId: string;
  monthNumber: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'approved' | 'sent';
  summary: string;
  vision: string;
  baselineMetrics: {
    currentWeight?: number;
    targetWeight?: number;
    currentLifestyle: string[];
    targetLifestyle: string[];
  };
  weeks: AIRecommendationWeek[];
  checklist: ChecklistItem[];
  coachNotes?: string;
  approvedAt?: Date;
  sentAt?: Date;
  previousSessionId?: string;
  regenerationCount?: number;
  regenerationHistory?: Array<{
    timestamp: Date;
    previousSessionId: string;
    coachNotes?: string;
    triggeredBy: 'coach' | 'system';
  }>;
  lastCoachNotes?: string;
  regeneratedAt?: Date;
  emailSent?: boolean;
  emailError?: string;
}

interface ClientAIProgress {
  clientId: string;
  currentSessionId?: string;
  sessions: AIRecommendationSession[];
  overallProgress: number;
  lastEvaluation?: Date;
  nextEvaluation?: Date;
  metrics: {
    nutritionAdherence: number;
    exerciseConsistency: number;
    habitFormation: number;
    weightProgress?: number;
    energyLevel?: number;
    sleepQuality?: number;
  };
}

interface AIRecommendationsModalProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
  onRecommendationsGenerated?: () => void;
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
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([0]); // Semana 1 expandida por defecto
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // ===== ESTADOS DE FORMULARIOS =====
  const [showNewEvaluationForm, setShowNewEvaluationForm] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');
  const [reprocessDocuments, setReprocessDocuments] = useState(false);
  
  // ===== ESTADOS DE EDICIÓN =====
  const [editMode, setEditMode] = useState(false);
  const [editingField, setEditingField] = useState<{
    sessionId: string;
    type: 'summary' | 'vision' | 'checklistItem' | 'checklist' | 'week';
    itemId?: string;
    weekIndex?: number;
    category?: 'nutrition' | 'exercise' | 'habit';
    currentValue: any;
  } | null>(null);
  const [editText, setEditText] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  
  // ===== ESTADOS DE DETALLES EXPANDIDOS =====
  const [expandedRecipes, setExpandedRecipes] = useState<string[]>([]);
  const [expandedShoppingLists, setExpandedShoppingLists] = useState<string[]>([]);
  
  // ===== REFERENCIA PARA SCROLL =====
  const modalContentRef = useRef<HTMLDivElement>(null);

  // ===== EFECTOS =====
  /**
   * Efecto principal: Cargar datos cuando se abre el modal o se fuerza refresco
   */
  useEffect(() => {
    console.log('🚀 Modal activado, cargando datos...');
    loadAIProgress();
  }, [forceRefresh]);

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
  }, [aiProgress, activeMonthTab]);

  /**
   * Efecto de depuración: Monitorear cambios en estados clave
   */
  useEffect(() => {
    console.log('🔍 MONITOR DE ESTADOS:', {
      hasAiProgress: !!aiProgress,
      sessionsCount: aiProgress?.sessions?.length || 0,
      activeSessionId,
      activeMonthTab,
      activeSession: aiProgress?.sessions?.find(s => s.sessionId === activeSessionId),
      editMode,
      editingFieldType: editingField?.type
    });
  }, [aiProgress, activeSessionId, editMode, editingField]);

  // ===== FUNCIONES AUXILIARES =====
  /**
   * Convierte estructura antigua de semanas a la nueva estructura
   */
  const convertToNewStructure = (weeks: any[]): AIRecommendationWeek[] => {
    if (!weeks || !Array.isArray(weeks)) return [];
    
    return weeks.map((week, weekIndex) => {
      // Verificar si ya tiene la nueva estructura
      if (week.nutrition?.checklistItems && Array.isArray(week.nutrition.checklistItems)) {
        return week;
      }
      
      // Convertir estructura antigua a nueva
      const nutritionChecklistItems: ChecklistItem[] = [];
      const exerciseChecklistItems: ChecklistItem[] = [];
      const habitsChecklistItems: ChecklistItem[] = [];
      
      // Convertir meals a checklistItems
      if (week.nutrition?.meals && Array.isArray(week.nutrition.meals)) {
        week.nutrition.meals.forEach((meal: string, index: number) => {
          nutritionChecklistItems.push({
            id: `nutrition_${weekIndex}_${index}_${Date.now()}`,
            description: meal,
            completed: false,
            weekNumber: week.weekNumber || (weekIndex + 1),
            category: 'nutrition',
            type: index === 0 ? 'breakfast' : index === 1 ? 'lunch' : 'dinner',
            details: week.nutrition?.recipes?.[index] ? {
              recipe: week.nutrition.recipes[index]
            } : undefined
          });
        });
      }
      
      // Convertir exercise routine a checklistItems
      if (week.exercise?.routine) {
        exerciseChecklistItems.push({
          id: `exercise_${weekIndex}_0_${Date.now()}`,
          description: week.exercise.routine,
          completed: false,
          weekNumber: week.weekNumber || (weekIndex + 1),
          category: 'exercise',
          details: {
            frequency: week.exercise.frequency,
            duration: week.exercise.duration,
            equipment: week.exercise.equipment
          }
        });
      }
      
      // Convertir adaptations a checklistItems
      if (week.exercise?.adaptations && Array.isArray(week.exercise.adaptations)) {
        week.exercise.adaptations.forEach((adaptation: string, index: number) => {
          exerciseChecklistItems.push({
            id: `exercise_adapt_${weekIndex}_${index}_${Date.now()}`,
            description: adaptation,
            completed: false,
            weekNumber: week.weekNumber || (weekIndex + 1),
            category: 'exercise',
            type: 'adaptation'
          });
        });
      }
      
      // Convertir hábitos
      if (week.habits?.toAdopt && Array.isArray(week.habits.toAdopt)) {
        week.habits.toAdopt.forEach((habit: string, index: number) => {
          habitsChecklistItems.push({
            id: `habit_adopt_${weekIndex}_${index}_${Date.now()}`,
            description: habit,
            completed: false,
            weekNumber: week.weekNumber || (weekIndex + 1),
            category: 'habit',
            type: 'toAdopt'
          });
        });
      }
      
      if (week.habits?.toEliminate && Array.isArray(week.habits.toEliminate)) {
        week.habits.toEliminate.forEach((habit: string, index: number) => {
          habitsChecklistItems.push({
            id: `habit_eliminate_${weekIndex}_${index}_${Date.now()}`,
            description: habit,
            completed: false,
            weekNumber: week.weekNumber || (weekIndex + 1),
            category: 'habit',
            type: 'toEliminate'
          });
        });
      }
      
      return {
        weekNumber: (week.weekNumber || (weekIndex + 1)) as 1 | 2 | 3 | 4,
        nutrition: {
          focus: week.nutrition?.focus || 'Nutrición keto',
          checklistItems: nutritionChecklistItems,
          shoppingList: week.nutrition?.shoppingList || []
        },
        exercise: {
          focus: week.exercise?.focus || week.exercise?.routine || 'Ejercicio adaptado',
          checklistItems: exerciseChecklistItems,
          equipment: week.exercise?.equipment || []
        },
        habits: {
          checklistItems: habitsChecklistItems,
          trackingMethod: week.habits?.trackingMethod,
          motivationTip: week.habits?.motivationTip
        }
      };
    });
  };

  /**
   * Sincroniza el estado de un item entre sesiones
   */
  const syncItemState = (itemId: string, sessions: any[]): ChecklistItem | null => {
    for (const session of sessions) {
      // Buscar en checklist global
      const globalItem = session.checklist.find((i: ChecklistItem) => i.id === itemId);
      if (globalItem) return globalItem;
      
      // Buscar en semanas
      for (const week of session.weeks) {
        const nutritionItem = week.nutrition.checklistItems.find((i: ChecklistItem) => i.id === itemId);
        if (nutritionItem) return nutritionItem;
        
        const exerciseItem = week.exercise.checklistItems.find((i: ChecklistItem) => i.id === itemId);
        if (exerciseItem) return exerciseItem;
        
        const habitItem = week.habits.checklistItems.find((i: ChecklistItem) => i.id === itemId);
        if (habitItem) return habitItem;
      }
    }
    return null;
  };

  // ===== CÁLCULOS Y MEMOS =====
  /**
   * Calcula el progreso acumulado de todos los meses
   */
  const calculateCumulativeProgress = (): number => {
    if (!aiProgress || !aiProgress.sessions.length) return 0;
    
    const allChecklistItems = aiProgress.sessions.flatMap(session => session.checklist);
    const completedItems = allChecklistItems.filter(item => item.completed).length;
    const totalItems = allChecklistItems.length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  /**
   * Obtiene la sesión activa basada en activeSessionId
   */
  const activeSession = useMemo(() => {
    if (!aiProgress?.sessions || !activeSessionId) {
      // Si no hay sesión activa, intentar usar la primera sesión
      if (aiProgress?.sessions?.length > 0) {
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
  const loadAIProgress = async () => {
    try {
      console.log('🔄 Cargando IA Progress para cliente:', clientId);
      setLoading(true);
      
      const response = await apiClient.getAIProgress(clientId);
      
      if (response.success && response.data?.aiProgress) {
        const progress = response.data.aiProgress;
        console.log('📥 Datos recibidos:', {
          sessions: progress.sessions?.length || 0,
          currentSessionId: progress.currentSessionId,
          overallProgress: progress.overallProgress
        });
        
        setAiProgress(progress);
        
        // Establecer sesión activa si no hay una
        if (progress.sessions?.length > 0) {
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
        console.warn('⚠️ No se encontró progreso de IA:', response.message);
        setAiProgress(null);
      }
    } catch (error: any) {
      console.error('❌ Error cargando IA Progress:', error);
      alert('Error al cargar recomendaciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Genera nuevas recomendaciones de IA
   */
  const handleGenerateRecommendations = async (monthNumber: number = 1) => {
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
    } catch (error: any) {
      console.error('❌ Error generando recomendaciones:', error);
      alert('Error al generar recomendaciones: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // ===== MANEJADORES DE CHECKLIST =====
  /**
   * Maneja cambios en los checkboxes del checklist
   */
  const handleChecklistChange = async (
    sessionId: string,
    itemId: string,
    completed: boolean
  ) => {
    if (!aiProgress) return;

    console.log('✅ handleChecklistChange:', { itemId, completed });

    try {
      // 1. Encontrar la sesión
      const sessionIndex = aiProgress.sessions.findIndex(
        (s: any) => s.sessionId === sessionId
      );
      
      if (sessionIndex === -1) {
        console.error('❌ Sesión no encontrada:', sessionId);
        return;
      }
      
      const session = aiProgress.sessions[sessionIndex];
      
      // 2. Actualizar localmente para feedback inmediato
      const updatedChecklist = session.checklist.map((item: any) => 
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
      
    } catch (error: any) {
      console.error('❌ Error actualizando checkbox:', error);
      alert('Error al actualizar. Recarga la página.');
    }
  };

  /**
   * Maneja la edición de un item del checklist
   */
  const handleEditChecklistItem = async (
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
      const updatedChecklist = activeSession.checklist.map((item: any) =>
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
      const updatedSessions = aiProgress.sessions.map((s: any) =>
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
    } catch (error: any) {
      console.error('❌ Error editando item:', error);
      
      // Recargar datos para sincronizar
      await loadAIProgress();
      
      throw error;
    }
  };

  // ===== MANEJADORES DE EDICIÓN =====
  /**
   * Inicia el modo de edición para un campo específico
   */
  const handleStartEdit = (
    sessionId: string,
    type: 'summary' | 'vision' | 'checklistItem' | 'checklist' | 'week',
    currentValue: any,
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
      const item = activeSession?.checklist?.find((item: any) => item.id === itemId);
      setEditText(item?.description || currentValue || '');
    } else if (type === 'checklist') {
      // Para edición masiva del checklist
      setEditText('');
    } else {
      setEditText(typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2));
    }
  };

  /**
   * Guarda los cambios de edición
   */
  const handleSaveEdit = async () => {
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
      
    } catch (error: any) {
      console.error('❌ Error guardando edición:', error);
      alert(`Error: ${error.message}`);
    }
  };

  /**
   * Cancela la edición sin guardar cambios
   */
  const handleCancelEdit = () => {
    console.log('❌ Cancelando edición');
    setEditMode(false);
    setEditingField(null);
    setEditText('');
    
    // Recargar datos para restaurar estado original
    loadAIProgress();
  };

  // ===== MANEJADORES DE ACCIONES =====
  /**
   * Aprueba una sesión de recomendaciones
   */
  const handleApproveSession = async (sessionId: string) => {
    try {
      console.log('✅ Aprobando sesión:', sessionId);
      await apiClient.approveAISession(clientId, sessionId);
      await loadAIProgress();
      console.log('✅ Sesión aprobada exitosamente');
    } catch (error: any) {
      console.error('❌ Error aprobando sesión:', error);
      alert('Error al aprobar sesión: ' + error.message);
    }
  };

  /**
   * Regenera una sesión con IA
   */
  const handleRegenerate = async () => {
    try {
      if (!activeSession) {
        console.error('❌ No hay sesión activa para regenerar');
        return;
      }
      
      setLoading(true);
      console.log('🔄 Iniciando regeneración de sesión:', activeSession.sessionId);
      
      // Solicitar notas opcionales al coach
      const coachNotes = prompt(
        '¿Deseas agregar alguna nota o instrucción específica para la regeneración?\n\n' +
        'Ejemplos:\n' +
        '- "Enfocarse más en ejercicios para espalda"\n' +
        '- "Evitar alimentos con lactosa"\n' +
        '- "Incluir más recetas vegetarianas"\n\n' +
        'Deja en blanco si no tienes notas específicas:',
        ''
      );
      
      console.log('📝 Notas del coach para regeneración:', coachNotes);
      
      const response = await apiClient.regenerateAISession(
        clientId,
        activeSession.sessionId,
        coachNotes || ''
      );
      
      if (response.success) {
        console.log('✅ Recomendaciones regeneradas exitosamente');
        await loadAIProgress();
        
        if (coachNotes && coachNotes.trim().length > 0) {
          console.log('📝 Notas del coach incluidas en la regeneración');
        }
      } else {
        throw new Error(response.message || 'Error al regenerar recomendaciones');
      }
    } catch (error: any) {
      console.error('❌ Error regenerando recomendaciones:', error);
      
      // Manejar error específico de estado
      if (error.message.includes("estado 'draft'")) {
        alert('❌ Solo se pueden regenerar recomendaciones en estado "Borrador". Aprueba o envía las actuales primero.');
      } else {
        alert(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envía las recomendaciones al cliente
   */
  const handleSendToClient = async (sessionId: string) => {
    try {
      console.log('📤 Enviando sesión al cliente:', sessionId);
      await apiClient.sendAISessionToClient(clientId, sessionId);
      await loadAIProgress();
      alert('✅ Recomendaciones enviadas al cliente exitosamente');
    } catch (error: any) {
      console.error('❌ Error enviando al cliente:', error);
      alert('Error al enviar al cliente: ' + error.message);
    }
  };

  // ===== MANEJADORES DE UI =====
  /**
   * Cambia la pestaña de mes activo
   */
  const handleChangeMonthTab = (monthNumber: number) => {
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
  };

  /**
   * Expande o contrae una semana
   */
  const toggleWeekExpansion = (weekIndex: number) => {
    setExpandedWeeks(prev => 
      prev.includes(weekIndex) 
        ? prev.filter(w => w !== weekIndex)
        : [...prev, weekIndex]
    );
  };

  /**
   * Expande o contrae todas las semanas
   */
  const toggleAllWeeks = () => {
    if (expandedWeeks.length === 4) {
      setExpandedWeeks([]);
    } else {
      setExpandedWeeks([0, 1, 2, 3]);
    }
  };

  // ===== RENDERIZADORES =====
  /**
   * Renderiza un item del checklist con checkbox
   */
  const renderChecklistItem = (item: ChecklistItem, sessionId: string) => {
    // Determinar si el item está marcado
    const isChecked = item.completed;
    
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
          
          {/* Mostrar detalles si existen */}
          {item.details?.recipe && (
            <div className="mt-1 ml-2 pl-2 border-l-2 border-green-200">
              <p className="text-xs text-gray-500">Receta disponible</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Renderiza una semana completa con sus secciones
   */
  const renderWeek = (week: any, weekIndex: number, sessionId: string) => {
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
          className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 cursor-pointer hover:from-green-100 transition-colors"
          onClick={() => toggleWeekExpansion(weekIndex)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h3 className="text-lg font-bold text-green-700">
                Semana {week.weekNumber}
              </h3>
              <div className="ml-4 w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${weekProgress}%` }}
                ></div>
              </div>
              <span className="ml-2 text-sm text-gray-600">{weekProgress}%</span>
            </div>
            <button className="text-green-600">
              {isExpanded ? '▲ Contraer' : '▼ Expandir'}
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
                  <h5 className="font-medium text-blue-700 mb-3">🛒 Lista de Compras Semana {week.weekNumber}:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {week.nutrition.shoppingList.map((shopItem: any, idx: number) => (
                      <div key={idx} className={`p-2 rounded ${shopItem.priority === 'high' ? 'bg-red-50 border border-red-100' : shopItem.priority === 'medium' ? 'bg-yellow-50 border border-yellow-100' : 'bg-gray-50 border border-gray-100'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{shopItem.item}</span>
                          <span className={`text-xs px-2 py-1 rounded ${shopItem.priority === 'high' ? 'bg-red-100 text-red-800' : shopItem.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                            {shopItem.priority === 'high' ? 'Alta' : shopItem.priority === 'medium' ? 'Media' : 'Baja'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{shopItem.quantity}</p>
                      </div>
                    ))}
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
  };

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
        <div className="p-6 border-b border-green-200 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <h2 className="text-2xl font-bold">Recomendaciones de IA</h2>
                <p className="text-green-100">Cliente: {clientName}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="mr-6 text-right">
                <p className="text-green-100 text-sm">Progreso Acumulado</p>
                <div className="w-48 bg-green-800 bg-opacity-30 rounded-full h-4 mt-1">
                  <div 
                    className="bg-white h-4 rounded-full transition-all duration-500"
                    style={{ width: `${cumulativeProgress}%` }}
                  ></div>
                </div>
                <p className="text-white font-bold text-lg mt-1">{cumulativeProgress}%</p>
              </div>
              
              <button
                onClick={onClose}
                className="text-white hover:text-green-200 p-2 rounded-full hover:bg-green-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
              <div className="bg-white rounded-xl p-6 border border-green-200">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-green-700">📊 Análisis y Visión</h3>
                  {!editMode && activeSession.status === 'draft' && (
                    <button
                      onClick={() => handleStartEdit(
                        activeSession.sessionId,
                        'checklist',
                        activeSession.checklist
                      )}
                      className="text-green-600 hover:text-green-800 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar Checklist
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Resumen */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">🔍</span>
                      Resumen del Estado Actual
                    </h4>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 whitespace-pre-line">{activeSession.summary}</p>
                    </div>
                  </div>
                  
                  {/* Visión */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">🎯</span>
                      Visión para el siguiente mes
                    </h4>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-gray-600 whitespace-pre-line">{activeSession.vision}</p>
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
        <div className="p-6 border-t border-green-200 bg-white rounded-b-xl">
          <div className="flex justify-between items-center">
            {/* Estado actual */}
            <div>
              {activeSession ? (
                <>
                  <span className="text-sm text-gray-500">Estado: </span>
                  <span className={`font-medium px-3 py-1 rounded-full text-sm ${
                    activeSession.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    activeSession.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {activeSession.status === 'draft' ? 'Borrador' :
                     activeSession.status === 'approved' ? 'Aprobado' : 'Enviado al cliente'}
                  </span>
                  <span className="ml-4 text-sm text-gray-500">
                    Mes {activeSession.monthNumber} • {new Date(activeSession.createdAt).toLocaleDateString()}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">Sin sesiones activas</span>
              )}
            </div>
            
            {/* Botones de acción */}
            <div className="flex space-x-3">
              {!showNewEvaluationForm && (
                <button
                  onClick={() => setShowNewEvaluationForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Nueva Evaluación
                </button>
              )}
              
              {activeSession && (
                <>
                  <button
                    onClick={handleRegenerate}
                    disabled={loading || activeSession.status !== 'draft'}
                    className="flex items-center gap-2 px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={activeSession.status !== 'draft' ? 'Solo se pueden regenerar recomendaciones en estado "Borrador"' : ''}
                  >
                    {loading ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="4" stroke="currentColor" strokeOpacity="0.25"></circle>
                        <path d="M22 12a10 10 0 00-10-10" strokeWidth="4" stroke="currentColor" strokeLinecap="round"></path>
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 10-8 8" />
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20 4v6h-6" />
                      </svg>
                    )}
                    Regenerar
                  </button>
                  
                  {activeSession.status === 'draft' && (
                    <button
                      onClick={() => handleApproveSession(activeSession.sessionId)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Aprobar
                    </button>
                  )}
                  
                  {activeSession.status === 'approved' && (
                    <button
                      onClick={() => handleSendToClient(activeSession.sessionId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Enviar al Cliente
                    </button>
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