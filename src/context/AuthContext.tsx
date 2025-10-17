import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

export type Role = "user" | "admin" | "superadmin" | "supertenant";
export type AuthUser = {
  username: string;
  role: Role;
  tenant_id?: number | null;
  enterprise_id?: number | null;
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hydrating: boolean;
  logout: () => void;
  loginWithPassword: (password: string, remember?: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "punch-smartly_auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Hydrate synchronously from localStorage to survive hard refresh
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.username === 'string' && parsed.role) {
        return parsed as AuthUser;
      }
    } catch {}
    return null;
  });
  const [hydrating, setHydrating] = useState<boolean>(true);

  useEffect(() => {
    // Hydrater depuis l'API (/api/me) avec credentials
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include', headers: { 'Accept': 'application/json' } });
        if (!res.ok) return; // non authentifié => user reste null
        const data = await res.json();
        const srvUser = (data?.user ?? data) as any;
        if (srvUser?.nom && srvUser?.role) {
          const nextUser: AuthUser = { username: srvUser.nom, role: srvUser.role, tenant_id: srvUser.tenant_id, enterprise_id: srvUser.enterprise_id };
          setUser(nextUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        }
      } catch {}
      finally {
        setHydrating(false);
      }
    })();
  }, []);

  const logout = () => {
    // Prévenir le backend (supprime cookies token et user)
    fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const loginWithPassword = async (password: string, remember: boolean = false) => {
    const res = await fetch(`/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password, remember }),
    });
    if (!res.ok) {
      let msg = 'Identifiants invalides';
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
      throw new Error(msg);
    }
    // Définir immédiatement l'utilisateur depuis la réponse de /api/login (plus réactif)
    try {
      const data = await res.json();
      const srvUser = (data?.user ?? data) as any;
      if (srvUser?.nom && srvUser?.role) {
        const nextUser: AuthUser = { username: srvUser.nom, role: srvUser.role, tenant_id: srvUser.tenant_id, enterprise_id: srvUser.enterprise_id };
        setUser(nextUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      }
    } catch {}

    // Puis, récupérer l'utilisateur depuis /api/me pour confirmer la session côté serveur
    try {
      const me = await fetch('/api/me', { credentials: 'include', headers: { 'Accept': 'application/json' } });
      if (me.ok) {
        const j = await me.json();
        const srvUser = (j?.user ?? j) as any;
        if (srvUser?.nom && srvUser?.role) {
          const nextUser: AuthUser = { username: srvUser.nom, role: srvUser.role, tenant_id: srvUser.tenant_id, enterprise_id: srvUser.enterprise_id };
          setUser(nextUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
          return;
        }
      }
    } catch {}
    // fallback: si /api/me indisponible, laisser user inchangé
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    hydrating,
    logout,
    loginWithPassword,
  }), [user, hydrating]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

