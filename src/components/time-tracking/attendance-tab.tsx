import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignatureCanvas } from '@/components/ui/signature-canvas';
import { Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

interface AttendanceTabProps {
  users: User[];
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ users }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const { toast } = useToast();

  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const currentHour = new Date().getHours();
  const canMarkAttendance = currentHour >= 8 && currentHour < 12;
  const isAfterDeadline = currentHour >= 12;

  const handleUserClick = (user: User) => {
    if (isAfterDeadline) {
      toast({
        title: "Trop tard pour pointer",
        description: "Les pointages d'arrivée ne sont plus possibles après 12:00. Vous êtes marqué absent pour aujourd'hui.",
        variant: "destructive",
      });
      return;
    }
    
    if (!canMarkAttendance) {
      toast({
        title: "Pointage non autorisé",
        description: "Les pointages d'arrivée sont possibles entre 08:00 et 12:00.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedUser(user);
    setIsSignatureModalOpen(true);
  };

  const handleSignatureComplete = (signature: string) => {
    if (selectedUser) {
      // TODO: Save attendance record
      toast({
        title: "Pointage enregistré",
        description: `Arrivée de ${selectedUser.firstName} ${selectedUser.lastName} à ${currentTime}`,
        variant: "default",
      });
      
      setIsSignatureModalOpen(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-primary text-primary-foreground">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Fiche de Présence
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Cliquez sur votre nom pour pointer votre arrivée (disponible de 08:00 à 12:00)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <Card
                key={user.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  canMarkAttendance 
                    ? 'hover:bg-accent border-border' 
                    : isAfterDeadline
                    ? 'opacity-50 cursor-not-allowed border-destructive/20 bg-destructive/5'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => handleUserClick(user)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{user.position}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {!canMarkAttendance && (
            <div className={`mt-6 p-4 rounded-lg ${
              isAfterDeadline 
                ? 'bg-destructive/10 border border-destructive/20' 
                : 'bg-warning/10 border border-warning/20'
            }`}>
              <p className={`font-medium ${
                isAfterDeadline ? 'text-destructive-foreground' : 'text-warning-foreground'
              }`}>
                {isAfterDeadline 
                  ? '🚫 Délai dépassé - Marqué absent pour la journée' 
                  : '⏰ Les pointages d\'arrivée sont disponibles de 08:00 à 12:00'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Heure actuelle : {currentTime}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Signature de pointage</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Pointage d'arrivée pour <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                  <br />
                  Heure : {currentTime}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <SignatureCanvas
              onSignatureComplete={handleSignatureComplete}
              width={350}
              height={150}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};