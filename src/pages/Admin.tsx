import React from 'react';
import { Button } from '@/components/ui/button';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { useAuth } from '@/context/AuthContext';

const Admin: React.FC = () => {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Connecté en tant que</span>
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={logout}>Se déconnecter</Button>
          </div>
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
