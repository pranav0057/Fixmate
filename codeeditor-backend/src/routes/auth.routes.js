import express from "express";
import {
  registerUser,
  loginUser,
  firebaseLogin,
  checkUser,
  getCurrentUser,
  logOutUser,
  askBuddy,
  logRun,
  getRunLogs,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../utils/jwt-setup.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-login", firebaseLogin);
router.get("/check-username", checkUser);
router.route("/logout").post(verifyJWT, logOutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.post("/ask-buddy",askBuddy);
router.post("/log-run", verifyJWT, logRun);
router.get("/get-run-logs", verifyJWT, getRunLogs);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
