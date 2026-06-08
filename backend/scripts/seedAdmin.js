import "../config/env.js";

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import SystemLog from "../models/SystemLog.js";

const seedAdmin = async () => {
  await connectDB();

  const name = process.env.ADMIN_NAME || "RAGNEXUS Admin";
  const email = (process.env.ADMIN_EMAIL || "admin@ragnexus.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!password && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD is required when seeding an admin in production");
  }

  const safePassword = password || "ChangeThisAdminPassword123!";

  if (safePassword.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters");
  }

  const passwordHash = await User.hashPassword(safePassword);
  const user = await User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      passwordHash,
      role: "admin",
      status: "active",
      passwordChangedAt: new Date()
    },
    { upsert: true, new: true, runValidators: true }
  );

  await SystemLog.write({
    actor: user._id,
    level: "audit",
    action: "seed.admin",
    message: `Admin user seeded for ${email}`
  });

  console.log(`Admin ready: ${email}`);
};

seedAdmin()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
