import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';



const isEncrypted = (text: string): boolean => {
  return !!text && typeof text === 'string' && text.startsWith('U2FsdGVkX1');
};

// Función para limpiar texto encriptado temporalmente
const cleanEncryptedText = (text: string): string => {
  if (isEncrypted(text)) {
    return '[Datos encriptados - Cargando...]';
  }
  return text;
};

// Función para procesar datos y limpiar texto encriptado
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

// Interfaces actualizadas según la nueva estructura
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

export default function AIRecommendationsModal({ 
  clientId, 
  clientName, 
  onClose, 
  onRecommendationsGenerated 
}: AIRecommendationsModalProps) {

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

  // Estados principales
  const [aiProgress, setAiProgress] = useState<ClientAIProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Estados para navegación
  const [activeMonthTab, setActiveMonthTab] = useState<number>(1);
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([0]); // Semana 1 expandida por defecto
  
  // Estados para formularios
  const [showNewEvaluationForm, setShowNewEvaluationForm] = useState(false);
  const [coachNotes, setCoachNotes] = useState('');
  const [reprocessDocuments, setReprocessDocuments] = useState(false);
  
  // Estados para edición
  const [editMode, setEditMode] = useState(false);
  const [editingField, setEditingField] = useState<{
    sessionId: string;
    type: 'summary' | 'vision' | 'checklistItem' | 'week';
    itemId?: string;
    weekIndex?: number;
    category?: 'nutrition' | 'exercise' | 'habit';
    currentValue: any;
  } | null>(null);
  const [editText, setEditText] = useState('');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  
  // Estados para detalles expandidos
  const [expandedRecipes, setExpandedRecipes] = useState<string[]>([]);
  const [expandedShoppingLists, setExpandedShoppingLists] = useState<string[]>([]);
  
  // Referencia para scroll
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Cargar progreso al abrir modal
  useEffect(() => {
    loadAIProgress();
  }, [clientId]);

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

  // Calcular progreso acumulado de todos los meses
  const calculateCumulativeProgress = (): number => {
    if (!aiProgress || !aiProgress.sessions.length) return 0;
    
    const allChecklistItems = aiProgress.sessions.flatMap(session => session.checklist);
    const completedItems = allChecklistItems.filter(item => item.completed).length;
    const totalItems = allChecklistItems.length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  // Obtener sesión activa (mes actual)
  // Obtener índice de la sesión en el array
  const activeSession = aiProgress?.sessions.find(
    session => session.sessionId === activeSessionId
  ) || aiProgress?.sessions.find(
    session => session.monthNumber === activeMonthTab
  ) || aiProgress?.sessions[0];

  useEffect(() => {
    console.log('🔍 aiProgress actualizado:', {
      sessions: aiProgress?.sessions?.length,
      overallProgress: aiProgress?.overallProgress,
      activeSessionId,
      activeSessionChecklist: activeSession?.checklist?.length
    });
  }, [aiProgress, activeSessionId, activeSession]);

  // Cargar progreso de IA
  const loadAIProgress = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAIProgress(clientId);
      
      if (response.data.hasAIProgress) {
        // ✅ El backend YA debe enviar datos desencriptados
        // NO necesitas llamar a decryptData aquí
        console.log('Datos recibidos del backend:', response.data.aiProgress);
        
        // Verificar si los datos ya están desencriptados
        const aiProgressData = response.data.aiProgress;
        
        // Si el backend está enviando datos desencriptados correctamente
        setAiProgress(aiProgressData);
        
        // Encontrar el último mes para mostrar por defecto
        if (aiProgressData.sessions && aiProgressData.sessions.length > 0) {
          const lastMonth = Math.max(...aiProgressData.sessions.map((s: any) => s.monthNumber));
          if (lastMonth > 0) {
            setActiveMonthTab(lastMonth);
          }
        }
      } else {
        // No hay progreso de IA
        setAiProgress(null);
      }
    } catch (error) {
      console.error('Error cargando progreso de IA:', error);
      // En caso de error, mostrar datos vacíos
      setAiProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // Generar nuevas recomendaciones
  const handleGenerateRecommendations = async (monthNumber: number = 1) => {
    try {
      setGenerating(true);
      const response = await apiClient.generateAIRecommendations(
        clientId, 
        monthNumber,
        reprocessDocuments,
        coachNotes
      );

      if (response.success) {
        await loadAIProgress();
        if (onRecommendationsGenerated) {
          onRecommendationsGenerated();
        }
        setCoachNotes('');
        setShowNewEvaluationForm(false);
        setReprocessDocuments(false);
      }
    } catch (error) {
      console.error('Error generando recomendaciones:', error);
      alert('Error al generar recomendaciones: ' + (error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // Actualizar checklist item
  const handleChecklistChange = async (
    sessionId: string,
    itemId: string,
    completed: boolean
  ) => {
    if (!aiProgress || !activeSession) return;

    // Crear una copia profunda para evitar problemas de referencia
    const updatedAiProgress = JSON.parse(JSON.stringify(aiProgress));
    
    // Encontrar la sesión y actualizar
    const sessionIndex = updatedAiProgress.sessions.findIndex(
      (s: any) => s.sessionId === sessionId
    );
    
    if (sessionIndex !== -1) {
      const session = updatedAiProgress.sessions[sessionIndex];
      
      // 1. Actualizar en el checklist global
      session.checklist = session.checklist.map((item: any) => 
        item.id === itemId 
          ? { 
              ...item, 
              completed, 
              completedDate: completed ? new Date() : undefined,
              updatedAt: new Date()
            } 
          : item
      );
      
      // 2. Actualizar en todas las semanas
      session.weeks = session.weeks.map((week: any) => {
        // Actualizar en nutrition
        const nutritionUpdated = week.nutrition.checklistItems.map((item: any) =>
          item.id === itemId 
            ? { ...item, completed, completedDate: completed ? new Date() : undefined }
            : item
        );
        
        // Actualizar en exercise
        const exerciseUpdated = week.exercise.checklistItems.map((item: any) =>
          item.id === itemId 
            ? { ...item, completed, completedDate: completed ? new Date() : undefined }
            : item
        );
        
        // Actualizar en habits
        const habitsUpdated = week.habits.checklistItems.map((item: any) =>
          item.id === itemId 
            ? { ...item, completed, completedDate: completed ? new Date() : undefined }
            : item
        );
        
        return {
          ...week,
          nutrition: { ...week.nutrition, checklistItems: nutritionUpdated },
          exercise: { ...week.exercise, checklistItems: exerciseUpdated },
          habits: { ...week.habits, checklistItems: habitsUpdated }
        };
      });
      
      // 3. Actualizar el estado inmediatamente
      setAiProgress(updatedAiProgress);
      
      // 4. Enviar al backend
      try {
        await apiClient.updateAIChecklist(clientId, sessionId, session.checklist);
        console.log('✅ Checkbox actualizado en backend');
      } catch (error) {
        console.error('Error actualizando backend:', error);
        // En caso de error, revertir
        await loadAIProgress();
      }
    }
  };

  // Iniciar edición
  const handleStartEdit = (
    sessionId: string,
    type: 'summary' | 'vision' | 'checklistItem' | 'week',
    currentValue: any,
    itemId?: string,
    weekIndex?: number,
    category?: 'nutrition' | 'exercise' | 'habit'
  ) => {
    setEditMode(true);
    setEditingField({
      sessionId,
      type,
      itemId,
      weekIndex,
      category,
      currentValue
    });
    setEditText(typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2));
  };

  // Guardar edición
  const handleSaveEdit = async () => {
    if (!editMode || !editingField || !aiProgress || !activeSession) return;

    try {
      if (editingField.type === 'checklist') {
        // Guardar los cambios del checklist
        await apiClient.updateAIChecklist(
          clientId, 
          activeSession.sessionId, 
          activeSession.checklist
        );
        
        alert('✅ Checklist actualizado exitosamente');
      }
      
      setEditMode(false);
      setEditingField(null);
      setEditText('');
    } catch (error) {
      console.error('Error guardando edición:', error);
      alert('Error al guardar cambios: ' + (error as Error).message);
    }
  };

  // Cancelar edición
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditingField(null);
    setEditText('');
  };

  // Aprobar sesión
  const handleApproveSession = async (sessionId: string) => {
    try {
      await apiClient.approveAISession(clientId, sessionId);
      await loadAIProgress();
      alert('Sesión aprobada exitosamente');
    } catch (error) {
      console.error('Error aprobando sesión:', error);
      alert('Error al aprobar sesión: ' + (error as Error).message);
    }
  };

  // Regenerar sesión
  const handleRegenerate = async () => {
    try {
      setLoading(true);
      console.log('🔄 Iniciando regeneración de recomendaciones...');
      
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
        activeSession!.sessionId,
        coachNotes || ''
      );
      
      if (response.success) {
        console.log('✅ Recomendaciones regeneradas exitosamente');
       
        await loadAIProgress();
        
        // Si hay notas del coach, mostrarlas
        if (coachNotes && coachNotes.trim().length > 0) {
          console.log('Notas del coach incluidas en la regeneración');
        }
      } else {
        throw new Error(response.message || 'Error al regenerar recomendaciones');
      }
    } catch (error: any) {
      console.error('❌ Error regenerando recomendaciones:', error);
      
      // Manejar error específico de estado
      if (error.message.includes("estado 'draft'")) {
        console.log('Solo se pueden regenerar recomendaciones en estado "Borrador".');
      } else {
        console.log(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Expandir/contraer semana
  const toggleWeekExpansion = (weekIndex: number) => {
    setExpandedWeeks(prev => 
      prev.includes(weekIndex) 
        ? prev.filter(w => w !== weekIndex)
        : [...prev, weekIndex]
    );
  };

  // Toggle receta expandida
  const toggleRecipeExpansion = (itemId: string) => {
    setExpandedRecipes(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Toggle lista de compras expandida
  const toggleShoppingListExpansion = (weekId: string) => {
    setExpandedShoppingLists(prev => 
      prev.includes(weekId) 
        ? prev.filter(id => id !== weekId)
        : [...prev, weekId]
    );
  };

  // Renderizar item de checklist con detalles
  const renderChecklistItem = (item: ChecklistItem, sessionId: string) => {
    // Usar estado local para el checkbox
    const isChecked = checkedItems.has(item.id) || item.completed;
    
    const handleCheckboxClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Actualizar estado local inmediatamente
      setCheckedItems(prev => {
        const newSet = new Set(prev);
        if (isChecked) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
      
      // Actualizar backend
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
          <span className={`${isChecked ? 'line-through text-gray-500' : 'text-gray-700'} cursor-pointer`}
                onClick={handleCheckboxClick}>
            {item.description}
          </span>
        </div>
      </div>
    );
  };

  // Renderizar semana completa
  const renderWeek = (week: any, weekIndex: number, sessionId: string) => {
    // Asegurarnos de que week tenga la estructura correcta
    const processedWeek = week.nutrition?.checklistItems ? week : convertToNewStructure([week])[0];
    
    // Resto del código de renderWeek usando processedWeek en lugar de week
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
        
        {/* Contenido expandible de la semana */}
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
                  onClick={() => toggleShoppingListExpansion(weekId)}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  {expandedShoppingLists.includes(weekId) ? '▲ Ocultar compras' : '▼ Ver lista de compras'}
                </button>
              </div>
              
              <div className="space-y-2">
                {week.nutrition.checklistItems.map(item => renderChecklistItem(item, sessionId))}
              </div>
              
              {expandedShoppingLists.includes(weekId) && (
                <div className="mt-4 ml-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h5 className="font-medium text-blue-700 mb-3">🛒 Lista de Compras Semana {week.weekNumber}:</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {week.nutrition.shoppingList.map((shopItem, idx) => (
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

  // Si está cargando
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
        {/* Header con progreso acumulado */}
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

        {activeSession?.sessionId?.startsWith('fallback_') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-700 font-medium">
                ⚠️ Modo offline: Recomendaciones generadas localmente
              </span>
              <button 
                onClick={() => window.open('https://platform.deepseek.com', '_blank')}
                className="ml-auto text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200"
              >
                Activar IA →
              </button>
            </div>
            <p className="text-yellow-600 text-sm mt-1">
              Para obtener recomendaciones personalizadas con IA, agrega fondos a tu cuenta de DeepSeek.
              Costo estimado: ~$0.01/cliente por mes.
            </p>
          </div>
        )}
        
        {/* Tabs de meses */}
        {aiProgress && aiProgress.sessions.length > 0 && (
          <div className="border-b border-green-200 bg-white">
            <div className="flex space-x-1 px-6 overflow-x-auto">
              {aiProgress.sessions
                .sort((a, b) => a.monthNumber - b.monthNumber) // Ordenar por mes
                .map(session => (
                  <button
                    key={session.sessionId} // ✅ Usar sessionId que es único
                    onClick={() => {
                      setActiveMonthTab(session.monthNumber);
                      setActiveSessionId(session.sessionId); // ✅ Guardar también el sessionId
                    }}
                    className={`py-4 px-6 font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeSession?.sessionId === session.sessionId // ✅ Comparar por sessionId
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-green-600'
                    }`}
                  >
                    Mes {session.monthNumber}
                    {session.sessionId.startsWith('fallback_') && (
                      <span className="ml-1 text-xs text-red-500">(Fallback)</span>
                    )}
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
              {/* Modo edición - Botones guardar/cancelar */}
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
                    {activeSession?.checklist.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => handleChecklistChange(activeSession.sessionId, item.id, e.target.checked)}
                          className="text-green-600"
                        />
                        <input
                          type="text"
                          defaultValue={item.description}
                          onChange={(e) => {
                            const newDescription = e.target.value;
                            
                            // 1. Actualizar el checklist global
                            const updatedChecklist = [...activeSession.checklist];
                            const itemIndex = updatedChecklist.findIndex(item => item.id === item.id);
                            if (itemIndex !== -1) {
                              updatedChecklist[itemIndex] = { 
                                ...updatedChecklist[itemIndex], 
                                description: newDescription 
                              };
                            }

                            // 2. Actualizar también en las semanas correspondientes
                            const updatedWeeks = activeSession.weeks.map(week => {
                              // Buscar en nutrition
                              const nutritionUpdated = week.nutrition.checklistItems.map(item =>
                                item.id === item.id ? { ...item, description: newDescription } : item
                              );
                              
                              // Buscar en exercise
                              const exerciseUpdated = week.exercise.checklistItems.map(item =>
                                item.id === item.id ? { ...item, description: newDescription } : item
                              );
                              
                              // Buscar en habits
                              const habitsUpdated = week.habits.checklistItems.map(item =>
                                item.id === item.id ? { ...item, description: newDescription } : item
                              );

                              return {
                                ...week,
                                nutrition: { ...week.nutrition, checklistItems: nutritionUpdated },
                                exercise: { ...week.exercise, checklistItems: exerciseUpdated },
                                habits: { ...week.habits, checklistItems: habitsUpdated }
                              };
                            });

                            // 3. Actualizar el estado completo
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
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {item.category}
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
                  {!editMode && activeSession && (
                    <button
                      onClick={() => {
                        setEditMode(true);
                        setEditingField({
                          sessionId: activeSession.sessionId,
                          type: 'checklist',
                          currentValue: activeSession.checklist
                        });
                      }}
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
                    {editMode ? (
                      <textarea
                        value={editingField?.type === 'summary' ? editText : activeSession.summary}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 text-gray-600 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Escribe el resumen del estado actual del cliente..."
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 whitespace-pre-line">{activeSession.summary}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Visión */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">🎯</span>
                      Visión para el siguiente mes
                    </h4>
                    {editMode ? (
                      <textarea
                        value={editingField?.type === 'vision' ? editText : activeSession.vision}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 text-gray-600 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Describe la visión para el siguiente mes del cliente..."
                      />
                    ) : (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-gray-600 whitespace-pre-line">{activeSession.vision}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Semanas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-green-700">📅 Plan Semanal</h3>
                  <button
                    onClick={() => setExpandedWeeks(expandedWeeks.length === 4 ? [] : [0, 1, 2, 3])}
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
              <h3 className="text-xl font-bold text-green-700 mb-4">Nueva Evaluación - Mes {aiProgress ? aiProgress.sessions.length + 1 : 1}</h3>
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
                    disabled={loading || activeSession?.status !== 'draft'}
                    className="flex items-center gap-2 px-3 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-50"
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
                    {activeSession?.status !== 'draft' && (
                      <span className="ml-2 text-xs text-gray-500" title='Solo se pueden regenerar recomendaciones en estado "Borrador"'>ⓘ</span>
                    )}
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
                      onClick={() => alert('Función de envío por correo pendiente de implementar')}
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

function loadAIRecommendations() {
  throw new Error('Function not implemented.');
}
