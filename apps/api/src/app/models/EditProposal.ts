import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEditProposal extends Document {
  targetType: 'recipe' | 'exercise';
  targetId: Types.ObjectId;
  proposedChanges: Record<string, unknown>;
  proposedBy: Types.ObjectId;
  proposedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: Types.ObjectId;
  reviewedByName?: string;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EditProposalSchema = new Schema<IEditProposal>(
  {
    targetType: {
      type: String,
      enum: ['recipe', 'exercise'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
    },
    proposedChanges: {
      type: Schema.Types.Mixed,
      required: true,
    },
    proposedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Coach',
      required: true,
    },
    proposedByName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Coach',
    },
    reviewedByName: {
      type: String,
    },
    reviewNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

EditProposalSchema.index({ targetType: 1, targetId: 1 });
EditProposalSchema.index({ proposedBy: 1 });
EditProposalSchema.index({ status: 1 });

export default mongoose.models.EditProposal ||
  mongoose.model<IEditProposal>('EditProposal', EditProposalSchema);
