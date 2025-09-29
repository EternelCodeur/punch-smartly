import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AttendanceTab } from '@/components/time-tracking/attendance-tab';
import { DepartureTab } from '@/components/time-tracking/departure-tab';
import { Clock, Users, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Pointage: React.FC = () => {
  const { logout, user } = useAuth();

  const users = [
    { id: '1', firstName: 'Jean', lastName: 'Dupont', position: 'Développeur' },
    { id: '2', firstName: 'Marie', lastName: 'Martin', position: 'Chef de projet' },
    { id: '3', firstName: 'Pierre', lastName: 'Bernard', position: 'Designer' },
    { id: '4', firstName: 'Sophie', lastName: 'Durand', position: 'Analyste' },
    { id: '5', firstName: 'Lucas', lastName: 'Moreau', position: 'Développeur' },
    { id: '6', firstName: 'Emma', lastName: 'Lefebvre', position: 'Responsable RH' },
  ];

  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gestion des Pointages</h1>
              <p className="text-primary-foreground/80">
                {currentDate} • {currentTime}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={logout} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="attendance" className="space-y-6">
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="attendance" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Fiche de Présence
                </TabsTrigger>
                <TabsTrigger value="departure" className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Fiche de Sortie
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="attendance">
              <AttendanceTab users={users} />
            </TabsContent>

            <TabsContent value="departure">
              <DepartureTab />
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Horaires de pointage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Arrivées :</span>
                    <span className="font-medium">08:00 - 12:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sorties :</span>
                    <span className="font-medium">À partir de 12:00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Règles de gestion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jours ouvrables :</span>
                    <span className="font-medium">Lun - Ven</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Réinitialisation :</span>
                    <span className="font-medium">Chaque 27 du mois</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pointage;
