import "dotenv/config";
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
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

connectDB()
  .then(() => {
    app.use("/auth", authRoutes);
    app.use("/stream", streamRoutes);
    app.get("/", (req, res) => res.send("Server is running"));
    app.get('/keep-alive', (req, res) => {
      res.send('Server is alive');
    });

    setInterval(() => {
      fetch('https://fixmate-b5hi.onrender.com/keep-alive')
        .then(() => console.log('Pinged self'))
        .catch(err => console.error('Ping failed', err));
    }, 5 * 60 * 1000);

    const PORT = process.env.PORT;
    server.listen(PORT);
  })
  .catch(() => { console.log("Failed to connect to DB") });