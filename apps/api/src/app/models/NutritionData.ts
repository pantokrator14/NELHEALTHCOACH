import mongoose, { Schema, Document } from 'mongoose';

export interface INutritionData extends Document {
  name: string; // Encriptado
  category: string; // carne, verdura, fruta, grano, etc.
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
  density?: number; // g/ml para líquidos
  commonUnits?: Array<{
    unit: string;
    gramsEquivalent: number;
  }>;
  tags: string[];
  source: 'usda' | 'manual' | 'ai_generated';
  confidence: number; // 0-100
  lastUpdated: Date;
}

const NutritionDataSchema: Schema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  nutrition: {
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true },
    calories: { type: Number, required: true },
  },
  density: { type: Number, default: 1 },
  commonUnits: [{
    unit: String,
    gramsEquivalent: Number
  }],
  tags: [{ type: String }],
  source: { 
    type: String, 
    enum: ['usda', 'manual', 'ai_generated'], 
    default: 'ai_generated' 
  },
  confidence: { type: Number, default: 80 },
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true
});

export default mongoose.models.NutritionData || mongoose.model<INutritionData>('NutritionData', NutritionDataSchema);