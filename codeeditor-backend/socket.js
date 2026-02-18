import { Server } from "socket.io";
import { v4 as uuidV4 } from "uuid";

const DEFAULT_ROOM_SETTINGS = Object.freeze({
  pageCreation: "anyone",
  defaultEdit: "everyone",
});

const VALID_PAGE_CREATION = new Set(["anyone", "owner"]);
const VALID_DEFAULT_EDIT = new Set(["everyone", "creator"]);
const VALID_PERMISSION_MODES = new Set(["everyone", "selected", "readonly"]);

const sanitizeRoomSettings = (settings = {}) => ({
  pageCreation: VALID_PAGE_CREATION.has(settings.pageCreation)
    ? settings.pageCreation
    : DEFAULT_ROOM_SETTINGS.pageCreation,
  defaultEdit: VALID_DEFAULT_EDIT.has(settings.defaultEdit)
    ? settings.defaultEdit
    : DEFAULT_ROOM_SETTINGS.defaultEdit,
});

const sanitizePagePermissions = (permissions = {}, fallbackMode = "everyone") => {
  const modeCandidate = permissions?.mode;
  const mode = VALID_PERMISSION_MODES.has(modeCandidate)
    ? modeCandidate
    : VALID_PERMISSION_MODES.has(fallbackMode)
      ? fallbackMode
      : "everyone";

  const editors = Array.isArray(permissions?.editors)
    ? [...new Set(permissions.editors.filter((id) => typeof id === "string" && id.trim().length > 0))]
    : [];

  return {
    mode,
    editors: mode === "selected" ? editors : [],
  };
};

const defaultPermissionsForNewPage = (roomSetting, creatorId) => {
  if (roomSetting.defaultEdit === "creator") {
    return {
      mode: "selected",
      editors: [],
    };
  }

  return {
    mode: "everyone",
    editors: [],
  };
};

const createNewPage = (name = "Page 1", creatorId = null, roomSetting = DEFAULT_ROOM_SETTINGS) => ({
  id: uuidV4(),
  name,
  language: "javascript",
  code: "",
  stdin: "",
  output: "",
  createdBy: creatorId,
  permissions: defaultPermissionsForNewPage(roomSetting, creatorId),
});

