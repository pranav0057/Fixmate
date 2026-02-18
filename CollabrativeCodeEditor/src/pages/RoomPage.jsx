import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Copy,
  Users,
  Plus,
  X,
  Lock,
  LogOut,
  MessageSquare,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import ChatPanel from "../components/ChatPanel";
import VideoPanel from "../components/VideoPanel";
import ParticipantsList from "../components/ParticipantsList";
import CodeEditor from "../components/CodeEditor";
import { socket } from "../socket";
import { getUserId } from "../utils/userId";
import { initStreamClient } from "../utils/streamClient.js";
import ConfirmationDialog from "../components/Confirmation.jsx";
import PagePermissionsModal from "../components/PagePermissionsModal/PagePermissionsModal.jsx";
import RoomSettingsDrawer from "../components/RoomSettingsDrawer";


import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import toast from "react-hot-toast";

const DEFAULT_ROOM_SETTINGS = {
  pageCreation: "anyone",
  defaultEdit: "everyone",
};

const normalizeRoomSettings = (settings = {}) => ({
  pageCreation: settings?.pageCreation === "owner" ? "owner" : "anyone",
  defaultEdit: settings?.defaultEdit === "creator" ? "creator" : "everyone",
});

const normalizePagePermissions = (permissions = {}) => {
  const mode = ["everyone", "selected", "readonly"].includes(permissions?.mode)
    ? permissions.mode
    : "everyone";

  const editors = Array.isArray(permissions?.editors)
    ? [...new Set(permissions.editors.filter(Boolean))]
    : [];

  return {
    mode,
    editors: mode === "selected" ? editors : [],
  };
};

const normalizePage = (page = {}) => ({
  ...page,
  createdBy: page?.createdBy || null,
  permissions: normalizePagePermissions(page?.permissions),
});

const getPermissionsStorageKey = (roomId) => `page_permissions_backup_${roomId}`;

