

import React, { useEffect } from "react";
import {
  StreamCall,
  StreamTheme,
  StreamVideo,
  CallControls,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import PaginatedVerticalLayout from "./CustomLayout";
import connectCallImage from "../assets/Image.png"; 

const VideoPanel = ({ client, call, onStartCall, onLeaveCall,isJoiningCall }) => {
  const [isConnecting, setIsConnecting] = React.useState(false);

  useEffect(() => {
    if (!call) return;

    const setupMedia = async () => {
      try {
        setIsConnecting(true);
        await call.camera.enable();
        await call.microphone.enable();
        setIsConnecting(false);
      } catch (error) {
        console.error("Error setting up media:", error);
        setIsConnecting(false);
      }
    };

    setupMedia();

    return () => {
      call.camera.disable();
      call.microphone.disable();
    };
  }, [call]);

  if (!client || !call) {
    return (
      <div className="h-full flex flex-col justify-center items-center bg-gray-900 rounded-lg text-white p-4">
        {/* --- 1. IMAGE CHANGED --- */}
        <img
          src={connectCallImage}
          alt="Join call"
          className="w-3/4 max-w-xs h-auto object-contain rounded-lg "
        />

        {/* --- 2. TEXT PHRASE CHANGED --- */}
        <p className="text-gray-300 text-lg mb-4">Ready to join the meeting?</p>

        {/* --- 3. BUTTON STYLES CHANGED --- */}
        <button
          onClick={onStartCall}
          disabled={isJoiningCall}
          className={`px-6 py-2 rounded-lg text-white font-semibold 
                      bg-gradient-to-r from-green-500 to-blue-500 
                      hover:from-green-600 hover:to-blue-600 
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 
                      shadow-lg transform transition-all duration-200 hover:scale-105
                      ${isJoiningCall ? "opacity-75 cursor-not-allowed" : ""}`}
        >
          {isJoiningCall ? "Joining..." : "Join Now"}
        </button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="h-full flex flex-col justify-center items-center bg-gray-900 rounded-lg text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-lg text-gray-300">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamTheme>
        <StreamCall call={call}>
          <div className="h-full flex flex-col bg-gray-900 rounded-lg">
            
            
            {/* Call controls */}
            <div className="flex justify-center py-2 border-t border-gray-700">
              <CallControls
                onLeave={() => {
                  console.log(" User left the call");
                  sessionStorage.removeItem("activeCallId");
                  onLeaveCall?.();
                }}
              />
            </div>
            {/* Paginated layout */}
            <div className="flex-1 min-h-0">
              <PaginatedVerticalLayout />
            </div>
          </div>
        </StreamCall>
      </StreamTheme>
    </StreamVideo>
  );
};

export default VideoPanel;