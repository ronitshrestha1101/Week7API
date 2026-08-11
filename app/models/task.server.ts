import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITask {
  id?: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskDocument extends Document {
  title: string;
  description?: string;
  isCompleted: boolean;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Task: Model<ITaskDocument> =
  mongoose.models.Task || mongoose.model<ITaskDocument>("Task", TaskSchema);
