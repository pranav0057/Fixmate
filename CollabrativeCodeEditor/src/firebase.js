import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyBkwxFMNn1xlgfpx083FoG_o_2dJ_zOVDk",
  authDomain: "fixmate-1.firebaseapp.com",
  projectId: "fixmate-1",
  storageBucket: "fixmate-1.firebasestorage.app",
  messagingSenderId: "1080288228207",
  appId: "1:1080288228207:web:2e6da49a0b51c00b602e9a",
  measurementId: "G-YFGJFEG0WC"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

