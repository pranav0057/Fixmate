import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { StreamClient } from "@stream-io/node-sdk";

const router = express.Router();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

const streamServerClient = new StreamClient(apiKey, apiSecret);

router.get("/token/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const token = streamServerClient.createToken(userId);
    res.status(200).json({ token, apiKey });
  } catch (err) {
    console.error("Stream token error:", err);
    res.status(500).json({ error: "Failed to generate Stream token" });
  }
});

export default router;