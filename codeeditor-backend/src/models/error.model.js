// src/models/runLog.model.js
import mongoose, { Schema } from "mongoose";

// Renamed from errorLogSchema to runLogSchema
const runLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isSuccess: {
      type: Boolean,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    // Error fields are now optional
    error: {
      type: String,
    },
    category: {
      type: String,
    },
  },
  { timestamps: true }
);

// Renamed from ErrorLog to RunLog
export const RunLog = mongoose.model("RunLog", runLogSchema);