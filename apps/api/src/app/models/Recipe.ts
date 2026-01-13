import mongoose, { Schema, Document } from 'mongoose';

export interface IRecipe extends Document {
  title: string;
  description: string;
  category: string[];
  ingredients: string[];
  instructions: string[];
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  image: {
    url: string;
    key: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
  };
  cookTime: number;
  difficulty: 'fácil' | 'medio' | 'dificil';
  author?: string; // Para cuando tengamos múltiples coaches
  isPublished: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RecipeSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: [String], required: true },
  ingredients: { type: [String], required: true },
  instructions: { type: [String], required: true },
  nutrition: {
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    calories: { type: Number, required: true },
  },
  image: {
    url: { type: String, required: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: String, required: true },
  },
  cookTime: { type: Number, required: true }, // en minutos
  difficulty: { 
    type: String, 
    enum: ['fácil', 'medio', 'dificil'], 
    required: true 
  },
  author: { type: String, default: 'NelHealthCoach' },
  isPublished: { type: Boolean, default: true },
  tags: { type: [String], default: [] },
}, {
  timestamps: true
});

export default mongoose.models.Recipe || mongoose.model<IRecipe>('Recipe', RecipeSchema);