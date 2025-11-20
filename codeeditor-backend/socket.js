import { Server } from "socket.io";
import { v4 as uuidV4 } from "uuid";

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userMap = new Map();
  const roomParticipants = new Map();
  const roomOwners = new Map();
  const roomPages = new Map();
  const DISCONNECT_GRACE_MS = 7000;

  const createNewPage = (name = "Page 1") => ({
    id: uuidV4(),
    name,
    language: "javascript",
    code: '// Welcome to your new page!\nconsole.log("Hello!");',
    stdin: "",
    output: "",
  });

  const getRoomUsers = (roomId) => {
    const userIds = roomParticipants.get(roomId);
    if (!userIds) return [];
    return Array.from(userIds).map((uid) => {
      const u = userMap.get(uid);
      return u
        ? { userId: uid, name: u.name, isOnline: true }
        : { userId: uid, name: "Unknown", isOnline: false };
    });
  };

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, userName, userId }) => {
      socket.join(roomId);
      if (!userId) return;

      const existingUser = userMap.get(userId);
      userMap.set(userId, {
        socketId: socket.id,
        name: userName,
        roomId,
        lastSeen: Date.now(),
      });

      if (!roomParticipants.has(roomId)) {
        roomOwners.set(roomId, userId);
        roomParticipants.set(roomId, new Set());
        socket.emit("get-room-owner", { ownerId: userId });
      } else {
        socket.emit("get-room-owner", { ownerId: roomOwners.get(roomId) });
      }

      roomParticipants.get(roomId).add(userId);

      if (!roomPages.has(roomId)) {
        roomPages.set(roomId, [createNewPage("Page 1")]);
      }

      socket.emit("pages-update", roomPages.get(roomId));

      const users = getRoomUsers(roomId);
      io.to(roomId).emit("participants-update", users);
      socket.emit("self-joined", { userId, roomId, users });
      socket.to(roomId).emit("user-joined", { userName, userId });
    });

    socket.on("leave-room", ({ roomId, userId }, callback) => {
      userMap.delete(userId);

      const set = roomParticipants.get(roomId);
      if (set) {
        set.delete(userId);
        if (set.size === 0) roomParticipants.delete(roomId);
      }

      io.to(roomId).emit("participants-update", getRoomUsers(roomId));
      socket.leave(roomId);

      if (callback) callback({ status: "ok" });
    });

    socket.on("send-message", (msg, callback) => {
      const { roomId, userName, message, time, userId } = msg;
      socket.to(roomId).emit("receive-message", {
        userName,
        message,
        userId,
        sendtime: time,
        time: new Date().toISOString(),
      });
      if (callback) callback({ status: "delivered" });
    });

    socket.on("content-change", ({ roomId, pageId, updates }) => {
      const pages = roomPages.get(roomId);
      if (!pages) return;

      const page = pages.find((p) => p.id === pageId);
      if (page) Object.assign(page, updates);

      socket.broadcast.to(roomId).emit("content-update", { pageId, updates });
    });

    socket.on("add-page", ({ roomId, name }) => {
      const pages = roomPages.get(roomId);
      if (!pages) return;

      const newPage = createNewPage(name);
      pages.push(newPage);
      io.to(roomId).emit("pages-update", pages);
    });

    socket.on("close-page", ({ roomId, pageId }) => {
      const pages = roomPages.get(roomId);
      if (!pages) return;

      const newPages = pages.filter((p) => p.id !== pageId);
      roomPages.set(roomId, newPages);
      io.to(roomId).emit("pages-update", newPages);
    });

    socket.on("end-room", ({ roomId, userId }, callback) => {
      const ownerId = roomOwners.get(roomId);
      if (userId !== ownerId) return;

      io.to(roomId).emit("room-ended", {
        message: "The room has been ended by the owner.",
      });

      if (callback) callback({ status: "ok" });

      setTimeout(() => {
        const userIds = roomParticipants.get(roomId);
        if (userIds) {
          userIds.forEach((uid) => userMap.delete(uid));
        }

        roomParticipants.delete(roomId);
        roomOwners.delete(roomId);
        roomPages.delete(roomId);
      }, 2000);
    });

    socket.on("remove-participant", ({ roomId, userId, userIdToKick }) => {
      const ownerId = roomOwners.get(roomId);
      if (userId !== ownerId) return;

      const kickedUser = userMap.get(userIdToKick);
      if (!kickedUser || kickedUser.roomId !== roomId) return;

      const kickedSocketId = kickedUser.socketId;

      io.to(kickedSocketId).emit("kicked", {
        message: "You were removed from the room.",
      });

      userMap.delete(userIdToKick);
      const set = roomParticipants.get(roomId);
      if (set) set.delete(userIdToKick);

      io.to(roomId).emit("participants-update", getRoomUsers(roomId));

      const kickedSock = io.sockets.sockets.get(kickedSocketId);
      kickedSock?.leave(roomId);
      kickedSock?.disconnect(true);
    });

    socket.on("disconnect", () => {
      const userEntry = [...userMap.entries()].find(
        ([, v]) => v.socketId === socket.id
      );
      if (!userEntry) return;

      const [userId, userData] = userEntry;
      const { roomId } = userData;
      const disconnectedSocketId = socket.id;

      setTimeout(() => {
        const currentUser = userMap.get(userId);
        if (currentUser && currentUser.socketId !== disconnectedSocketId) return;
        if (!currentUser) return;

        userMap.delete(userId);

        const set = roomParticipants.get(roomId);
        if (set) {
          set.delete(userId);
          if (set.size === 0) {
            roomParticipants.delete(roomId);
            roomPages.delete(roomId);
          }
        }

        io.to(roomId).emit("participants-update", getRoomUsers(roomId));
      }, DISCONNECT_GRACE_MS);
    });
  });

  return io;
};