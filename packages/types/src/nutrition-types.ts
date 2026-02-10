export interface NutritionData {
  ingredient: string;
  quantity: number; // en gramos
  unit: string; // g, ml, unidad, taza, etc.
  nutritionPer100g: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  category: string; // carne, verdura, fruta, grano, etc.
}

export interface ParsedIngredient {
  original: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface NutritionCalculationResult {
  total: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  perServing: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  ingredients: Array<{
    ingredient: string;
    quantity: number;
    unit: string;
    contribution: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
      percentage: number;
    };
  }>;
  servings: number;
}

export interface NutritionAnalysisResult {
  total: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  perServing: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  ingredients: Array<{
    ingredient: string;
    quantity: number;
    unit: string;
    contribution: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
      percentage: number;
    };
  }>;
  servings: number;
  ketoRatio?: {
    fatPercentage: number;
    proteinPercentage: number;
    carbPercentage: number;
    isKetoFriendly: boolean;
  };
  source?: 'ai' | 'local' | 'manual';
}

export interface ParsedIngredient {
  original: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}
