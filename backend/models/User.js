import bcrypt from "bcrypt";
import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Email must be valid"
      }
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["admin", "developer", "user"],
      default: "user",
      index: true
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true
    },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    preferences: {
      citationDensity: {
        type: String,
        enum: ["compact", "balanced", "expanded"],
        default: "balanced"
      }
    }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!candidatePassword || !this.passwordHash) {
    return false;
  }

  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(password) {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  return bcrypt.hash(password, saltRounds);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    preferences: this.preferences
  };
};

export default mongoose.model("User", userSchema);
