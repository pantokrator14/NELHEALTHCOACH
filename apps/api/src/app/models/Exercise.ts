import mongoose, { Schema, Document } from 'mongoose';

export interface IExercise extends Document {
  name: string;
  description: string;
  category: string[];
  instructions: string[];
  equipment: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  clientLevel: 'principiante' | 'intermedio' | 'avanzado';
  muscleGroups: string[];
  contraindications: string[];
  sets: number;
  repetitions: string;
  timeUnderTension: string;
  restBetweenSets: string;
  progression: string;
  demo: {
    url: string;
    key: string;
    type: 'image' | 'gif' | 'video' | 'placeholder' | 'youtube_search';
    name: string;
    size: number;
    uploadedAt: string;
    videoSearchUrl?: string;
  };
  progressionOf?: mongoose.Types.ObjectId;
  progressesTo?: mongoose.Types.ObjectId[];
  author?: string; // Coach name/email who created it
  isPublished: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: [String], required: true },
  instructions: { type: [String], required: true },
  equipment: { type: [String], required: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  clientLevel: {
    type: String,
    enum: ['principiante', 'intermedio', 'avanzado'],
    required: true
  },
  muscleGroups: { type: [String], required: true },
  contraindications: { type: [String], default: [] },
  sets: { type: Number, required: true, default: 3 },
  repetitions: { type: String, required: true },
  timeUnderTension: { type: String, required: true, default: '3-1-1' },
  restBetweenSets: { type: String, required: true, default: '45-60 segundos' },
  progression: { type: String, required: true },
  demo: {
    url: { type: String, required: true, default: '' },
    key: { type: String, required: true, default: '' },
    type: { type: String, enum: ['image', 'gif', 'video', 'placeholder', 'youtube_search'], default: 'placeholder' },
    name: { type: String, required: true, default: '' },
    size: { type: Number, required: true, default: 0 },
    uploadedAt: { type: String, required: true, default: '' },
    videoSearchUrl: { type: String, default: '' },
  },
  progressionOf: { type: Schema.Types.ObjectId, ref: 'Exercise', default: null },
  progressesTo: [{ type: Schema.Types.ObjectId, ref: 'Exercise' }],
  author: { type: String, default: 'NelHealthCoach' },
  isPublished: { type: Boolean, default: true },
  tags: { type: [String], default: [] },
}, {
  timestamps: true
});

ExerciseSchema.index({ tags: 'text', name: 'text', category: 'text' });

export default mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);
