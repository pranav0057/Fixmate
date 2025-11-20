
import React, { createContext, useContext, useState, useEffect } from "react";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);


  useEffect(() => {

    const checkAuthStatus = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/auth/current-user`, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data); // Store the user object
        } else {
          setUser(null); // Not authenticated
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
