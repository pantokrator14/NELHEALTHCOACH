export interface RecipeImage {
  url: string;
  key: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface NutritionInfo {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: string[];
  ingredients: string[];
  instructions: string[];
  nutrition: NutritionInfo;
  image: RecipeImage;
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  author?: string;
  isPublished: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeFormData {
  title: string;
  description: string;
  category: string[];
  ingredients: string[];
  instructions: string[];
  nutrition: NutritionInfo;
  cookTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  image?: RecipeImage; // Agregar imagen como opcional
}

export interface RecipeUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}