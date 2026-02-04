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
              className="w-full  bg-gray-800 h-40 rounded- overflow-hidden shadow-lg"
            >
              <ParticipantView participant={participant} />
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-3 bg-gray-800 border-t border-gray-700">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 0}
            className={`p-2 rounded-full transition-colors ${currentPage === 0
                ? "text-gray-600 cursor-not-allowed"
                : "text-white hover:bg-gray-700"
              }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-sm text-gray-300">
            Page {currentPage + 1} of {totalPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages - 1}
            className={`p-2 rounded-full transition-colors ${currentPage === totalPages - 1
                ? "text-gray-600 cursor-not-allowed"
                : "text-white hover:bg-gray-700"
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