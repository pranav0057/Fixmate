import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Mic,
  MicOff,
  Video,
  VideoOff,
  UserX,
  MoreVertical,
} from "lucide-react";
import {
  StreamVideo,
  StreamCall,
  useCallStateHooks,
  hasAudio,
  hasVideo,
} from "@stream-io/video-react-sdk";

/* ================= UTILS & HELPERS ================= */

const getAvatarUrl = (name) => {
  const encodedName = encodeURIComponent(name || "?");
  return `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=128&bold=true`;
};

const PulseDot = () => (
  <div className="absolute bottom-0 right-0 translate-x-[10%] translate-y-[10%] flex h-4 w-4">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-gray-900"></span>
  </div>
);

/* ================= ACTION MENU (SMART POSITIONING) ================= */

const ActionMenu = ({
  participant,
  ownerId,
  currentUserId,
  isOwner,
  onRemoveParticipant,
  onChangeOwner,
}) => {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("down"); // 'up' or 'down'
  const buttonRef = useRef(null);

  if (!isOwner || participant.userId === currentUserId) return null;

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      // 1. SCROLL INTO VIEW
      // If the row is partially hidden, scroll it into view gently
      buttonRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });

      // 2. SMART POSITIONING (Auto-Flip)
      // Check space below the button to decide if menu goes UP or DOWN
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;

      // If less than 160px space below, open UPWARDS
      setDirection(spaceBelow < 160 ? "up" : "down");
    }
    setOpen((v) => !v);
  };

  return (
    <div className="relative">
      <motion.button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1 rounded hover:bg-gray-700 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            <motion.div
              // Animate based on direction
              initial={{
                opacity: 0,
                scale: 0.9,
                y: direction === "up" ? 10 : -10
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: direction === "up" ? 10 : -10
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25
              }}
              // CSS Classes for positioning: 
              // 'bottom-full mb-2' pushes it UP
              // 'top-full mt-2' pushes it DOWN
              className={`absolute right-0 w-40 bg-gray-800/90 backdrop-blur-xl border-2 rounded-xl shadow-2xl z-50 ${direction === "up"
                ? "bottom-full mb-2 origin-bottom-right"
                : "top-full mt-2 origin-top-right"
                }`}
              style={{
                borderColor: 'rgba(45, 212, 191, 0.35)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(45, 212, 191, 0.1)'
              }}
            >
              <div className="py-0.5">
                {participant.userId !== ownerId && (
                  <motion.button
                    onClick={() => {
                      setOpen(false);
                      onChangeOwner(participant.userId, participant.name);
                    }}
                    whileHover={{ x: 2 }}
                    className="w-full px-2.5 py-2 text-xs text-left hover:bg-gray-700/50 transition-colors flex items-center gap-2 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="text-gray-200">Make owner</span>
                  </motion.button>
                )}

                <motion.button
                  onClick={() => {
                    setOpen(false);
                    onRemoveParticipant(participant.userId);
                  }}
                  whileHover={{ x: 2 }}
                  className="w-full px-2.5 py-2 text-xs text-left hover:bg-red-500/20 transition-colors flex items-center gap-2 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center group-hover:bg-rose-500/30 transition-colors">
                    <UserX className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <span className="text-red-400 group-hover:text-red-300">Remove</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ================= UI TEMPLATE ================= */

const ParticipantsListTemplate = ({
  participants,
  ownerId,
  currentUserId,
  isOwner,
  getMediaState,
  onRemoveParticipant,
  onChangeOwner,
}) => {
  const totalCount = participants.length;
  const inCallCount = participants.filter(
    (p) => getMediaState(p.userId).isInCall
  ).length;
  return (
    <div className="h-full text-gray-200 flex flex-col overflow-hidden relative">
      <div
  className="
    flex-1
    rounded-2xl
    bg-white/5
    backdrop-blur-xl
    border border-white/10
    shadow-xl
    p-2
    mb-18
    overflow-hidden
  "
>
      <div className="h-full overflow-y-auto space-y-2  bg-gray-900/85 rounded-xl">
        {participants.map((p) => {
          const media = getMediaState(p.userId);
          const isOwnerUser = p.userId === ownerId;
          const isMe = p.userId === currentUserId;

          return (
            <div
              key={p.userId}
              className="flex items-center gap-3 px-2 py-2 bg-gray-800 rounded-lg mr-4 ml-3 my-3"
            >
              {/* Avatar */}
              <div className="relative">
                <img
                  src={getAvatarUrl(p.name)}
                  alt={p.name}
                  className="w-9 h-9 rounded-full"
                  style={{
                    border: media.isSpeaking
                      ? "2px solid #34D399"
                      : "2px solid transparent",
                  }}
                />
                {media.isInCall && <PulseDot />}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="truncate text-[15px]">{p.name}</span>
                  {isMe && (
                    <span className="text-[10px] font-semibold bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                  {isOwnerUser && (
                    <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
                <div className="text-[10px] mt-0.7 ml-0.5">
                  {media.isInCall ? (
                    <span className="text-emerald-400">In Call</span>
                  ) : (
                    <span className="text-gray-500">Not in call</span>
                  )}
                </div>
              </div>

              {/* STATUS */}
              <div className="flex items-center gap-2">
                {media.isInCall && media.hasStream && (
                  <>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${media.isAudioOn ? 'bg-gray-700' : 'bg-red-500/20'}`}>
                      {media.isAudioOn ? (
                        <Mic className="w-4 h-4 text-gray-300" />
                      ) : (
                        <MicOff className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${media.isVideoOn ? 'bg-gray-700' : 'bg-red-500/20'}`}>
                      {media.isVideoOn ? (
                        <Video className="w-4 h-4 text-gray-300" />
                      ) : (
                        <VideoOff className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </>
                )}

                <ActionMenu
                  participant={p}
                  ownerId={ownerId}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  onRemoveParticipant={onRemoveParticipant}
                  onChangeOwner={onChangeOwner}
                />
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {/* Floating status capsule (space reserved for chat toggle on right) */}
<div className="absolute bottom-3 left-3 pointer-events-none z-40">
  <div
    className="
      flex items-center
      gap-3 
      px-3 py-2
      rounded-full
      bg-gray-800/80
      backdrop-blur-xl
      border border-gray-700/50
      shadow-lg
      pr-6   /* visual breathing room */
    "
  >
    {/* LIVE */}
    <div
      className="
        flex items-center gap-2
        px-3 py-1
        rounded-full
        bg-emerald-500/10
        text-emerald-400
        text-[14px] font-semibold
        border border-emerald-500/20
      "
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      LIVE
    </div>

    {/* Divider */}
    <span className="h-4 w-px bg-gray-600/60" />

    {/* Count */}
    <span className="text-[13px] text-gray-300 font-medium">
      <span className="text-white">{inCallCount}</span>
      <span className="mx-1 text-gray-500">of</span>
      {totalCount}
      <span className="ml-1 text-gray-500">in call</span>
    </span>
  </div>
</div>

    </div>
  );
};

/* ================= STREAM WRAPPER ================= */

const StreamAwareList = (props) => {
  const { useParticipants } = useCallStateHooks();
  const streamParticipants = useParticipants();

  const streamMap = new Map(
    streamParticipants.map((p) => [p.userId, p])
  );

  const getMediaState = (userId) => {
    const sp = streamMap.get(userId);
    return {
      hasStream: !!sp,
      isInCall: !!sp,
      isAudioOn: sp ? hasAudio(sp) : false,
      isVideoOn: sp ? hasVideo(sp) : false,
      isSpeaking: !!sp?.isSpeaking,
      audioLevel: sp?.audioLevel || 0,
    };
  };

  return (
    <ParticipantsListTemplate
      {...props}
      isOwner={props.currentUserId === props.ownerId}
      getMediaState={getMediaState}
    />
  );
};

/* ================= NON-CALLER WRAPPER ================= */

const DumbList = ({ participants, ...props }) => {
  const getMediaState = (userId) => {
    const p = participants.find((x) => x.userId === userId);
    return {
      hasStream: false,
      isInCall: p?.isInCall,
      isAudioOn: false,
      isVideoOn: false,
      isSpeaking: false,
      audioLevel: 0,
    };
  };

  return (
    <ParticipantsListTemplate
      {...props}
      participants={participants}
      isOwner={props.currentUserId === props.ownerId}
      getMediaState={getMediaState}
    />
  );
};

/* ================= MAIN EXPORT ================= */

const ParticipantsList = ({
  participants = [],
  client,
  call,
  ownerId,
  currentUserId,
  onRemoveParticipant,
  onChangeOwner,
}) => {

  const sorted = [...participants].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (a.userId === ownerId) return -1;
    return 0;
  });

  if (!client || !call) {
    return (
      <DumbList
        participants={sorted}
        ownerId={ownerId}
        currentUserId={currentUserId}
        onRemoveParticipant={onRemoveParticipant}
        onChangeOwner={onChangeOwner}
      />
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <StreamAwareList
          participants={sorted}
          ownerId={ownerId}
          currentUserId={currentUserId}
          onRemoveParticipant={onRemoveParticipant}
          onChangeOwner={onChangeOwner}
        />
      </StreamCall>
    </StreamVideo>
  );
};

export default ParticipantsList;