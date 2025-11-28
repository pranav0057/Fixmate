import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import { registerSchema } from "../utils/zod-schema.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/jwt-setup.js";
import admin from "../config/firebaseAdmin.js";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RunLog } from "../models/error.model.js";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

const systemPrompt = `
You are 'Debug-Buddy', a friendly, encouraging, and expert coding assistant.
Your primary goal is NOT to just give the answer, but to help the user learn and improve their thinking skills.

Follow these rules STRICTLY:
1.  **Be Friendly & Encouraging:** Always use a positive, helpful tone.
2.  **Explain Concepts Simply:** If the user has an error (like 'TypeError' or 'ReferenceError'), first explain what that error *means* in simple, easy-to-understand terms.
3.  **Guide, Don't Just Solve:**
    * NEVER just provide the final, corrected code block.
    * INSTEAD, point the user to the *area* of the problem.
    * ASK guiding questions. (e.g., "It looks like the error is on line 10. That error often means 'user' is undefined. Have you checked if 'user' has a value before you try to access 'user.name'?")
4.  **Promote Critical Thinking:** When asked for help or "how to," explain the *'why'* behind the concept. Help the user understand the *principles* so they can solve it themselves.
5.  **Keep it Clear & Concise:** Use simple language. Avoid overly technical jargon. Use bullet points or short paragraphs.
`;

export const firebaseLogin = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    if (!idToken) {
      return res.status(401).json({ message: "No ID token provided" });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    let user = await User.findOne({
      $or: [{ googleId: uid }, { email: email }],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = uid;
        await user.save();
      }
    } else {
      user = await User.create({
        name: name || "New User",
        email,
        googleId: uid,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .status(200)
      .json({
        message: "Login successful",
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username || user.name.split(" ")[0],
        },
      });
  } catch (error) {
    return res.status(401).json({ message: `Firebase login error: ${error}` });
  }
};

export const registerUser = async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res
        .status(400)
        .json({ errors: result.error.issues.map((issue) => issue.message) });
    }

    const { name, username, password, email } = result.data;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      name,
      email,
      password: hashedPassword,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .status(201)
      .json({
        message: "User registered successfully",
        accessToken,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
        },
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
};

export const loginUser = async (req, res) => {
  try {
    const parsedData = req.body;
    if (!parsedData) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const { username, password } = parsedData;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      })
      .status(200)
      .json({
        message: "Login successful",
        accessToken,
        user,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong. Please try again." });
  }
};

export const logOutUser = async (req, res) => {
  return res
    .status(200)
    .clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    })
    .json({ message: "User Logout successful" });
};

export const checkUser = async (req, res) => {
  const { username } = req.query;
  const userExists = await User.findOne({ username });
  return res.json({ available: !userExists });
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email || "",
    username: req.user.username || req.user.name.split(" ")[0],
  });
};

export const askBuddy = async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const fullPrompt = `${systemPrompt}\n\nHere is the user's question:\n${prompt}`;
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ answer: text });
  } catch (error) {
    res.status(500).json({ error: "Failed to get response from AI" });
  }
};

export const logRun = async (req, res) => {
  try {
    const { isSuccess, language, code, error, category } = req.body;
    const userId = req.user._id;

    if (isSuccess === undefined || !language || !code) {
      return res.status(400).json({ message: "Missing required run fields" });
    }

    if (!isSuccess && (!error || !category)) {
      return res.status(400).json({ message: "Error log must include error and category" });
    }

    const newLog = await RunLog.create({
      user: userId,
      isSuccess,
      language,
      code,
      error: isSuccess ? undefined : error,
      category: isSuccess ? undefined : category,
    });

    res.status(201).json({ message: "Run logged successfully", log: newLog });
  } catch (err) {
    res.status(500).json({ message: "Server error while logging run" });
  }
};

export const getRunLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    const logs = await RunLog.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching logs" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
  <div style="font-family:Arial, sans-serif; max-width:500px; margin:0 auto; line-height:1.6;">
    <h2 style="color:#222;">FixMate — Password Reset</h2>

    <p>Hello,</p>

    <p>We received a request to reset the password for your FixMate account. 
    If you didn’t make this request, you can safely ignore this email.</p>

    <p style="margin: 20px 0;">
      <a href="${resetURL}" 
         style="background:#1A73E8; color:#fff; padding:12px 18px; text-decoration:none; border-radius:6px; font-size:16px;">
         Reset Password
      </a>
    </p>

    <p>If the button does not work, copy and paste the URL below:</p>
    <p style="font-size:14px; color:#555; word-break:break-all;">${resetURL}</p>

    <p>This reset link will expire in 10 minutes.</p>

    <br>
    <p>Best regards,<br>FixMate Support Team</p>

    <hr style="margin-top:30px; border:none; border-top:1px solid #ccc;" />
    <p style="font-size:12px; color:#777;">
      This is an automated email from FixMate. Replies to this address are not monitored.
    </p>
  </div>
`;


    await sendEmail({
      email: user.email,
      subject: "Reset your FixMate password",
      message,
    });

    res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Token is invalid or has expired." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful! You can now log in." });

  } catch (error) {
    res.status(500).json({ message: "Error resetting password." });
  }
};