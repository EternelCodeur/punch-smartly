import React, { createContext, useContext, useMemo, useState } from "react";

export type Role = "user" | "admin" | "superadmin";

export type AuthUser = {
  username: string;
  role: Role;
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  createAccount: (username: string, password: string, role: Role) => Promise<void>;
  listAccounts: () => { username: string; role: Role }[];
  deleteAccount: (username: string) => Promise<void>;
  loginWithPassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "punch-smartly_auth";
const USERS_KEY = "punch-smartly_users";

// Initial demo users. A real app should use API calls.
const DEMO_USERS: Record<string, { password: string; role: Role }> = {
  superadmin: { password: "super123", role: "superadmin" },
  admin: { password: "admin123", role: "admin" },
  user: { password: "user123", role: "user" },
};

type StoredAccount = { username: string; password: string; role: Role };

const loadAccounts = (): Record<string, StoredAccount> => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, StoredAccount>;
      // Auto-heal: if empty or missing demo users, merge them in
      const needsSeed = !parsed || Object.keys(parsed).length === 0;
      const missingDemo = Object.entries(DEMO_USERS).some(([u, v]) => !parsed?.[u]);
      if (needsSeed || missingDemo) {
        const healed: Record<string, StoredAccount> = {
          ...(parsed || {}),
          ...Object.fromEntries(Object.entries(DEMO_USERS).map(([u, v]) => [u, { username: u, password: v.password, role: v.role }]))
        };
        localStorage.setItem(USERS_KEY, JSON.stringify(healed));
        return healed;
      }
      return parsed;
    }
  } catch {}
  // Seed with demo users if none exist
  const seeded: Record<string, StoredAccount> = Object.fromEntries(
    Object.entries(DEMO_USERS).map(([u, v]) => [u, { username: u, password: v.password, role: v.role }])
  );
  localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
  return seeded;
};

const saveAccounts = (accounts: Record<string, StoredAccount>) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
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

    const accounts = loadAccounts();
    const record = accounts[username];
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

  const loginWithPassword = async (password: string) => {
    await new Promise((res) => setTimeout(res, 300));
    const accounts = loadAccounts();
    const matches = Object.values(accounts).filter(a => a.password === password);
    if (matches.length === 0) throw new Error("Mot de passe invalide");
    if (matches.length > 1) throw new Error("Mot de passe ambigü: plusieurs comptes correspondent");
    const acc = matches[0];
    const nextUser: AuthUser = { username: acc.username, role: acc.role };
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  };

  const createAccount = async (username: string, password: string, role: Role) => {
    await new Promise((res) => setTimeout(res, 200));
    if (!username || !password) throw new Error("Nom d'utilisateur et mot de passe requis");
    const accounts = loadAccounts();
    if (accounts[username]) throw new Error("Ce nom d'utilisateur existe déjà");
    accounts[username] = { username, password, role };
    saveAccounts(accounts);
  };

  const listAccounts = () => {
    const accounts = loadAccounts();
    return Object.values(accounts).map(({ username, role }) => ({ username, role }));
  };

  const deleteAccount = async (username: string) => {
    await new Promise((res) => setTimeout(res, 200));
    const accounts = loadAccounts();
    if (!accounts[username]) return;
    // Prevent deleting last superadmin
    const isSuper = accounts[username].role === "superadmin";
    if (isSuper) {
      const remaining = Object.values(accounts).filter(a => a.role === "superadmin" && a.username !== username).length;
      if (remaining === 0) throw new Error("Impossible de supprimer le dernier superadmin");
    }
    delete accounts[username];
    saveAccounts(accounts);
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    login,
    logout,
    createAccount,
    listAccounts,
    deleteAccount,
    loginWithPassword,
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

