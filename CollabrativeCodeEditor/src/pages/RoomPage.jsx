
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Copy,
  Users,
  Plus,
  X,
  LogOut,
  MessageSquare,
} from "lucide-react";
import ChatPanel from "../components/ChatPanel";
import VideoPanel from "../components/VideoPanel";
import ParticipantsList from "../components/ParticipantsList";
import CodeEditor from "../components/CodeEditor";
import { socket } from "../socket";
import { getUserId } from "../utils/userId";
import { initStreamClient } from "../utils/streamClient.js";
import ConfirmationDialog from "../components/Confirmation.jsx";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import toast from "react-hot-toast"; 

const RoomPage = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userName = searchParams.get("name") || "Guest";
  const userId = getUserId();

  //  Stream client + call state
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

  //  NEW: State to track which page is being edited
  const [editingPageId, setEditingPageId] = useState(null);

  const confirmAction = (title, message, onConfirm) => {
    setConfirmation({ open: true, title, message, onConfirm });
  };
  

  const [ownerId, setOwnerId] = useState(
    () => sessionStorage.getItem("ownerId") || null
  );

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(
    () => sessionStorage.getItem("activePageId") || null
  );
  const activePage = pages.find((p) => p.id === activePageId);

  // State and Ref for Chat Panel Toggle
  const [isChatOpen, setIsChatOpen] = useState(true);
  const chatPanelRef = useRef(null);
  // new now
