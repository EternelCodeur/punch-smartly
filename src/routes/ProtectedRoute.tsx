import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Role, useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  allow: Role[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allow, redirectTo = "/login" }) => {
  const { isAuthenticated, user, hydrating } = useAuth();
  const location = useLocation();

  // Attendre l'hydratation pour éviter une redirection prématurée
  if (hydrating) {
    return null; // ou un indicateur de chargement
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (!allow.includes(user.role)) {
    const fallback = user.role === "superadmin" ? "/superadmin" : user.role === "admin" ? "/admin" : "/pointage";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

