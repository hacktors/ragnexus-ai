import User from "../models/User.js";
import SystemLog from "../models/SystemLog.js";
import { signToken } from "../middleware/auth.js";

const issueAuthResponse = (user) => ({
  token: signToken(user),
  user: user.toSafeObject()
});

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  if (String(password).length < 10) {
    return res.status(400).json({ message: "Password must be at least 10 characters" });
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "An account already exists for this email" });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: "user"
  });

  await SystemLog.write({
    actor: user._id,
    level: "audit",
    action: "auth.register",
    message: "User registered",
    req
  });

  res.status(201).json(issueAuthResponse(user));
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+passwordHash");
  if (!user || user.status !== "active") {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    await SystemLog.write({
      actor: user._id,
      level: "security",
      action: "auth.login_failed",
      message: "Failed login attempt",
      req
    });
    return res.status(401).json({ message: "Invalid credentials" });
  }

  user.lastLoginAt = new Date();
  await user.save();

  await SystemLog.write({
    actor: user._id,
    level: "audit",
    action: "auth.login",
    message: "User logged in",
    req
  });

  res.json(issueAuthResponse(user));
};

export const me = (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};
