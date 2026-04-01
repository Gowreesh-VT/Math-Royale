import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IPowerUpAttempt extends Document {
  matchId: Types.ObjectId;
  teamId: Types.ObjectId;
  side: 'A' | 'B';
  powerUpKey: string;
  codeforcesHandle: string;
  contestId: string;
  problemIndex: string;
  submissionId: number;
  verdict: string;
  passedTestCount: number;
  pointsDelta: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PowerUpAttemptSchema = new Schema<IPowerUpAttempt>(
  {
    matchId: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    side: {
      type: String,
      enum: ['A', 'B'],
      required: true,
    },
    powerUpKey: {
      type: String,
      required: true,
      trim: true,
    },
    codeforcesHandle: {
      type: String,
      required: true,
      trim: true,
    },
    contestId: {
      type: String,
      required: true,
      trim: true,
    },
    problemIndex: {
      type: String,
      required: true,
      trim: true,
    },
    submissionId: {
      type: Number,
      required: true,
      unique: true,
    },
    verdict: {
      type: String,
      required: true,
      trim: true,
    },
    passedTestCount: {
      type: Number,
      required: true,
      default: 0,
    },
    pointsDelta: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

PowerUpAttemptSchema.index({ matchId: 1, teamId: 1, powerUpKey: 1 });
PowerUpAttemptSchema.index({ matchId: 1, side: 1, powerUpKey: 1 });

const PowerUpAttempt: Model<IPowerUpAttempt> =
  mongoose.models.PowerUpAttempt ||
  mongoose.model<IPowerUpAttempt>('PowerUpAttempt', PowerUpAttemptSchema);

export default PowerUpAttempt;
