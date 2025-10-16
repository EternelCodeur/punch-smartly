import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignatureCanvas } from '@/components/ui/signature-canvas';
import { LogOut, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { attendanceCheckOut } from '@/lib/api';
import { CHECKOUT_START_MIN, getNowMinutes, SIGNATURE_MODAL_WIDTH, SIGNATURE_MODAL_HEIGHT, SIGNATURE_CANVAS_WIDTH, SIGNATURE_CANVAS_HEIGHT } from '@/lib/config';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

interface DepartureListTabProps {
  users: User[];
  onUpdated?: () => void;
}

export const DepartureListTab: React.FC<DepartureListTabProps> = ({ users, onUpdated }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const nowMin = getNowMinutes();
  const canMarkDeparture = nowMin >= CHECKOUT_START_MIN; // à partir de l'heure configurée

  const handleUserClick = (user: User) => {
    if (!canMarkDeparture) {
      toast({
        title: "Sortie non autorisée",
        description: `Les sorties ne sont possibles qu'à partir de ${String(Math.floor(CHECKOUT_START_MIN/60)).padStart(2,'0')}:${String(CHECKOUT_START_MIN%60).padStart(2,'0')}.`,
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
      await attendanceCheckOut(Number(selectedUser.id), signature);
      toast({
        title: 'Départ enregistré',
        description: `Départ de ${selectedUser.firstName} ${selectedUser.lastName} à ${currentTime}`,
        variant: 'default',
      });
      setIsSignatureModalOpen(false);
      setSelectedUser(null);
      onUpdated?.();
      setTimeout(() => {
        window.location.reload();
      }, 100);
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
            <LogOut className="h-5 w-5" />
            Liste des Départs
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Cliquez sur votre nom pour signer votre départ (à partir de {String(Math.floor(CHECKOUT_START_MIN/60)).padStart(2,'0')}:{String(CHECKOUT_START_MIN%60).padStart(2,'0')})
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <Card
                key={user.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  canMarkDeparture
                    ? 'hover:bg-accent border-border'
                    : 'opacity-50 cursor-not-allowed border-warning/20 bg-warning/5'
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
                        {canMarkDeparture
                          ? 'Prêt pour départ'
                          : `Départs à partir de ${String(Math.floor(CHECKOUT_START_MIN/60)).padStart(2,'0')}:${String(CHECKOUT_START_MIN%60).padStart(2,'0')}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!canMarkDeparture && (
            <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-warning-foreground font-medium text-black">
                ⏰ Les départs ne sont autorisés qu'à partir de {String(Math.floor(CHECKOUT_START_MIN/60)).padStart(2,'0')}:{String(CHECKOUT_START_MIN%60).padStart(2,'0')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
        <DialogContent
          className="max-w-none p-0 mx-4 sm:mx-6"
          style={{
            width: SIGNATURE_MODAL_WIDTH,
            height: SIGNATURE_MODAL_HEIGHT,
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100vh - 2rem)'
          }}
        >
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Signature de départ</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  Départ de <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
                  <br />
                  Heure : {currentTime}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4">
            <SignatureCanvas
              onSignatureComplete={handleSignatureComplete}
              width={SIGNATURE_CANVAS_WIDTH}
              height={SIGNATURE_CANVAS_HEIGHT}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