const RoomPage = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userName = searchParams.get("name") || "Guest";
  const userId = getUserId();
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isJoiningCall, setIsJoiningCall] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [confirmation, setConfirmation] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [roomSettings, setRoomSettings] = useState(DEFAULT_ROOM_SETTINGS);
  const confirmAction = (title, message, onConfirm) => {
    setConfirmation({ open: true, title, message, onConfirm });
  };
  const [ownerId, setOwnerId] = useState(
    () => sessionStorage.getItem("ownerId") || null
  );
  const [pages, setPages] = useState(() => {
    const saved = sessionStorage.getItem(`pages_${roomId}`);
    return saved ? JSON.parse(saved).map(normalizePage) : [];
  });
  const [activePageId, setActivePageId] = useState(
    () => sessionStorage.getItem(`activePageId_${roomId}`) || null
  );
  const activePage = pages.find((p) => p.id === activePageId);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatPanelRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagePermissionsOpen, setPagePermissionsOpen] = useState(false);
  const [pagePermissionsFor, setPagePermissionsFor] = useState(null);
  const [isSavingPagePermissions, setIsSavingPagePermissions] = useState(false);
  const [creatorTooltip, setCreatorTooltip] = useState(null);
  const isOwner = ownerId === userId;
  const pageBeingConfigured = pages.find((p) => p.id === pagePermissionsFor) || null;
  const creatorNameMap = useMemo(() => {
    const map = new Map();
    participants.forEach((participant) => {
      if (participant?.userId) {
        map.set(participant.userId, participant.name || "Unknown");
      }
    });

    if (userId && !map.has(userId)) {
      map.set(userId, userName || "You");
    }

    return map;
  }, [participants, userId, userName]);

  const getPageCreatorLabel = useCallback(
    (page) => {
      if (!page?.createdBy) return "Unknown";
      if (page.createdBy === userId) return "You";
      return creatorNameMap.get(page.createdBy) || "Unknown";
    },
    [creatorNameMap, userId]
  );

  const canManagePagePermissions = useCallback(
    (page) => {
      if (!page) return false;
      return isOwner || page.createdBy === userId;
    },
    [isOwner, userId]
  );

  const canEditPage = useCallback(
    (page) => {
      if (!page) return false;
      if (isOwner) return true;
      if (page.createdBy === userId) return true;

      const permissions = normalizePagePermissions(page.permissions);
      if (permissions.mode === "readonly") return false;
      if (permissions.mode === "selected") {
        return permissions.editors.includes(userId);
      }
      return true;
    },
    [isOwner, userId]
  );

  const buildPagePermissionSnapshot = useCallback(
    (targetPages = pages) =>
      targetPages.reduce((acc, page) => {
        acc[page.id] = normalizePagePermissions(page.permissions);
        return acc;
      }, {}),
    [pages]
  );

  const readStoredPermissionSnapshot = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(getPermissionsStorageKey(roomId));
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }, [roomId]);

  const canCreatePage = roomSettings.pageCreation === "anyone" || isOwner;

  const updateRoomSettings = useCallback(
    (updater) => {
      if (!isOwner) return;

      const next = normalizeRoomSettings(
        typeof updater === "function" ? updater(roomSettings) : updater
      );

      const isSwitchingToEveryone =
        roomSettings.defaultEdit !== "everyone" && next.defaultEdit === "everyone";
      const isSwitchingToPageOwnerMode =
        roomSettings.defaultEdit !== "creator" && next.defaultEdit === "creator";

      if (isSwitchingToEveryone) {
        sessionStorage.setItem(
          getPermissionsStorageKey(roomId),
          JSON.stringify(buildPagePermissionSnapshot())
        );
      }

      const preservedPermissions = isSwitchingToPageOwnerMode
        ? readStoredPermissionSnapshot()
        : undefined;

      setRoomSettings(next);

      socket.emit(
        "update-room-settings",
        { roomId, userId, settings: next, preservedPermissions },
        (ack) => {
          if (!ack || ack.status !== "ok") {
            setRoomSettings(roomSettings);
            toast.error(ack?.message || "Unable to update room settings.");
            return;
          }

          setRoomSettings(normalizeRoomSettings(ack.settings));
        }
      );
    },
    [
      isOwner,
      roomId,
      userId,
      roomSettings,
      buildPagePermissionSnapshot,
      readStoredPermissionSnapshot,
    ]
  );


  const onBackButtonEvent = useCallback((e) => {
    e.preventDefault();
    window.history.pushState(null, "", window.location.href);
  }, []);

  const cleanExit = async (reason) => {
    window.removeEventListener("popstate", onBackButtonEvent);
    sessionStorage.clear();
    if (call) {
      try {
        await call.leave();
      } catch (err) {
        console.warn("Error leaving call:", err);
      }
    }
    if (client) {
      try {
        await client.disconnectUser();
      } catch (err) {
        console.warn("Error disconnecting client:", err);
      }
    }
    toast.error(reason || "Disconnected from room");
    navigate("/");
  };



  useEffect(() => {
    if (pages.length > 0) {
      sessionStorage.setItem(`pages_${roomId}`, JSON.stringify(pages));
    }
  }, [pages, roomId]);

  useEffect(() => {
    if (roomSettings.defaultEdit !== "creator") return;
    sessionStorage.setItem(
      getPermissionsStorageKey(roomId),
      JSON.stringify(buildPagePermissionSnapshot())
    );
  }, [roomId, roomSettings.defaultEdit, buildPagePermissionSnapshot]);

  useEffect(() => {
    if (activePageId) {
      sessionStorage.setItem(`activePageId_${roomId}`, activePageId);
    } else {
      sessionStorage.removeItem(`activePageId_${roomId}`);
    }
  }, [activePageId, roomId]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onBackButtonEvent);
    return () => {
      window.removeEventListener("popstate", onBackButtonEvent);
    };
  }, [onBackButtonEvent]);

  // Socket room connection - runs ONCE per room
  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    const handlePagesUpdate = (allPages) => {
      const normalizedPages = Array.isArray(allPages)
        ? allPages.map(normalizePage)
        : [];
      setPages(normalizedPages);
      setActivePageId((currentActive) => {
        const stillExists = normalizedPages.some((p) => p.id === currentActive);
        if (!stillExists && normalizedPages.length > 0) {
          return normalizedPages[0].id;
        } else if (normalizedPages.length === 0) {
          return null;
        }
        return currentActive;
      });
    };

    const handleContentUpdate = ({ pageId, userId: senderId, updates }) => {
      if (senderId === userId) return;
      setPages((prevPages) =>
        prevPages.map((p) =>
          p.id === pageId ? { ...p, ...updates } : p
        )
      );
    };

    const handleParticipants = (list) => {
      console.log("Received participants update:", list);
      setParticipants(list);
    };

    const handleRoomSettingsUpdate = (settings) => {
      setRoomSettings(normalizeRoomSettings(settings));
    };

    const handleOwnerChanged = ({ ownerId: newOwnerId }) => {
      sessionStorage.setItem("ownerId", newOwnerId);
      setOwnerId(newOwnerId);

      if (newOwnerId === userId) {
        toast.success("You are now the room owner");
      } else {
        setParticipants((prevParticipants) => {
          const newOwner = prevParticipants.find(p => p.userId === newOwnerId);
          if (newOwner) {
            toast.success(`${newOwner.name} is now the room owner`);
          }
          return prevParticipants;
        });
      }
    };

    const handleKicked = (data) => {
      cleanExit(data.message || "You were removed from the room.");
      toast.error("You have been removed");
    };

    const handleRoomEnded = (data) => {
      cleanExit(data.message || "The room has ended.");
    };

    const handleOwner = ({ isOwner }) => {
      sessionStorage.setItem("ownerId", userId);
      setOwnerId(userId);
    };

    socket.on("participants-update", handleParticipants);
    socket.on("pages-update", handlePagesUpdate);
    socket.on("content-update", handleContentUpdate);
    socket.on("kicked", handleKicked);
    socket.on("room-ended", handleRoomEnded);
    socket.on("room-owner-assigned", handleOwner);
    socket.on("get-room-owner", ({ ownerId }) => {
      sessionStorage.setItem("ownerId", ownerId);
      setOwnerId(ownerId);
    });
    socket.on("room-owner-changed", handleOwnerChanged);
    socket.on("room-settings-update", handleRoomSettingsUpdate);

    socket.emit("join-room", { roomId, userName, userId });

    return () => {
      socket.emit("leave-room", { roomId, userId });
      socket.off("participants-update", handleParticipants);
      socket.off("pages-update", handlePagesUpdate);
      socket.off("content-update", handleContentUpdate);
      socket.off("kicked", handleKicked);
      socket.off("room-ended", handleRoomEnded);
      socket.off("room-owner-assigned", handleOwner);
      socket.off("get-room-owner");
      socket.off("room-owner-changed", handleOwnerChanged);
      socket.off("room-settings-update", handleRoomSettingsUpdate);
    };
  }, [roomId, userName, userId]); // ✅ No call/client dependencies!

  const handleStartCall = async () => {
    if (isJoiningCall || sessionStorage.getItem("activeCallId")) {
      return;
    }

    setIsJoiningCall(true);
    try {
      const videoClient = await initStreamClient(userId, userName);
      const newCall = videoClient.call("default", roomId);
      await newCall.join({ create: true });
      sessionStorage.setItem("activeCallId", newCall.id);
      setClient(videoClient);
      setCall(newCall);

      console.log("socket update sent");
      socket.emit("user-status-update", {
        roomId,
        userId,
        status: { isInCall: true }
      });
      toast.success("Joined Stream call!");
    } catch (err) {
      console.error("Stream init error:", err);
      toast.error("Failed to start call.");
    } finally {
      setIsJoiningCall(false);
    }
  };

  useEffect(() => {
    const restoreCall = async () => {
      const savedCallId = sessionStorage.getItem("activeCallId");
      if (!savedCallId || !userId) return;
      try {
        const videoClient = await initStreamClient(userId, userName);
        const existingCall = videoClient.call("default", savedCallId);
        await existingCall.join();

        socket.emit("user-status-update", {
          roomId,
          userId,
          status: { isInCall: true }
        });
        existingCall.on("call.left", () => {
          sessionStorage.removeItem("activeCallId");
          setCall(null);
          setClient(null);
        });
        setClient(videoClient);
        setCall(existingCall);
        toast("Reconnected to previous call.");
      } catch (err) {
        console.error("Failed to restore call:", err);
        sessionStorage.removeItem("activeCallId");
      }
    };
    restoreCall();
  }, [userId, userName, roomId]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => {
      if (!isChatOpen) {
        setUnreadCount((prev) => prev + 1);
        toast("New message received", { icon: "💬" });
      }
    };
    socket.on("receive-message", handleNewMessage);
    return () => {
      socket.off("receive-message", handleNewMessage);
    };
  }, [socket, isChatOpen]);

  const handleLeaveCall = () => {
    sessionStorage.removeItem("activeCallId");
    if (call) {
      socket.emit("user-status-update", {
        roomId,
        userId,
        status: { isInCall: false }
      });
    }
    setCall(null);
    setClient(null);
    toast("Left call.");
  };

  const addNewPage = () => {
    if (!canCreatePage) {
      toast.error("Only the room owner can create pages in this room.");
      return;
    }

    socket.emit(
      "add-page",
      { roomId, userId, name: `Page ${pages.length + 1}` },
      (ack) => {
        if (!ack || ack.status !== "ok") {
          toast.error(ack?.message || "Unable to create page.");
          return;
        }
        toast.success("New page added!");
      }
    );
  };

  const closePage = useCallback(
    (pageId) => {
      const targetPage = pages.find((p) => p.id === pageId);
      if (!targetPage) return;

      if (!canManagePagePermissions(targetPage)) {
        toast.error("Only the room owner or page creator can close this page.");
        return;
      }

      socket.emit("close-page", { roomId, pageId, userId }, (ack) => {
        if (!ack || ack.status !== "ok") {
          toast.error(ack?.message || "Unable to close page.");
          return;
        }
        toast("Page closed.");
      });
    },
    [roomId, userId, pages, canManagePagePermissions]
  );

  const showCreatorTooltip = useCallback((event, text) => {
    if (!text) return;
    const x = Math.min(event.clientX + 12, window.innerWidth - 220);
    const y = Math.min(event.clientY + 14, window.innerHeight - 56);
    setCreatorTooltip({
      text,
      x,
      y,
    });
  }, []);

  const moveCreatorTooltip = useCallback((event) => {
    const x = Math.min(event.clientX + 12, window.innerWidth - 220);
    const y = Math.min(event.clientY + 14, window.innerHeight - 56);
    setCreatorTooltip((prev) =>
      prev
        ? {
            ...prev,
            x,
            y,
          }
        : prev
    );
  }, []);

  const hideCreatorTooltip = useCallback(() => {
    setCreatorTooltip(null);
  }, []);

  const handleSavePagePermissions = useCallback(
    async ({ name: nextNameRaw, permissions: nextPermissions }) => {
      if (!pagePermissionsFor) return;

      const targetPage = pages.find((p) => p.id === pagePermissionsFor);
      if (!targetPage) return;

      if (!canManagePagePermissions(targetPage)) {
        toast.error("You don't have permission to manage this page.");
        return;
      }

      const nextName = typeof nextNameRaw === "string" ? nextNameRaw.trim() : "";
      const shouldRename = !!nextName && nextName !== targetPage.name;
      const currentPermissions = normalizePagePermissions(targetPage.permissions);
      const requestedPermissions = normalizePagePermissions(nextPermissions);
      const canSavePermissions = roomSettings.defaultEdit === "creator";
      const currentEditorsKey = currentPermissions.editors.join("|");
      const requestedEditorsKey = requestedPermissions.editors.join("|");
      const shouldSavePermissions =
        canSavePermissions &&
        (currentPermissions.mode !== requestedPermissions.mode ||
          currentEditorsKey !== requestedEditorsKey);

      if (!shouldRename && !shouldSavePermissions) {
        setPagePermissionsOpen(false);
        return;
      }

      const emitWithAck = (event, payload) =>
        new Promise((resolve) => {
          socket.emit(event, payload, (ack) => resolve(ack));
        });

      setIsSavingPagePermissions(true);
      let didChange = false;

      if (shouldRename) {
        setPages((prevPages) =>
          prevPages.map((p) =>
            p.id === pagePermissionsFor ? { ...p, name: nextName } : p
          )
        );

        const renameAck = await emitWithAck("content-change", {
          roomId,
          pageId: pagePermissionsFor,
          userId,
          updates: { name: nextName },
        });

        if (!renameAck || renameAck.status !== "ok") {
          setPages((prevPages) =>
            prevPages.map((p) =>
              p.id === pagePermissionsFor ? { ...p, name: targetPage.name } : p
            )
          );
          setIsSavingPagePermissions(false);
          toast.error(renameAck?.message || "Unable to rename page.");
          return;
        }

        didChange = true;
      }

      if (shouldSavePermissions) {
        const permissionAck = await emitWithAck("update-page-permissions", {
          roomId,
          pageId: pagePermissionsFor,
          userId,
          permissions: requestedPermissions,
        });

        if (!permissionAck || permissionAck.status !== "ok") {
          setIsSavingPagePermissions(false);
          toast.error(permissionAck?.message || "Unable to update page permissions.");
          return;
        }

        didChange = true;
      }

      setIsSavingPagePermissions(false);

      if (didChange) {
        toast.success("Page settings updated.");
      }
      setPagePermissionsOpen(false);
    },
    [
      pagePermissionsFor,
      pages,
      canManagePagePermissions,
      roomId,
      userId,
      roomSettings.defaultEdit,
    ]
  );

  const openPageSettings = useCallback(
    (pageId) => {
      const targetPage = pages.find((p) => p.id === pageId);
      if (!targetPage) return;

      if (!canManagePagePermissions(targetPage)) {
        toast.error("You don't have permission to manage this page.");
        return;
      }

      setPagePermissionsFor(pageId);
      setPagePermissionsOpen(true);
    },
    [
      pages,
      canManagePagePermissions,
    ]
  );

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied!");
    }
  };

  const handleLeaveRoom = async () => {
    if (call) {
      try {
        await call.leave();
      } catch (err) {
        console.warn("Error leaving call:", err);
      }
    }
    handleLeaveCall();
    socket.emit("leave-room", { roomId, userId }, (ack) => {
      if (ack && ack.status === "ok") {
        cleanExit("You have left the room.");
      }
    });
  };

  const handleEndRoom = () => {
    if (ownerId === userId) {
      confirmAction(
        "End Room for Everyone?",
        "This will disconnect all participants. Are you sure you want to proceed?",
        () => {
          socket.emit("end-room", { roomId, userId });
          toast.error("Room ended for all users.");
        }
      );
    }
  };

  const handleRemoveParticipant = (userIdToKick) => {
    if (ownerId === userId && userIdToKick !== userId) {
      confirmAction(
        "Remove Participant?",
        "This participant will be removed from the room immediately.",
        () => {
          socket.emit("remove-participant", { roomId, userId, userIdToKick });
          toast("Participant removed.");
        }
      );
    }
  };

  const handleOwnerChangeRequest = (newOwnerId, newOwnerName) => {
    if (ownerId !== userId) return;
    confirmAction(
      "Change Room Owner?",
      `Are you sure you want to make ${newOwnerName} the room owner?`,
      () => {
        socket.emit("change-room-owner", {
          roomId,
          currentOwnerId: userId,
          newOwnerId,
        });
      }
    );
  };

  const toggleChatPanel = () => {
    const panel = chatPanelRef.current;
    if (!panel) return;
    if (isChatOpen) {
      panel.collapse();
    } else {
      panel.expand();
      setUnreadCount(0);
    }
  };

  const activePageCanEdit = canEditPage(activePage);

  return (
    <div className="h-screen bg-gray-900 flex flex-col relative">
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-4 mb-4 lg:mb-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Room ID:</span>
              <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-lg">
                <span className="font-mono text-blue-400">{roomId}</span>
                <button
                  onClick={copyRoomId}
                  className="text-gray-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                {participants.length} online
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-4 lg:mb-0">
            Merging Minds Room
          </h1>
          {isOwner && (
            <button
              onClick={() => setRoomSettingsOpen(true)}
              className="
                inline-flex items-center gap-2
                px-3.5 py-2
                rounded-lg
                border border-slate-600
                bg-slate-800/90
                text-sm font-medium text-slate-100
                hover:border-cyan-500/50 hover:bg-slate-700/90
                focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
                transition-all
              "
            >
              <Settings2 className="w-4 h-4 text-cyan-300" />
              <span>Room Settings</span>
            </button>
          )}

          <div className="flex items-center space-x-3">
            {isOwner ? (
              <button
                onClick={handleEndRoom}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm text-white"
              >
                <LogOut className="w-4 h-4" />
                <span>End Room</span>
              </button>
            ) : (
              <button
                onClick={handleLeaveRoom}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-red-600 rounded-lg text-sm text-white"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Room</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <PanelGroup direction="horizontal" className="flex-1 flex overflow-hidden">
        {/* Left Panel: Chat */}
        <Panel
          ref={chatPanelRef}
          defaultSize={isChatOpen ? 20 : 0}
          minSize={0}
          className="bg-transparent"
          collapsible={true}
          onCollapse={() => setIsChatOpen(false)}
          onExpand={() => setIsChatOpen(true)}
        >
          <div className="h-full w-full overflow-hidden">
            <ChatPanel
              roomId={roomId}
              userName={userName}
              socket={socket}
              userId={userId}
            />
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-gray-900 hover:bg-blue-600 transition-colors duration-200 cursor-col-resize" />

        {/* Middle Panel: Code Editor */}
        <Panel defaultSize={55} minSize={30} >
          <div className="flex-1 flex flex-col  h-full w-full bg-gray-900 ">
            {/* Tabs */}
            <div className="py-2">
              <div
                className="
                overflow-x-auto
                whitespace-nowrap
                page-tabs
                flex items-center
                bg-gray-800
                border border-gray-700
                px-2 py-1
                rounded-xl
                "
              >
                {pages.map((page) => {
                  const pageCanEdit = canEditPage(page);
                  const pageCanManage = canManagePagePermissions(page);
                  const pageCreatedByMe = page.createdBy === userId;
                  const creatorLabel = getPageCreatorLabel(page);
                  const creatorTooltipText =
                    page.createdBy && page.createdBy !== userId
                      ? `Created by ${creatorLabel}`
                      : null;
                  const pageToneClass =
                    page.id === activePageId
                      ? pageCreatedByMe
                        ? "bg-cyan-900/35 text-cyan-100 border border-cyan-500/40"
                        : "bg-gray-900 text-white"
                      : pageCreatedByMe
                        ? "text-cyan-200 bg-cyan-900/20 border border-cyan-700/40 hover:bg-cyan-800/30 hover:text-cyan-100"
                        : "text-gray-400 hover:text-white hover:bg-gray-700";

                  return (
                    <div
                      key={page.id}
                      className={`group flex items-center px-3 py-1 rounded-lg mr-2 cursor-pointer ${pageToneClass}`}
                      onClick={() => setActivePageId(page.id)}
                      onMouseEnter={(event) =>
                        creatorTooltipText && showCreatorTooltip(event, creatorTooltipText)
                      }
                      onMouseMove={(event) => creatorTooltipText && moveCreatorTooltip(event)}
                      onMouseLeave={hideCreatorTooltip}
                    >
                      <span className="text-sm truncate max-w-[130px] select-none">
                        {page.name}
                      </span>

                      {!pageCanEdit && (
                        <Lock className="ml-1 h-3 w-3 text-slate-500" />
                      )}

                      {pageCanManage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPageSettings(page.id);
                          }}
                          className="
                            ml-1
                            inline-flex items-center justify-center
                            w-7 h-7 rounded-md
                            opacity-0 group-hover:opacity-100 focus:opacity-100
                            text-slate-500 hover:text-slate-100
                            hover:bg-slate-700/70
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
                            transition-all
                          "
                          title="Page settings"
                          aria-label="Page settings"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {pages.length > 1 && pageCanManage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closePage(page.id);
                          }}
                          className="ml-2 text-gray-500 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={addNewPage}
                  disabled={!canCreatePage}
                  className={`ml-2 px-2 py-1 rounded-md flex items-center space-x-1 transition-all ${
                    canCreatePage
                      ? "bg-blue-600 text-white hover:bg-blue-500 hover:scale-105"
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Active Page */}
            <div className="flex-1  flex flex-col">
              {activePage ? (
                <CodeEditor
                  key={activePage.id}
                  page={activePage}
                  socket={socket}
                  roomId={roomId}
                  userId={userId}
                  canEdit={activePageCanEdit}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {pages.length === 0
                    ? "Add a new page to start coding!"
                    : "Select a page to view its content."}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-gray-900 hover:bg-blue-600 transition-colors duration-200 cursor-col-resize" />

        {/* Right Panel: Participants Toggle + Video */}
        <Panel defaultSize={25} minSize={20}>
          <div className="w-full h-full bg-gray-900 flex flex-col overflow-hidden  ">
            {/* Toggle Button */}
            <button
              onClick={() => setShowParticipants((p) => !p)}
              className="m-2
              shrink-0
              flex w-[calc(100%-1rem)] items-center justify-center gap-2
              px-6 py-3
              rounded-full
              bg-gradient-to-r from-green-500 to-blue-500
              hover:from-green-600 hover:to-blue-600
              text-white font-semibold
              border border-white/10
              backdrop-blur
              shadow-md
              transition-all"
            >
              <Users className="w-4 h-4" />
              <span>
                {showParticipants
                  ? `Video (${participants.length})`
                  : `Participants (${participants.length})`}
              </span>
            </button>

            {/* Content Switch */}
            <div className="flex-1 overflow-hidden flex flex-col relative h-full">
              {/* Participants List */}
              <div className={`absolute inset-0 ${showParticipants ? 'block' : 'hidden'}`}>

                <ParticipantsList
                  participants={participants}
                  client={client}
                  call={call}
                  ownerId={ownerId}
                  currentUserId={userId}
                  onRemoveParticipant={handleRemoveParticipant}
                  onChangeOwner={handleOwnerChangeRequest}
                />
              </div>

              {/* Video Panel */}
              <div className={`absolute inset-0 ${!showParticipants ? 'block' : 'hidden'}`}>
                <VideoPanel
                  client={client}
                  call={call}
                  onStartCall={handleStartCall}
                  onLeaveCall={handleLeaveCall}
                  isJoiningCall={isJoiningCall}
                  windows={3}
                />
              </div>
            </div>
          </div>
        </Panel>
      </PanelGroup>

      {/* Floating Chat Button */}
      <button
        onClick={toggleChatPanel}
        className="absolute bottom-3.5 right-5.5 p-3 bg-gradient-to-r from-teal-500 via-cyan-200 to-emerald-200 hover:bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 text-white rounded-full shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-75 z-50"
        title={isChatOpen ? "Hide Chat" : "Show Chat"}
      >
        <MessageSquare className="w-6 h-6" />
        {!isChatOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-gray-900 animate-bounce shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {creatorTooltip && (
        <div
          className="
            pointer-events-none fixed z-[90]
            rounded-lg border border-cyan-400/35 bg-slate-900/95
            px-2.5 py-1.5
            text-xs font-medium text-cyan-100
            shadow-[0_8px_24px_-12px_rgba(34,211,238,0.7)]
          "
          style={{ left: creatorTooltip.x, top: creatorTooltip.y }}
        >
          {creatorTooltip.text}
        </div>
      )}

      <ConfirmationDialog
        open={confirmation.open}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={() => {
          confirmation.onConfirm?.();
          setConfirmation((prev) => ({ ...prev, open: false }));
        }}
        onCancel={() =>
          setConfirmation((prev) => ({ ...prev, open: false }))
        }
      />
      <RoomSettingsDrawer
        isOpen={roomSettingsOpen}
        onClose={() => setRoomSettingsOpen(false)}
        settings={roomSettings}
        setSettings={updateRoomSettings}
      />
      <PagePermissionsModal
        key={
          pageBeingConfigured
            ? `${pageBeingConfigured.id}:${pageBeingConfigured.name}:${pageBeingConfigured.permissions?.mode}:${(pageBeingConfigured.permissions?.editors || []).join("|")}`
            : "page-settings-empty"
        }
        open={pagePermissionsOpen}
        onClose={() => setPagePermissionsOpen(false)}
        pageId={pagePermissionsFor}
        pageName={pageBeingConfigured?.name || ""}
        participants={participants}
        ownerId={ownerId}
        pageCreatorId={pageBeingConfigured?.createdBy || null}
        pageCreatorName={getPageCreatorLabel(pageBeingConfigured)}
        value={pageBeingConfigured?.permissions}
        onSave={handleSavePagePermissions}
        isSaving={isSavingPagePermissions}
        permissionsLockedByRoom={roomSettings.defaultEdit === "everyone"}
        canManage={canManagePagePermissions(pageBeingConfigured)}
      />


    </div>
  );
};

export default RoomPage;
