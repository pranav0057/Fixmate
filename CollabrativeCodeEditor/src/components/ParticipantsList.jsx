

import React from "react";
import { Crown, Mic, MicOff, Video, VideoOff, UserX } from "lucide-react";
import {
  StreamVideo,
  StreamCall,
  useCallStateHooks,
  hasAudio,
  hasVideo,
} from "@stream-io/video-react-sdk";


const StreamAwareList = ({
  participants = [],
  ownerId,
  currentUserId,
  onRemoveParticipant,
}) => {
  const { useParticipants } = useCallStateHooks();
  const streamParticipants = useParticipants();

  const streamParticipantMap = new Map(
    streamParticipants.map((p) => [p.userId, p])
  );

  const isOwner = currentUserId === ownerId;

  return (
    <div className="p-4 bg-gray-900 h-full text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Participants</h3>
        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
          {participants.length} online
        </span>
      </div>

      {/* Empty state */}
      {participants.length === 0 && (
        <p className="text-gray-500 text-sm">No one’s here yet 👀</p>
      )}

      {/* Participants list */}
      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
        {participants.map((p) => {
          const streamData = streamParticipantMap.get(p.userId);

          const isInCall = !!streamData;
          const isAudioOn = isInCall ? hasAudio(streamData) : false;
          const isVideoOn = isInCall ? hasVideo(streamData) : false;
          const isSpeaking = !!streamData?.isSpeaking;
          const audioLevel = streamData?.audioLevel || 0;

          const isParticipantOwner = p.userId === ownerId;
          const canRemove =
            isOwner && !isParticipantOwner && p.userId !== currentUserId;

          const ringStyle = {
            transition: "all 0.1s ease-out",
            borderColor: isSpeaking ? "#34D399" : "#4B5563",
            boxShadow: isSpeaking
              ? `0 0 8px 2px rgba(52, 211, 153, ${Math.min(audioLevel * 5, 1)})`
              : "none",
            borderWidth: "2px",
          };

          return (
            <div
              key={p.userId}
              className="flex items-center space-x-3 p-2 bg-gray-800 rounded-lg group"
            >
              {/* Avatar with speaking ring */}
              <div className="relative">
                <div
                  style={ringStyle}
                  className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <span className="text-sm font-semibold text-white">
                    {p.avatar || p.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                {p.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm truncate">{p.name}</span>
                  {isParticipantOwner && (
                    <Crown className="w-3 h-3 text-yellow-400" title="Owner" />
                  )}
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center space-x-2">
                {isInCall ? (
                  <>
                    {isAudioOn ? (
                      <Mic className="w-4 h-4 text-gray-300" title="Unmuted" />
                    ) : (
                      <MicOff
                        className="w-4 h-4 text-red-400"
                        title="Muted"
                      />
                    )}
                    {isVideoOn ? (
                      <Video
                        className="w-4 h-4 text-gray-300"
                        title="Video On"
                      />
                    ) : (
                      <VideoOff
                        className="w-4 h-4 text-red-400"
                        title="Video Off"
                      />
                    )}
                  </>
                ) : (
                  <span className="text-xs text-gray-500 italic">
                    Not in call
                  </span>
                )}

                {/* Remove button */}
                {canRemove && (
                  <button
                    onClick={() => onRemoveParticipant(p.userId)}
                    className="transition-opacity p-1 hover:bg-red-600 rounded"
                    title="Remove participant"
                  >
                    <UserX className="w-4 h-4 text-red-400 hover:text-white" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DumbList = ({
  participants = [],
  ownerId,
  currentUserId,
  onRemoveParticipant,
}) => {
  const isOwner = currentUserId === ownerId;

  return (
    <div className="p-4 bg-gray-900 h-full text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Participants</h3>
        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
          {participants.length} online
        </span>
      </div>

      {/* Empty state */}
      {participants.length === 0 && (
        <p className="text-gray-500 text-sm">No one’s here yet 👀</p>
      )}

      {/* Participants list (no call data) */}
      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
        {participants.map((p) => {
          const isParticipantOwner = p.userId === ownerId;
          const canRemove =
            isOwner && !isParticipantOwner && p.userId !== currentUserId;

          return (
            <div
              key={p.userId}
              className="flex items-center space-x-3 p-2 bg-gray-800 rounded-lg group"
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">
                    {p.avatar || p.name?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                {p.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                )}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm truncate">{p.name}</span>
                  {isParticipantOwner && (
                    <Crown className="w-3 h-3 text-yellow-400" title="Owner" />
                  )}
                </div>
              </div>

              {/* Remove button */}
              {canRemove && (
                <button
                  onClick={() => onRemoveParticipant(p.userId)}
                  className="transition-opacity p-1 hover:bg-red-600 rounded"
                  title="Remove participant"
                >
                  <UserX className="w-4 h-4 text-red-400 hover:text-white" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ParticipantsList = ({
  participants = [],
  client,
  call,
  ownerId,
  currentUserId, // We need this for sorting
  onRemoveParticipant,
}) => {

  const getSortPriority = (participant) => {
    if (participant.userId === currentUserId) {
      return 1; // Current user always comes first
    }
    if (participant.userId === ownerId) {
      return 2; // Owner comes second
    }
    return 3; // Everyone else comes after
  };

  // Create a new sorted array.
  const sortedParticipants = [...participants].sort(
    (a, b) => getSortPriority(a) - getSortPriority(b)
  );

  if (!client || !call) {
    return (
      <DumbList
        participants={sortedParticipants} // <-- Pass the sorted list
        ownerId={ownerId}
        currentUserId={currentUserId}
        onRemoveParticipant={onRemoveParticipant}
      />
    );
  }

  // If the local user *is* in a call, render the "StreamAwareList"
  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <StreamAwareList
          participants={sortedParticipants} // <-- Pass the sorted list
          ownerId={ownerId}
          currentUserId={currentUserId}
          onRemoveParticipant={onRemoveParticipant}
        />
      </StreamCall>
    </StreamVideo>
  );
};

export default ParticipantsList;
