import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/ragnexusApi.js";
import { setAuthToken } from "../api/client.js";

const AuthContext = createContext(null);
const TOKEN_KEY = "ragnexus_token";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    setAuthToken(token);

    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const commitSession = (session) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    setAuthToken(session.token);
    setToken(session.token);
    setUser(session.user);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login: async (payload) => {
        const session = await authApi.login(payload);
        commitSession(session);
      },
      register: async (payload) => {
        const session = await authApi.register(payload);
        commitSession(session);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
        setToken(null);
        setUser(null);
      }
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
