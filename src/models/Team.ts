import mongoose, { Schema, Document, Model } from "mongoose";

/*
 * Team Interface
 */
export interface ITeam extends Document {
  teamName: string;
  email: string;
  codeforcesHandle?: string | null;
  hasRound2Access?: boolean;
}

/*
 * Team Schema
 */
const TeamSchema: Schema<ITeam> = new Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  // Will be set only the first time
  codeforcesHandle: {
    type: String,
    default: null,
    trim: true,
  },

  hasRound2Access: {
    type: Boolean,
    default: false,
  },
});

/**
 * Team Model
 */
const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
