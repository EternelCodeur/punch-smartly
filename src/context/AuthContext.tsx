import React, { createContext, useContext, useMemo, useState } from "react";

export type Role = "user" | "admin";

export type AuthUser = {
  username: string;
  role: Role;
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "punch-smartly_auth";

// Demo users. Replace with real API calls later.
const DEMO_USERS: Record<string, { password: string; role: Role }> = {
  admin: { password: "admin123", role: "admin" },
  user: { password: "user123", role: "user" },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    // Simulate async call
    await new Promise((res) => setTimeout(res, 300));

    const record = DEMO_USERS[username];
    if (!record || record.password !== password) {
      throw new Error("Identifiants invalides");
    }

    const nextUser: AuthUser = { username, role: record.role };
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    login,
    logout,
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
