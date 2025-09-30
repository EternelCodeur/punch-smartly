import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Pointage from "./pages/Pointage";
import Admin from "./pages/Admin";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import UserAttendance from "@/pages/admin/UserAttendance";
import SuperAdmin from "./pages/SuperAdmin";

const queryClient = new QueryClient();

const HomeRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const path = user.role === "superadmin" ? "/superadmin" : user.role === "admin" ? "/admin" : "/pointage";
  return <Navigate to={path} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute allow={["user"]} />}>
              <Route path="/pointage" element={<Pointage />} />
            </Route>

            <Route element={<ProtectedRoute allow={["admin"]} />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/users/:id/attendance" element={<UserAttendance />} />
            </Route>

            <Route element={<ProtectedRoute allow={["superadmin"]} />}>
              <Route path="/superadmin" element={<SuperAdmin />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
