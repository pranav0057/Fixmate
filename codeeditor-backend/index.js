import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./src/routes/auth.routes.js";
import streamRoutes from "./src/routes/stream.routes.js";
import http from "http";
import { initSocket } from "./socket.js";
import { connectDB } from "./src/config/db.js";
import "./src/config/firebaseAdmin.js";

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(cookieParser());
app.use(
  cors({
    origin: "https://fixmate-1-21m8.onrender.com/",
    credentials: true,
  })
);
app.use(express.json());

connectDB()
  .then(() => {
    app.use("/auth", authRoutes);
    app.use("/stream", streamRoutes);
    app.get("/", (req, res) => res.send("Server is running"));

    const PORT = process.env.PORT;
    server.listen(PORT);
  })
  .catch(() => {});