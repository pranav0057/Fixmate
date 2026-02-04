import { Server } from "socket.io";
import { v4 as uuidV4 } from "uuid";

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const userMap = new Map();
  const roomParticipants = new Map();
  const roomOwners = new Map();
  const roomPages = new Map();
  const DISCONNECT_GRACE_MS = 7000;

  /* ---------------- PAGE FACTORY ---------------- */
  const createNewPage = (name = "Page 1") => ({
    id: uuidV4(),
    name,
    language: "javascript",
    code: "",
    stdin: "",
    output: "",
  });

  // ✅ UPDATED: Include 'isInCall' in the user object
  const getRoomUsers = (roomId) => {
    const userIds = roomParticipants.get(roomId);
    if (!userIds) return [];
    return Array.from(userIds).map((uid) => {
      const u = userMap.get(uid);
      return u
        ? {
            userId: uid,
            name: u.name,
            isOnline: true,
            isInCall: u.isInCall , // Return the status
          }
        : {
            userId: uid,
            name: "Unknown",
            isOnline: false,
            isInCall: false,
          };
    });
  };

  io.on("connection", (socket) => {
    /* ---------------- JOIN ROOM ---------------- */
    socket.on("join-room", ({ roomId, userName, userId }) => {
      socket.join(roomId);
      if (!userId) return;

      // ✅ UPDATED: Initialize with isInCall: false
      userMap.set(userId, {
        socketId: socket.id,
        name: userName,
        roomId,
        lastSeen: Date.now(),
        isInCall: false, 
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

    /* ---------------- NEW: STATUS UPDATE LISTENER ---------------- */
    socket.on("user-status-update", ({ roomId, userId, status }) => {
      const user = userMap.get(userId);
      
      console.log("Received update for call status", status);
      if (user && user.roomId === roomId) {
        // Update the specific property (isInCall)
        if (status.hasOwnProperty("isInCall")) {
          user.isInCall = status.isInCall;
        }
        console.log("Updated user status:", user);
        console.log(getRoomUsers(roomId))
        io.to(roomId).emit("participants-update", getRoomUsers(roomId));
      }
    });

    /* ---------------- LEAVE ROOM ---------------- */
    socket.on("leave-room", ({ roomId, userId }, callback) => {
      userMap.delete(userId); // Automatically clears inCall status

      const set = roomParticipants.get(roomId);
      if (set) {
        set.delete(userId);
        if (set.size === 0) roomParticipants.delete(roomId);
      }

      io.to(roomId).emit("participants-update", getRoomUsers(roomId));
      socket.leave(roomId);

      if (callback) callback({ status: "ok" });
    });

    // ... (Keep Chat, Metadata Sync, Editor OT, Page Mgmt as is) ...
    /* ---------------- CHAT ---------------- */
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

    /* ---------------- METADATA SYNC ---------------- */
    socket.on("content-change", ({ roomId, pageId, userId, updates }) => {
      const pages = roomPages.get(roomId);
      if (!pages) return;
      const page = pages.find((p) => p.id === pageId);
      if (page) Object.assign(page, updates);
      socket.broadcast.to(roomId).emit("content-update", {
        pageId,
        userId,
        updates,
      });
    });

    /* ---------------- EDITOR OT RELAY ---------------- */
    socket.on("editor-op", ({ roomId, pageId, userId, range, text }) => {
      socket.broadcast.to(roomId).emit("editor-op", {
        roomId,
        pageId,
        userId,
        range,
        text,
      });
    });

    /* ---------------- PAGE MGMT ---------------- */
    socket.on("add-page", ({ roomId, name }) => {
      const pages = roomPages.get(roomId);
      if (!pages) return;
      pages.push(createNewPage(name));
      io.to(roomId).emit("pages-update", pages);
    });

    socket.on("close-page", ({ roomId, pageId }) => {
      const pages = roomPages.get(roomId);
      if (!pages) return;
      const newPages = pages.filter((p) => p.id !== pageId);
      roomPages.set(roomId, newPages);
      io.to(roomId).emit("pages-update", newPages);
    });

    /* ---------------- CHANGE ROOM OWNER ---------------- */
    socket.on("change-room-owner", ({ roomId, currentOwnerId, newOwnerId }) => {
      if (!roomId || !currentOwnerId || !newOwnerId) return;
      if (roomOwners.get(roomId) !== currentOwnerId) return;
      const participants = roomParticipants.get(roomId);
      if (!participants || !participants.has(newOwnerId)) return;
      roomOwners.set(roomId, newOwnerId);
      io.to(roomId).emit("room-owner-changed", { ownerId: newOwnerId });
    });

    /* ---------------- END ROOM ---------------- */
    socket.on("end-room", ({ roomId, userId }, callback) => {
      if (roomOwners.get(roomId) !== userId) return;
      io.to(roomId).emit("room-ended", { message: "The room has been ended." });
      if (callback) callback({ status: "ok" });
      setTimeout(() => {
        const users = roomParticipants.get(roomId);
        if (users) users.forEach((uid) => userMap.delete(uid));
        roomParticipants.delete(roomId);
        roomOwners.delete(roomId);
        roomPages.delete(roomId);
      }, 2000);
    });

    /* ---------------- KICK USER ---------------- */
    socket.on("remove-participant", ({ roomId, userId, userIdToKick }) => {
      if (roomOwners.get(roomId) !== userId) return;
      const kickedUser = userMap.get(userIdToKick);
      if (!kickedUser || kickedUser.roomId !== roomId) return;
      io.to(kickedUser.socketId).emit("kicked", { message: "You were removed." });
      userMap.delete(userIdToKick);
      roomParticipants.get(roomId)?.delete(userIdToKick);
      io.to(roomId).emit("participants-update", getRoomUsers(roomId));
      const sock = io.sockets.sockets.get(kickedUser.socketId);
      sock?.leave(roomId);
      sock?.disconnect(true);
    });

    /* ---------------- DISCONNECT ---------------- */
    socket.on("disconnect", () => {
      const entry = [...userMap.entries()].find(
        ([, v]) => v.socketId === socket.id
      );
      if (!entry) return;

      const [userId, { roomId }] = entry;
      const socketId = socket.id;

      setTimeout(() => {
        const u = userMap.get(userId);
        if (!u || u.socketId !== socketId) return;

        userMap.delete(userId); // Deletion implicitly handles isInCall -> false
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