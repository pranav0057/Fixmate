
import { FcGoogle } from "react-icons/fc";
import { auth, googleProvider } from "../firebase.js";
import { signInWithPopup } from "firebase/auth";
import { useAuth } from "../context/AuthContext.jsx"; // Make sure path is correct
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function GoogleAuthButton() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleGoogleClick = async () => {
    try {
      console.log("Starting Google sign-in...");
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();

      if (!idToken) {
        throw new Error("Failed to get ID token from Firebase");
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/google-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        credentials: "include",
      });

      console.log("Backend response status:", response.status);
      const data = await response.json();
      console.log("Backend response data:", data);

      if (response.ok) {
        toast.success('Logged in successfully with Google!');
        setUser(data.user); // Update your auth context
        navigate("/");
      } else {
    
        toast.error(data.message || 'Google login failed.');
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error('An error occurred. Please try again.');
    }
  };

  return (
     <>
      {/* Google Auth Button */}
       <button
        type="button"
        onClick={handleGoogleClick}
        className="w-full flex items-center justify-center gap-3 border border-gray-600 rounded-lg px-4 py-2 mb-4 hover:bg-gray-700 transition hover: cursor-pointer"
      >
        <FcGoogle size={22} />
        <span className="text-white font-medium">Continue with Google</span>
      </button>

      {/* Divider with OR */}
      <div className="flex items-center my-4">
        <div className="flex-grow h-[1px] bg-gray-600"></div>
        <span className="text-gray-400 px-3 text-sm">OR</span>
        <div className="flex-grow h-[1px] bg-gray-600"></div>
      </div>
    </>
  );
}
