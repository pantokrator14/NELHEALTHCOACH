import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

const decryptData = (data: any): any => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    try {
      // Intentar desencriptar si parece estar encriptado
      if (data.startsWith('U2FsdGVkX1')) {
        const decrypted = window.atob(data); // Usar la función de desencriptación real
        return decrypted;
      }
      return data;
    } catch (error) {
      return data;
    }
  }
  
  if (Array.isArray(data)) {
    return data.map(item => decryptData(item));
  }
  
  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      result[key] = decryptData(data[key]);
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
  
  // Estados para detalles expandidos
  const [expandedRecipes, setExpandedRecipes] = useState<string[]>([]);
  const [expandedShoppingLists, setExpandedShoppingLists] = useState<string[]>([]);
  
  // Referencia para scroll
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Cargar progreso al abrir modal
  useEffect(() => {
    loadAIProgress();
  }, [clientId]);

  // Calcular progreso acumulado de todos los meses
  const calculateCumulativeProgress = (): number => {
    if (!aiProgress || !aiProgress.sessions.length) return 0;
    
    const allChecklistItems = aiProgress.sessions.flatMap(session => session.checklist);
    const completedItems = allChecklistItems.filter(item => item.completed).length;
    const totalItems = allChecklistItems.length;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  // Obtener sesión activa (mes actual)
  const activeSession = aiProgress?.sessions.find(session => session.monthNumber === activeMonthTab);
  
  // Obtener índice de la sesión en el array
  const activeSessionIndex = aiProgress?.sessions.findIndex(session => session.monthNumber === activeMonthTab) ?? -1;

  // Cargar progreso de IA
  const loadAIProgress = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAIProgress(clientId);
      if (response.data.hasAIProgress) {
        // Desencriptar los datos recibidos
        const decryptedProgress = decryptData(response.data.aiProgress);
        setAiProgress(decryptedProgress);
        
        const lastMonth = Math.max(...response.data.aiProgress.sessions.map(s => s.monthNumber));
        if (lastMonth > 0) {
          setActiveMonthTab(lastMonth);
        }
      }
    } catch (error) {
      console.error('Error cargando progreso de IA:', error);
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

    // Encontrar el item en el checklist
    const checklist = activeSession.checklist.map(item => 
      item.id === itemId ? { ...item, completed, completedDate: completed ? new Date() : undefined } : item
    );

    try {
      await apiClient.updateAIChecklist(clientId, sessionId, checklist);
      await loadAIProgress(); // Recargar para ver cambios
    } catch (error) {
      console.error('Error actualizando checklist:', error);
      alert('Error al actualizar checklist: ' + (error as Error).message);
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
      // Dependiendo del tipo de campo a editar
      if (editingField.type === 'summary' || editingField.type === 'vision') {
        // Para resumen y visión, necesitamos una llamada API específica
        // Por ahora, actualizamos localmente y hacemos PATCH
        const updatedSession = {
          ...activeSession,
          [editingField.type]: editText
        };
        
        // Aquí deberías implementar una llamada API para actualizar la sesión
        // Por simplicidad, recargamos
        await loadAIProgress();
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
  const handleRegenerateSession = async (sessionId: string) => {
    if (!confirm('¿Regenerar las recomendaciones? Esto creará nuevas recomendaciones basadas en los datos actuales.')) {
      return;
    }

    try {
      await apiClient.regenerateAISession(clientId, sessionId, coachNotes);
      await loadAIProgress();
      alert('Sesión regenerada exitosamente');
    } catch (error) {
      console.error('Error regenerando sesión:', error);
      alert('Error al regenerar sesión: ' + (error as Error).message);
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
    const isRecipe = item.category === 'nutrition' && item.details?.recipe;
    const isExpanded = expandedRecipes.includes(item.id);

    return (
      <div key={item.id} className="flex items-start py-2 border-b border-gray-100 last:border-0">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={(e) => handleChecklistChange(sessionId, item.id, e.target.checked)}
          className="mt-1 mr-3 text-green-600 rounded focus:ring-green-500"
          disabled={editMode}
        />
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className={`${item.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
              {item.description}
              {item.type && (
                <span className="ml-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                  {item.type}
                </span>
              )}
            </span>
            
            {isRecipe && (
              <button
                onClick={() => toggleRecipeExpansion(item.id)}
                className="ml-2 text-xs text-green-600 hover:text-green-800"
              >
                {isExpanded ? '▲ Ocultar receta' : '▼ Ver receta'}
              </button>
            )}
          </div>
          
          {isRecipe && isExpanded && item.details?.recipe && (
            <div className="mt-3 ml-6 p-3 bg-green-50 rounded-lg border border-green-100">
              <h5 className="font-medium text-green-700 mb-2">Receta:</h5>
              <p className="text-gray-600 text-sm mb-3">{item.details.recipe.preparation}</p>
              
              <h6 className="font-medium text-gray-700 mb-1">Ingredientes:</h6>
              <ul className="text-sm text-gray-600 space-y-1">
                {item.details.recipe.ingredients.map((ing, idx) => (
                  <li key={idx}>
                    • {ing.name}: {ing.quantity} {ing.notes && `(${ing.notes})`}
                  </li>
                ))}
              </ul>
              
              {item.details.recipe.tips && (
                <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-100">
                  <span className="text-xs text-yellow-700">💡 {item.details.recipe.tips}</span>
                </div>
              )}
            </div>
          )}
          
          {item.details?.frequency && (
            <p className="text-xs text-gray-500 mt-1">
              📅 {item.details.frequency} {item.details.duration && `• ⏱️ ${item.details.duration}`}
            </p>
          )}
          
          {item.details?.equipment && item.details.equipment.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              🏋️ {item.details.equipment.join(', ')}
            </p>
          )}
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

        {/* Tabs de meses */}
        {aiProgress && aiProgress.sessions.length > 0 && (
          <div className="border-b border-green-200 bg-white">
            <div className="flex space-x-1 px-6 overflow-x-auto">
              {aiProgress.sessions.map(session => (
                <button
                  key={session.monthNumber}
                  onClick={() => setActiveMonthTab(session.monthNumber)}
                  className={`py-4 px-6 font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeMonthTab === session.monthNumber
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
              {/* Modo edición - Botones guardar/cancelar */}
              {editMode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <h3 className="text-lg font-bold text-yellow-700">Modo Edición</h3>
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
                </div>
              )}

              {/* Resumen y Visión */}
              <div className="bg-white rounded-xl p-6 border border-green-200">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold text-green-700">📊 Análisis y Visión</h3>
                  {!editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-green-600 hover:text-green-800 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
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
                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
                      Visión a 1 Año
                    </h4>
                    {editMode ? (
                      <textarea
                        value={editingField?.type === 'vision' ? editText : activeSession.vision}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Describe la visión a 1 año del cliente..."
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
                    onClick={() => handleRegenerateSession(activeSession.sessionId)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
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