const normalizePage = (page, ownerId) => ({
  id: page?.id || uuidV4(),
  name: typeof page?.name === "string" && page.name.trim().length > 0 ? page.name : "Untitled",
  language: page?.language || "javascript",
  code: page?.code ?? "",
  stdin: page?.stdin ?? "",
  output: page?.output ?? "",
  createdBy: page?.createdBy || ownerId || null,
  permissions: sanitizePagePermissions(page?.permissions, "everyone"),
});

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
  const roomSettings = new Map();
  const roomPagePermissionBackups = new Map();
  const DISCONNECT_GRACE_MS = 7000;

  const cleanupRoomState = (roomId) => {
    roomParticipants.delete(roomId);
    roomOwners.delete(roomId);
    roomPages.delete(roomId);
    roomSettings.delete(roomId);
    roomPagePermissionBackups.delete(roomId);
  };

  const clonePermissions = (permissions, fallbackMode = "selected") =>
    sanitizePagePermissions(
      {
        mode: permissions?.mode,
        editors: Array.isArray(permissions?.editors) ? [...permissions.editors] : [],
      },
      fallbackMode
    );

  const parsePreservedPermissions = (preservedPermissions) => {
    if (!preservedPermissions || typeof preservedPermissions !== "object") {
      return new Map();
    }

    return new Map(
      Object.entries(preservedPermissions)
        .filter(([pageId]) => typeof pageId === "string" && pageId.trim().length > 0)
        .map(([pageId, permissions]) => [pageId, clonePermissions(permissions, "selected")])
    );
  };

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
            isInCall: !!u.isInCall,
          }
        : {
            userId: uid,
            name: "Unknown",
            isOnline: false,
            isInCall: false,
          };
    });
  };

  const isRoomOwner = (roomId, userId) => roomOwners.get(roomId) === userId;

  const getOrInitRoomSettings = (roomId) => {
    if (!roomSettings.has(roomId)) {
      roomSettings.set(roomId, { ...DEFAULT_ROOM_SETTINGS });
    }
    return roomSettings.get(roomId);
  };

  const getOrInitRoomPages = (roomId, creatorId) => {
    if (!roomPages.has(roomId)) {
      const setting = getOrInitRoomSettings(roomId);
      roomPages.set(roomId, [createNewPage("Page 1", creatorId, setting)]);
    } else {
      const ownerId = roomOwners.get(roomId);
      roomPages.set(
        roomId,
        roomPages.get(roomId).map((p) => normalizePage(p, ownerId))
      );
    }

    return roomPages.get(roomId);
  };

  const assignNextOwnerIfNeeded = (roomId, departedUserId) => {
    const participants = roomParticipants.get(roomId);
    if (!participants || participants.size === 0) {
      cleanupRoomState(roomId);
      return;
    }

    const currentOwner = roomOwners.get(roomId);
    if (currentOwner && currentOwner !== departedUserId) return;

    const nextOwnerId = participants.values().next().value;
    if (!nextOwnerId) {
      cleanupRoomState(roomId);
      return;
    }

    roomOwners.set(roomId, nextOwnerId);
    io.to(roomId).emit("room-owner-changed", { ownerId: nextOwnerId });
  };

  const removeUserFromRoom = (roomId, userId) => {
    const participants = roomParticipants.get(roomId);
    if (!participants) return;

    participants.delete(userId);

    if (participants.size === 0) {
      cleanupRoomState(roomId);
      return;
    }

    assignNextOwnerIfNeeded(roomId, userId);

    const pages = roomPages.get(roomId) || [];
    const currentOwnerId = roomOwners.get(roomId) || null;
    let reassigned = false;

    if (currentOwnerId) {
      pages.forEach((page) => {
        if (page.createdBy === userId) {
          page.createdBy = currentOwnerId;
          reassigned = true;
        }
      });
    }

    if (reassigned) {
      io.to(roomId).emit("pages-update", pages);
    }

    io.to(roomId).emit("participants-update", getRoomUsers(roomId));
  };

  const canCreatePage = (roomId, userId) => {
    const setting = getOrInitRoomSettings(roomId);
    if (setting.pageCreation === "anyone") return true;
    return isRoomOwner(roomId, userId);
  };

  const canManagePagePermissions = (roomId, page, userId) => {
    if (!page) return false;
    return isRoomOwner(roomId, userId) || page.createdBy === userId;
  };

  const canEditPage = (roomId, page, userId) => {
    if (!page || !userId) return false;
    if (isRoomOwner(roomId, userId)) return true;
    if (page.createdBy === userId) return true;

    const permissions = sanitizePagePermissions(page.permissions, "everyone");
    if (permissions.mode === "readonly") return false;
    if (permissions.mode === "selected") return permissions.editors.includes(userId);
    return true;
  };

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, userName, userId }) => {
      if (!roomId || !userId) return;

      const previousSession = userMap.get(userId);
      if (previousSession && previousSession.roomId && previousSession.roomId !== roomId) {
        removeUserFromRoom(previousSession.roomId, userId);
      }

      socket.join(roomId);

      userMap.set(userId, {
        socketId: socket.id,
        name: userName,
        roomId,
        lastSeen: Date.now(),
        isInCall: false,
      });

      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Set());
      }
      roomParticipants.get(roomId).add(userId);

      if (!roomOwners.has(roomId)) {
        roomOwners.set(roomId, userId);
      }

      if (roomOwners.get(roomId) === userId) {
        socket.emit("room-owner-assigned", { isOwner: true });
      }

      const ownerId = roomOwners.get(roomId);
      const settings = getOrInitRoomSettings(roomId);
      const pages = getOrInitRoomPages(roomId, userId);

      socket.emit("get-room-owner", { ownerId });
      socket.emit("room-settings-update", settings);
      socket.emit("pages-update", pages);

      io.to(roomId).emit("participants-update", getRoomUsers(roomId));
      socket.emit("self-joined", { userId, roomId, users: getRoomUsers(roomId) });
      socket.to(roomId).emit("user-joined", { userName, userId });
    });

    socket.on("user-status-update", ({ roomId, userId, status }) => {
      const user = userMap.get(userId);
      if (!user || user.roomId !== roomId) return;

      if (Object.prototype.hasOwnProperty.call(status || {}, "isInCall")) {
        user.isInCall = status.isInCall;
      }

      io.to(roomId).emit("participants-update", getRoomUsers(roomId));
    });

    socket.on("leave-room", ({ roomId, userId }, callback) => {
      const user = userMap.get(userId);
      if (user && user.roomId === roomId) {
        userMap.delete(userId);
      }

      removeUserFromRoom(roomId, userId);
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

    socket.on("update-room-settings", ({ roomId, userId, settings, preservedPermissions }, callback) => {
      if (!roomId || !userId) {
        callback?.({ status: "error", message: "Invalid room settings request." });
        return;
      }

      if (!isRoomOwner(roomId, userId)) {
        callback?.({ status: "error", message: "Only the room owner can update room settings." });
        return;
      }

      const currentSettings = getOrInitRoomSettings(roomId);
      const nextSettings = sanitizeRoomSettings(settings);
      roomSettings.set(roomId, nextSettings);

      if (currentSettings.defaultEdit !== nextSettings.defaultEdit) {
        const pages = roomPages.get(roomId) || [];
        const ownerId = roomOwners.get(roomId) || null;

        if (nextSettings.defaultEdit === "everyone") {
          const snapshot = new Map();
          pages.forEach((page) => {
            snapshot.set(page.id, clonePermissions(page.permissions, "selected"));
            page.permissions = sanitizePagePermissions(
              {
                mode: "everyone",
                editors: [],
              },
              "everyone"
            );
          });
          roomPagePermissionBackups.set(roomId, snapshot);
        } else {
          const existingBackup = roomPagePermissionBackups.get(roomId);
          const fallbackBackup = parsePreservedPermissions(preservedPermissions);
          const backup =
            existingBackup && existingBackup.size > 0 ? existingBackup : fallbackBackup;

          if (backup.size > 0 && (!existingBackup || existingBackup.size === 0)) {
            roomPagePermissionBackups.set(roomId, backup);
          }

          pages.forEach((page) => {
            const creatorId = page.createdBy || ownerId;
            page.createdBy = creatorId || null;

            const restoredPermissions = backup.get(page.id);
            if (restoredPermissions) {
              page.permissions = clonePermissions(restoredPermissions, "selected");
              return;
            }

            page.permissions = sanitizePagePermissions(
              {
                mode: "selected",
                editors: [],
              },
              "selected"
            );
          });
        }

        io.to(roomId).emit("pages-update", pages);
      }

      io.to(roomId).emit("room-settings-update", nextSettings);
      callback?.({ status: "ok", settings: nextSettings });
    });

    socket.on("update-page-permissions", ({ roomId, pageId, userId, permissions }, callback) => {
      const pages = roomPages.get(roomId);
      if (!pages) {
        callback?.({ status: "error", message: "Room not found." });
        return;
      }

      const page = pages.find((p) => p.id === pageId);
      if (!page) {
        callback?.({ status: "error", message: "Page not found." });
        return;
      }

      if (!canManagePagePermissions(roomId, page, userId)) {
        callback?.({ status: "error", message: "You do not have permission to manage this page." });
        return;
      }

      const sanitizedPermissions = sanitizePagePermissions(
        permissions,
        page.permissions?.mode || "everyone"
      );
      if (sanitizedPermissions.mode === "selected") {
        const roomOwnerId = roomOwners.get(roomId);
        const participantSet = roomParticipants.get(roomId) || new Set();
        sanitizedPermissions.editors = sanitizedPermissions.editors.filter((id) =>
          participantSet.has(id) && id !== roomOwnerId && id !== page.createdBy
        );
      }

      page.permissions = sanitizedPermissions;

      if (getOrInitRoomSettings(roomId).defaultEdit === "creator") {
        const backup = roomPagePermissionBackups.get(roomId) || new Map();
        backup.set(page.id, clonePermissions(page.permissions, "selected"));
        roomPagePermissionBackups.set(roomId, backup);
      }

      io.to(roomId).emit("pages-update", pages);
      callback?.({ status: "ok", permissions: page.permissions });
    });

    socket.on("content-change", ({ roomId, pageId, userId, updates }, callback) => {
      const pages = roomPages.get(roomId);
      if (!pages) return;

      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      if (!canEditPage(roomId, page, userId)) {
        callback?.({ status: "error", message: "You do not have edit access for this page." });
        return;
      }

      if (!updates || typeof updates !== "object") return;

      const safeUpdates = { ...updates };
      delete safeUpdates.permissions;
      delete safeUpdates.createdBy;
      delete safeUpdates.id;

      if (Object.keys(safeUpdates).length === 0) return;

      if (
        Object.prototype.hasOwnProperty.call(safeUpdates, "name") &&
        !canManagePagePermissions(roomId, page, userId)
      ) {
        callback?.({ status: "error", message: "Only the room owner or page creator can rename this page." });
        return;
      }

      Object.assign(page, safeUpdates);
      socket.broadcast.to(roomId).emit("content-update", {
        pageId,
        userId,
        updates: safeUpdates,
      });

      callback?.({ status: "ok" });
    });

    socket.on("editor-op", ({ roomId, pageId, userId, range, text }) => {
      const pages = roomPages.get(roomId);
      if (!pages) return;

      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      if (!canEditPage(roomId, page, userId)) return;

      socket.broadcast.to(roomId).emit("editor-op", {
        roomId,
        pageId,
        userId,
        range,
        text,
      });
    });

    socket.on("add-page", ({ roomId, name, userId }, callback) => {
      const pages = roomPages.get(roomId);
      if (!pages) {
        callback?.({ status: "error", message: "Room not found." });
        return;
      }

      if (!canCreatePage(roomId, userId)) {
        callback?.({ status: "error", message: "Only the room owner can create pages right now." });
        return;
      }

      const pageName = typeof name === "string" && name.trim().length > 0
        ? name.trim().slice(0, 64)
        : `Page ${pages.length + 1}`;

      const nextPage = createNewPage(pageName, userId, getOrInitRoomSettings(roomId));
      pages.push(nextPage);

      if (getOrInitRoomSettings(roomId).defaultEdit === "creator") {
        const backup = roomPagePermissionBackups.get(roomId) || new Map();
        backup.set(nextPage.id, clonePermissions(nextPage.permissions, "selected"));
        roomPagePermissionBackups.set(roomId, backup);
      }

      io.to(roomId).emit("pages-update", pages);
      callback?.({ status: "ok" });
    });

    socket.on("close-page", ({ roomId, pageId, userId }, callback) => {
      const pages = roomPages.get(roomId);
      if (!pages) {
        callback?.({ status: "error", message: "Room not found." });
        return;
      }

      if (pages.length <= 1) {
        callback?.({ status: "error", message: "At least one page must remain in the room." });
        return;
      }

      const pageIndex = pages.findIndex((p) => p.id === pageId);
      if (pageIndex === -1) {
        callback?.({ status: "error", message: "Page not found." });
        return;
      }

      const page = pages[pageIndex];
      const canClose = isRoomOwner(roomId, userId) || page.createdBy === userId;
      if (!canClose) {
        callback?.({ status: "error", message: "Only the room owner or page creator can close this page." });
        return;
      }

      pages.splice(pageIndex, 1);
      const backup = roomPagePermissionBackups.get(roomId);
      if (backup) {
        backup.delete(pageId);
      }
      io.to(roomId).emit("pages-update", pages);
      callback?.({ status: "ok" });
    });

    socket.on("change-room-owner", ({ roomId, currentOwnerId, newOwnerId }) => {
      if (!roomId || !currentOwnerId || !newOwnerId) return;
      if (roomOwners.get(roomId) !== currentOwnerId) return;

      const participants = roomParticipants.get(roomId);
      if (!participants || !participants.has(newOwnerId)) return;

      roomOwners.set(roomId, newOwnerId);
      io.to(roomId).emit("room-owner-changed", { ownerId: newOwnerId });
    });

    socket.on("end-room", ({ roomId, userId }, callback) => {
      if (roomOwners.get(roomId) !== userId) return;

      io.to(roomId).emit("room-ended", { message: "The room has been ended." });
      if (callback) callback({ status: "ok" });

      setTimeout(() => {
        const users = roomParticipants.get(roomId);
        if (users) {
          users.forEach((uid) => userMap.delete(uid));
        }
        cleanupRoomState(roomId);
      }, 2000);
    });

    socket.on("remove-participant", ({ roomId, userId, userIdToKick }) => {
      if (roomOwners.get(roomId) !== userId) return;
      if (!userIdToKick || userIdToKick === userId) return;

      const kickedUser = userMap.get(userIdToKick);
      if (!kickedUser || kickedUser.roomId !== roomId) return;

      io.to(kickedUser.socketId).emit("kicked", { message: "You were removed." });
      userMap.delete(userIdToKick);
      removeUserFromRoom(roomId, userIdToKick);

      const sock = io.sockets.sockets.get(kickedUser.socketId);
      sock?.leave(roomId);
      sock?.disconnect(true);
    });

    socket.on("disconnect", () => {
      const entry = [...userMap.entries()].find(([, value]) => value.socketId === socket.id);
      if (!entry) return;

      const [userId, { roomId }] = entry;
      const disconnectedSocketId = socket.id;

      setTimeout(() => {
        const user = userMap.get(userId);
        if (!user || user.socketId !== disconnectedSocketId) return;

        userMap.delete(userId);
        removeUserFromRoom(roomId, userId);
      }, DISCONNECT_GRACE_MS);
    });
  });

  return io;
};
