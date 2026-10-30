import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  profileSettings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "user" },
    profileSettings: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
