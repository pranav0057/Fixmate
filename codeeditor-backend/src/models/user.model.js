import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      minlength: 2,
      maxlength: 50,
      required: false,
    },
    username: {
      type: String,
      minlength: 2,
      maxlength: 50,
      required: false,
    },
    password: {
      type: String, 
      minlength: 6, 
      maxlength: 100, 
      required: false,
    },
    googleId: {
      type: String, 
      required: false,
    },
    email: {
      type: String, 
      lowercase: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
      required: false,
    },
    resetPasswordToken: {
      type: String,
      required: false,
    },
    resetPasswordExpires: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