const [unreadCount, setUnreadCount] = useState(0);

  const onBackButtonEvent = useCallback((e) => {
    e.preventDefault();
    window.history.pushState(null, "", window.location.href);
  }, []);

  // Helper for all exit scenarios
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
    if (activePageId) {
      sessionStorage.setItem("activePageId", activePageId);
    } else {
      sessionStorage.removeItem("activePageId");
    }
  }, [activePageId]);


  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onBackButtonEvent);

    return () => {
      window.removeEventListener("popstate", onBackButtonEvent);
    };
  }, [onBackButtonEvent]);


  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    // --- Event Handlers ---
    const handlePagesUpdate = (allPages) => {
      setPages(allPages);
      const stillExists = allPages.some((p) => p.id === activePageId);
      if (!stillExists && allPages.length > 0) {
        setActivePageId(allPages[0].id);
      } else if (allPages.length === 0) {
        setActivePageId(null);
      }
    };

    const handleContentUpdate = ({ pageId, updates }) => {
      setPages((prevPages) =>
        prevPages.map((p) => (p.id === pageId ? { ...p, ...updates } : p))
      );
    };

    const handleParticipants = (list) => {
      setParticipants(list);
    };

    const handleKicked = (data) => {
      cleanExit(data.message || "You were removed from the room.");
      toast.error("You have been removed");
    };

    const handleRoomEnded = (data) => {
      cleanExit(data.message || "The room has ended.");
    };

    const handleOwner= ({ isOwner }) => {
      console.log(isOwner);
      sessionStorage.setItem("ownerId", userId); 
      setOwnerId(userId);
    }

    // --- Socket Setup ---
    socket.on("participants-update", handleParticipants);
    socket.on("pages-update", handlePagesUpdate);
    socket.on("content-update", handleContentUpdate);
    socket.on("kicked", handleKicked);
    socket.on("room-ended", handleRoomEnded);
    socket.on("room-owner-assigned",handleOwner);
    socket.on("get-room-owner", ({ ownerId }) => {
      sessionStorage.setItem("ownerId", ownerId);
      setOwnerId(ownerId);
    });
    
    socket.emit("join-room", { roomId, userName, userId });

    // --- Cleanup ---
    return () => {
      socket.emit("leave-room", { roomId, userId });
      socket.off("participants-update", handleParticipants);
      socket.off("pages-update", handlePagesUpdate);
      socket.off("content-update", handleContentUpdate);
      socket.off("kicked", handleKicked);
      socket.off("room-ended", handleRoomEnded);
    };
  }, [roomId, userName, userId, activePageId, navigate, call, client]);

 
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
      console.log("Joined Stream call:", roomId);
      toast.success("Joined Stream call!");
    } catch (err) {
      console.error(" Stream init error:", err);
      toast.error("Failed to start call.");
    } finally {
      setIsJoiningCall(false);
    }
  };

  // 🔄 Restore previous call on reload
  useEffect(() => {
    const restoreCall = async () => {
      const savedCallId = sessionStorage.getItem("activeCallId");
      if (!savedCallId || !userId) return;
      try {
        console.log("Attempting to restore call:", savedCallId);
        const videoClient = await initStreamClient(userId, userName);
        const existingCall = videoClient.call("default", savedCallId);
        await existingCall.join();
        existingCall.on("call.left", () => {
          console.log(" User left call");
          sessionStorage.removeItem("activeCallId");
          setCall(null);
          setClient(null);
        });
        setClient(videoClient);
        setCall(existingCall);
        console.log("Reconnected to Stream call:", savedCallId);
        toast("Reconnected to previous call.");
      } catch (err) {
        console.error("Failed to restore call:", err);
        sessionStorage.removeItem("activeCallId");
      }
    };
    restoreCall();
  }, [userId, userName]);

  // new now
  useEffect(() => {
  if (!socket) return;

  const handleNewMessage = () => {
    // If chat is CLOSED, increment counter
    if (!isChatOpen) {
      setUnreadCount((prev) => prev + 1);
      toast("New message received", { icon: "💬" }); // Optional: small toast
    }
  };

  socket.on("receive-message", handleNewMessage);

  return () => {
    socket.off("receive-message", handleNewMessage);
  };
}, [socket, isChatOpen]);
// new now end

  const handleLeaveCall = () => {
    console.log("Cleaning up after call end");
    sessionStorage.removeItem("activeCallId");
    setCall(null);
    setClient(null);
    toast("Left call.");
  };

  const addNewPage = () => {
    socket.emit("add-page", { roomId, name: `Page ${pages.length + 1}` });
    toast.success("New page added!");
  };

  const closePage = useCallback(
    (pageId) => {
      socket.emit("close-page", { roomId, pageId });
      toast("Page closed.");
    },
    [roomId]
  );

  const updatePageContent = useCallback(
    (updates) => {
      if (!activePageId) return;
      setPages((prevPages) =>
        prevPages.map((p) =>
          p.id === activePageId ? { ...p, ...updates } : p
        )
      );
      socket.emit("content-change", {
        roomId,
        pageId: activePageId,
        updates,
      });
    },
    [roomId, activePageId]
  );


  const startEditingPageName = (pageId) => {
    setEditingPageId(pageId);
  };


  const handlePageNameChange = (pageId, newName) => {
    const trimmedName = newName.trim();
    
    if (trimmedName && trimmedName !== pages.find(p => p.id === pageId)?.name) {
      // Optimistic update
      setPages((prevPages) =>
        prevPages.map((p) =>
          p.id === pageId ? { ...p, name: trimmedName } : p
        )
      );
      // Emit update
      socket.emit("content-change", {
        roomId,
        pageId: pageId,
        updates: { name: trimmedName },
      });
      toast.success(`Page renamed to "${trimmedName}"`);
    }
    setEditingPageId(null);
  };

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

  return (
    <div className="h-screen bg-gray-900 flex flex-col relative">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          {/* Left Side: Room Info */}
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

          {/* H1 TITLE */}
          <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-4 lg:mb-0">
            Merging Minds Room
          </h1>

          {/* Right Side: Leave/End Button */}
          <div className="flex items-center space-x-3">
            {userId === ownerId ? (
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

      {/* 3-COLUMN MAIN LAYOUT */}
      <PanelGroup direction="horizontal" className="flex-1 flex overflow-hidden">
        {/* 1. Left Panel: Chat */}
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

        {/* 2. Middle Panel: Code Editor */}
        <Panel defaultSize={55} minSize={30}>
          <div className="flex-1 flex flex-col overflow-hidden h-full w-full bg-gray-900">
            {/* Tabs */}
            <div className="page-tabs flex items-center bg-gray-800 border-b border-gray-700 px-2 py-1 overflow-x-auto">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center px-3 py-1 rounded-t-md mr-2 ${page.id === activePageId
                      ? "bg-gray-900 text-white border-t-2 border-blue-500"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                    } ${editingPageId !== page.id ? "cursor-pointer" : "cursor-text"}`}
                  
                  onClick={() => setActivePageId(page.id)}
                  onDoubleClick={() => startEditingPageName(page.id)}
                >
                  {editingPageId === page.id ? (
                    <input
                      type="text"
                      defaultValue={page.name}
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      className="bg-gray-700 text-white text-sm p-0 border-none w-24 focus:ring-0 focus:border-none rounded px-1"
                      onBlur={(e) => handlePageNameChange(page.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setEditingPageId(null);
                      }}
                    />
                  ) : (
                    <span className="text-sm truncate max-w-[80px] select-none">{page.name}</span>
                  )}
                  
                  {/* Hide close button while editing to avoid clicks */}
                  {pages.length > 1 && editingPageId !== page.id && (
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
              ))}
              <button
                onClick={addNewPage}
                className="ml-2 bg-blue-600 text-white px-2 py-1 rounded-md flex items-center space-x-1 hover:bg-blue-500 hover:scale-105 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Active Page */}
            <div className="flex-1 overflow-hidden">
              {activePage ? (
                <CodeEditor
                  key={activePage.id}
                  page={activePage}
                  onUpdate={updatePageContent}
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

        {/* Draggable Handle */}
        <PanelResizeHandle className="w-2 bg-gray-900 hover:bg-blue-600 transition-colors duration-200 cursor-col-resize" />

        {/* 3. Right Panel: Participants Toggle + Video */}
        <Panel defaultSize={25} minSize={20}>
          <div className="w-full h-full bg-gray-800 flex flex-col overflow-hidden">
            {/* Participants Toggle Button */}
            <div className="relative p-4 border-b border-gray-700">
              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="flex w-full items-center justify-center space-x-2 px-3 py-2 bg-gradient-to-r from-green-500 to-blue-500 
                               hover:from-green-600 hover:to-blue-600 rounded-lg text-white font-bold transition-all hover:brightness-90"
              >
                <Users className="w-4 h-4" />
                <span>Participants ({participants.length})</span>
              </button>
              {/* The Popover Menu */}
              {showParticipants && (
                <div className="absolute top-16 left-0 right-0 mx-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                  <ParticipantsList
                    participants={participants}
                    client={client}
                    call={call}
                    ownerId={ownerId}
                    currentUserId={userId}
                    onRemoveParticipant={handleRemoveParticipant}
                  />
                </div>
              )}
            </div>

            {/* Video Panel (fills remaining space) */}
            <div className="flex-1 overflow-hidden">
              <VideoPanel
                client={client}
                call={call}
                onStartCall={handleStartCall}
                onLeaveCall={handleLeaveCall}
                isJoiningCall={isJoiningCall}
              />
            </div>
          </div>
        </Panel>
      </PanelGroup>

      <button
        onClick={toggleChatPanel}
       
        className="absolute bottom-6 right-6 p-3 bg-gradient-to-r from-teal-500 via-cyan-200 to-emerald-200 hover:bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 text-white rounded-full shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-75 z-50"
        title={isChatOpen ? "Hide Chat" : "Show Chat"}
      >
        <MessageSquare className="w-6 h-6" />

        {!isChatOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-gray-900 animate-bounce shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
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
    </div>
  );
};

export default RoomPage;