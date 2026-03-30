import mongoose, { Schema, Document } from 'mongoose';

/**
 * Round1Session Interface
 * Manages the state and timing of Round 1
 */
export interface IRound1Session extends Document {
  isActive: boolean;
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  autoStop: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const Round1SessionSchema = new Schema<IRound1Session>(
  {
    isActive: {
      type: Boolean,
      required: true,
      default: false,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      required: true,
      default: 60, // default 1 hour
    },
    autoStop: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one session document exists
Round1SessionSchema.index({ isActive: 1 });

const Round1Session = mongoose.models.Round1Session || 
  mongoose.model<IRound1Session>('Round1Session', Round1SessionSchema);

export default Round1Session;
