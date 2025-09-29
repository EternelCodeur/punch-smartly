import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignatureCanvas } from '@/components/ui/signature-canvas';
import { LogOut, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DepartureFormData {
  firstName: string;
  lastName: string;
  position: string;
  reason: string;
}

export const DepartureTab: React.FC = () => {
  const [formData, setFormData] = useState<DepartureFormData>({
    firstName: '',
    lastName: '',
    position: '',
    reason: '',
  });
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'departure' | 'return'>('departure');
  const { toast } = useToast();

  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const currentHour = new Date().getHours();
  const canMarkDeparture = currentHour >= 13;

  const handleInputChange = (field: keyof DepartureFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (type: 'departure' | 'return') => {
    if (type === 'departure' && !canMarkDeparture) {
      toast({
        title: "Sortie non autorisée",
        description: "Les sorties ne sont possibles qu'à partir de 13:00.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.position) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez remplir le nom, prénom et fonction.",
        variant: "destructive",
      });
      return;
    }

    if (type === 'departure' && !formData.reason) {
      toast({
        title: "Motif obligatoire",
        description: "Veuillez préciser le motif de sortie.",
        variant: "destructive",
      });
      return;
    }

    setActionType(type);
    setIsSignatureModalOpen(true);
  };

  const handleSignatureComplete = (signature: string) => {
    // TODO: Save departure/return record
    const actionText = actionType === 'departure' ? 'Sortie' : 'Retour';
    
    toast({
      title: `${actionText} enregistré${actionType === 'departure' ? 'e' : ''}`,
      description: `${actionText} de ${formData.firstName} ${formData.lastName} à ${currentTime}`,
      variant: "default",
    });
    
    setIsSignatureModalOpen(false);
    
    // Clear form after departure, keep data for return
    if (actionType === 'departure') {
      setFormData(prev => ({ ...prev, reason: '' }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-primary text-primary-foreground">
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Fiche de Sortie
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Enregistrez vos sorties temporaires et retours (sorties possibles à partir de 13:00)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Entrez votre prénom"
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Entrez votre nom"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="position">Fonction *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="Votre fonction dans l'entreprise"
                />
              </div>
              
              <div>
                <Label htmlFor="reason">Motif de sortie</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Précisez le motif de votre sortie..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-6 pt-6 border-t">
            <Button
              onClick={() => handleSubmit('departure')}
              className="flex-1"
              disabled={!canMarkDeparture}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Enregistrer Sortie
            </Button>
            
            <Button
              onClick={() => handleSubmit('return')}
              variant="outline"
              className="flex-1"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Enregistrer Retour
            </Button>
          </div>
          
          {!canMarkDeparture && (
            <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-warning-foreground font-medium">
                ⏰ Les sorties ne sont autorisées qu'à partir de 13:00
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
            <DialogTitle>
              Signature de {actionType === 'departure' ? 'sortie' : 'retour'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'departure' ? 'Sortie' : 'Retour'} de{' '}
              <strong>{formData.firstName} {formData.lastName}</strong>
              <br />
              Heure : {currentTime}
              {actionType === 'departure' && formData.reason && (
                <>
                  <br />
                  Motif : {formData.reason}
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
