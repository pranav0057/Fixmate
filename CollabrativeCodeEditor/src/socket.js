backend_url=import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import { io } from "socket.io-client";
export const socket =  io(backend_url, {
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("Connected to Socket.IO:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected from Socket.IO");
});