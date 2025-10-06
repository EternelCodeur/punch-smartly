import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignatureCanvas } from '@/components/ui/signature-canvas';
import { Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { attendanceCheckIn } from '@/lib/api';
import { CHECKIN_START_MIN, CHECKIN_END_MIN, getNowMinutes } from '@/lib/config';
interface User {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

interface AttendanceTabProps {
  users: User[];
  onUpdated?: () => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({ users, onUpdated }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const nowMin = getNowMinutes();
  const canMarkAttendance = nowMin >= CHECKIN_START_MIN && nowMin < CHECKIN_END_MIN;
  const isAfterDeadline = nowMin >= CHECKIN_END_MIN;

  const handleUserClick = (user: User) => {
    if (isAfterDeadline) {
      toast({
        title: " Délai dépassé - Les pointages d'arrivée ne sont plus possibles après 10:00.",
        description: "",
        variant: "destructive",
      });
      return;
    }
    
    if (!canMarkAttendance) {
      toast({
        title: "Pointage non autorisé",
        description: "Les pointages d'arrivée sont possibles entre 08:00 et 10:00.",
        variant: "destructive",
      });
      return;
    }
    setSelectedUser(user);
    setIsSignatureModalOpen(true);
  };

  const handleSignatureComplete = async (signature: string) => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await attendanceCheckIn(Number(selectedUser.id), signature);
      toast({
        title: 'Pointage enregistré',
        description: `Arrivée de ${selectedUser.firstName} ${selectedUser.lastName} à ${currentTime}`,
        variant: 'default',
      });
      setIsSignatureModalOpen(false);
      setSelectedUser(null);
      onUpdated?.();
      // Reload the page shortly after to reflect the latest state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Enregistrement impossible', variant: 'destructive' });
    } finally {
      setSaving(false);
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
            Cliquez sur votre nom pour pointer votre arrivée (disponible de {String(Math.floor(CHECKIN_START_MIN/60)).padStart(2,'0')}
            :{String(CHECKIN_START_MIN%60).padStart(2,'0')} à {String(Math.floor(CHECKIN_END_MIN/60)).padStart(2,'0')}:{String(CHECKIN_END_MIN%60).padStart(2,'0')})
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
                      <p className="text-xs mt-1 text-emerald-600">
                        {canMarkAttendance ? 'Arrivée non signée' : null}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!canMarkAttendance && (
            <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-warning-foreground font-medium text-black">
                ⏰ Délai dépassé - Les pointages d'arrivée ne sont plus disponibles après {String(Math.floor(CHECKIN_END_MIN/60)).padStart(2,'0')}:{String(CHECKIN_END_MIN%60).padStart(2,'0')}
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