import React, { useState } from "react";
import {
  useCallStateHooks,
  ParticipantView,
} from "@stream-io/video-react-sdk";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PaginatedVerticalLayout = ({ windows }) => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const [currentPage, setCurrentPage] = useState(0);

  const participantsPerPage = windows;
  const totalPages = Math.ceil(participants.length / participantsPerPage);

  const startIndex = currentPage * participantsPerPage;
  const endIndex = startIndex + participantsPerPage;
  const currentParticipants = participants.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-gray-900">
      {/* Video Grid */}
      <div className="flex-1 flex flex-col gap-3 p-3 items-center overflow-hidden">
        {currentParticipants.length === 0 ? (
          <div className="text-gray-400">
            <p>Waiting for participants...</p>
          </div>
        ) : (
          currentParticipants.map((participant) => (
            <div
              key={participant.sessionId}
              className="w-full  bg-gray-800 h-39.5 rounded- overflow-hidden shadow-lg"
            >
              <ParticipantView participant={participant} />
            </div>
          ))
        )}
      </div>



      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className="
      mx-4 mb-4
      flex items-center justify-center gap-4
      px-6 py-3
      rounded-3xl

      bg-gradient-to-br from-white/15 via-white/10 to-white/5
      backdrop-blur-xl backdrop-saturate-150

      border border-white/25
      shadow-[0_8px_30px_rgba(0,0,0,0.35)]

      text-white font-medium
    "
        >
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 0}
            className={`p-2 rounded-full transition-all ${currentPage === 0
                ? "text-white/40 cursor-not-allowed"
                : "text-white hover:bg-white/25"
              }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm tracking-wide text-white/90">
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages - 1}
            className={`p-2 rounded-full transition-all ${currentPage === totalPages - 1
                ? "text-white/40 cursor-not-allowed"
                : "text-white hover:bg-white/25"
              }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}


    </div>
  );
};

export default PaginatedVerticalLayout;