import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignatureCanvas } from '@/components/ui/signature-canvas';
import { LogOut, LogIn, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listEmployes, type Employe, listTemporaryDepartures, createTemporaryDeparture, markTemporaryDepartureReturn, type TemporaryDeparture } from '@/lib/api';
import { CHECKOUT_START_MIN, getNowMinutes as getNowMinutesFn, SIGNATURE_MODAL_WIDTH, SIGNATURE_MODAL_HEIGHT, SIGNATURE_CANVAS_WIDTH, SIGNATURE_CANVAS_HEIGHT } from '@/lib/config';

interface DepartureFormData {
  firstName: string;
  lastName: string;
  position: string;
  reason: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
}

interface DepartureTabProps {
  users: User[];
  onUpdated?: () => void;
}

export const DepartureTab: React.FC<DepartureTabProps> = ({ users, onUpdated }) => {
  const [formData, setFormData] = useState<DepartureFormData>({
    firstName: '',
    lastName: '',
    position: '',
    reason: '',
  });
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'departure' | 'return'>('departure');
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [monthDeps, setMonthDeps] = useState<TemporaryDeparture[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);
  // Reason builder state
  const [reasonType, setReasonType] = useState<'rendezvous' | 'urgence' | 'prospection' | 'autre' | 'demarche' | null>(null);
  const [clientName, setClientName] = useState('');
  const [endroitName, setEndroitName] = useState('');
  const [urgenceName, setUrgenceName] = useState('');
  const [otherReason, setOtherReason] = useState('');

  // Build the final reason string from the selection and inputs
  useEffect(() => {
    let built = '';
    if (reasonType === 'rendezvous') built = 'Rendez-vous professionnel';
    else if (reasonType === 'urgence') built = urgenceName ? `Urgence familiale – ${urgenceName}` : 'Urgence familiale';
    else if (reasonType === 'prospection') built = clientName ? `Prospection client – ${clientName}` : 'Prospection client';
    else if (reasonType === 'demarche') built = endroitName ? `Demarche administrative – ${endroitName}` : 'Demarche administrative';
    else if (reasonType === 'autre') built = otherReason.trim();
    setFormData(prev => ({ ...prev, reason: built }));
  }, [reasonType, clientName, endroitName, otherReason, urgenceName]);

  // Recherche à la demande
  const [selectedEmp, setSelectedEmp] = useState<{ id: string; firstName: string; lastName: string; position: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Employe[]>([]);

  const currentTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Date du jour (YYYY-MM-DD)
  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  // Deprecated gating: sorties autorisées à toute heure (conservé si besoin)
  const nowMin = getNowMinutesFn();
  const canMarkDeparture = true;

  // YYYY-MM for current month
  const monthStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  })();

  const reloadMonth = async () => {
    try {
      setDepsLoading(true);
      const list = await listTemporaryDepartures(monthStr);
      setMonthDeps(list);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Chargement des sorties impossible', variant: 'destructive' });
    } finally {
      setDepsLoading(false);
    }
  };

  // Résolution d'URL fichier backend: si le backend renvoie /storage/...
  // on préfixe avec VITE_BACKEND_URL si défini, sinon on garde tel quel.
  const resolveFileUrl = (url?: string | null) => {
    if (!url) return '';
    const base = (import.meta as any).env?.VITE_BACKEND_URL?.replace(/\/$/, '') || '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return base ? `${base}${url}` : url;
    return url;
  };

  // Retourne une source d'image valide pour la signature
  const getSignatureSrc = (d: TemporaryDeparture): string => {
    const file = resolveFileUrl(d.return_signature_file_url);
    if (file) return file;
    // Fallback base64 si présent
    if (d.return_signature && d.return_signature.startsWith('data:image')) return d.return_signature;
    return '';
  };

  // Affichage date: DD-MM-YYYY
  const formatDate = (iso?: string | null) => {
    if (!iso) return '-';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  // Charger la liste au montage
  useEffect(() => {
    reloadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr]);

  // Limiter l'affichage aux employés de l'entreprise connectée (via la prop users)
  const filteredMonthDeps = React.useMemo(() => {
    if (!users || users.length === 0) return [] as TemporaryDeparture[];
    const allowedIds = new Set(users.map(u => Number(u.id)));
    return monthDeps.filter(d => allowedIds.has(Number(d.employe_id)) || (d.employe && allowedIds.has(Number(d.employe.id))));
  }, [monthDeps, users]);

  const handleSearch = async () => {
    const q = formData.lastName.trim().toLowerCase();
    if (!q) {
      toast({ title: 'Recherche', description: 'Saisissez un nom ou un prénom avant de rechercher.', variant: 'destructive' });
      return;
    }
    try {
      setSearching(true);
      const emps = await listEmployes();
      const nameMatches = emps.filter(e =>
        e.first_name?.toLowerCase().includes(q) || e.last_name?.toLowerCase().includes(q)
      );
      if (nameMatches.length === 0) {
        setResults([]);
        setSelectedEmp(null);
        toast({ title: 'Employé inconnu', description: 'Aucun employé ne correspond à votre recherche.', variant: 'destructive' });
        return;
      }

      const signedToday = nameMatches.filter(e => !!e.arrival_signed && e.attendance_date === todayStr);
      if (signedToday.length === 0) {
        setResults([]);
        setSelectedEmp(null);
        toast({ title: "Employé absent", description: "Arrivée non signée aujourd'hui.", variant: 'destructive' });
        return;
      }

      // Exclure ceux qui ont déjà signé le départ aujourd'hui
      const available = signedToday.filter(e => !e.departure_signed);
      if (available.length === 0) {
        setResults([]);
        setSelectedEmp(null);
        toast({ title: "Employé déjà parti", description: "Le départ a déjà été signé pour aujourd'hui.", variant: 'destructive' });
        return;
      }

      if (available.length === 1) {
        const e = available[0];
        setSelectedEmp({ id: String(e.id), firstName: e.first_name, lastName: e.last_name, position: e.position || '' });
        setFormData(prev => ({ ...prev, firstName: e.first_name, lastName: e.last_name, position: e.position || '' }));
        setResults([]);
      } else {
        // Plusieurs correspondances éligibles aujourd'hui (arrivée signée et pas encore partis): afficher la liste pour choisir
        setResults(available.slice(0, 10));
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Recherche impossible', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (field: keyof DepartureFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (type: 'departure' | 'return') => {
    if (!formData.lastName) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez saisir votre nom puis lancer la recherche.",
        variant: "destructive",
      });
      return;
    }

    // Requiert une sélection après recherche
    if (!selectedEmp) {
      toast({
        title: "Sélection requise",
        description: "Cliquez sur votre fiche dans les résultats de recherche.",
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

    if (type === 'departure') {
      // Sortie: pas de signature, on crée directement côté backend
      try {
        setSaving(true);
        await createTemporaryDeparture(Number(selectedEmp.id), formData.reason);
        await reloadMonth();
        toast({ title: 'Sortie enregistrée', description: `${formData.firstName} ${formData.lastName} à ${currentTime}` });
        setFormData(prev => ({ ...prev, reason: '' }));
        onUpdated?.();
      } catch (e: any) {
        toast({ title: 'Erreur', description: e?.message || 'Enregistrement impossible', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
      return;
    }

    // Retour: ouvre la signature
    setActionType('return');
    setIsSignatureModalOpen(true);
  };

  const handleSignatureComplete = async (signature: string) => {
    const fullFirst = formData.firstName.trim();
    const fullLast = formData.lastName.trim();
    const fullPos = formData.position.trim();
    if (!fullFirst || !fullLast) return;

    const match = selectedEmp;

    if (!match) {
      toast({ title: 'Employé introuvable', description: 'Nom, prénom ou fonction incorrect(s).', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      if (actionType === 'departure') {
        await createTemporaryDeparture(Number(match.id), formData.reason);
        await reloadMonth();
      } else {
        // Trouver la dernière sortie ouverte (sans return_time) pour cet employé
        const open = [...monthDeps]
          .filter(d => d.employe_id === Number(match.id) && !d.return_time)
          .sort((a,b)=> (a.date + a.departure_time).localeCompare(b.date + b.departure_time))
          .pop();
        if (!open) {
          toast({ title: 'Aucune sortie ouverte', description: "Aucune sortie sans retour trouvée pour cet employé.", variant: 'destructive' });
        } else {
          await markTemporaryDepartureReturn(open.id, signature);
          await reloadMonth();
        }
      }
      const actionText = actionType === 'departure' ? 'Sortie' : 'Retour';
      toast({
        title: `${actionText} enregistrée`,
        description: `${actionText} de ${fullFirst} ${fullLast} à ${currentTime}`,
        variant: 'default',
      });
      setIsSignatureModalOpen(false);
      if (actionType === 'departure') {
        setFormData(prev => ({ ...prev, reason: '' }));
        setReasonType(null);
        setClientName('');
        setEndroitName('');
        setOtherReason('');
      }
      onUpdated?.();
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
            Fiche de Sortie
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Enregistrez vos sorties temporaires
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="lastName">Nom ou Prénom *</Label>
                <div className="flex gap-2">
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Entrez votre nom ou prénom"
                  />
                  <Button type="button" onClick={handleSearch} disabled={searching}>
                    {searching ? 'Recherche…' : 'Rechercher'}
                  </Button>
                </div>
                {/* Résultats */}
                {results.length > 0 && (
                  <div className="mt-2 border rounded">
                    {results.map(e => (
                      <button
                        type="button"
                        key={e.id}
                        className={`w-full text-left px-3 py-2 hover:bg-muted ${selectedEmp?.id === String(e.id) ? 'bg-muted' : ''}`}
                        onClick={() => {
                          setSelectedEmp({ id: String(e.id), firstName: e.first_name, lastName: e.last_name, position: e.position || '' });
                          setFormData(prev => ({ ...prev, firstName: e.first_name, lastName: e.last_name, position: e.position || '' }));
                        }}
                      >
                        {e.first_name} {e.last_name} {e.position ? `• ${e.position}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                
              </div>
            </div>
            
            <div className="space-y-4">
                {selectedEmp && (
                  <div className="mt-2 flex items-start gap-2 rounded border border-orange-200 bg-orange-50 p-2 animate-pulse">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div className="text-xs text-orange-800">
                      <p className="font-medium">Action requise</p>
                      <p>
                        Veuillez choisir une carte ci-dessous pour indiquer le motif de votre sortie. 
                        Si vous sélectionnez « Prospection client », renseignez aussi le nom du client.
                      </p>
                    </div>
                  </div>
                )}
              {selectedEmp && (
                <div className="space-y-3">
                  <Label>Motif de sortie</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`border rounded p-3 ${reasonType==='demarche' ? 'ring-2 ring-primary' : ''}`}>
                      <button
                        type="button"
                        className="w-full text-left hover:bg-accent rounded p-1"
                        onClick={() => setReasonType('demarche')}
                      >
                        <p className="font-medium">Démarche administratif</p>
                        <p className="text-xs text-muted-foreground">Situation urgente à domicile</p>
                      </button>
                      {reasonType === 'demarche' && (
                        <div className="mt-2">
                          <Label htmlFor="endroitName" className="text-xs">Endroit</Label>
                          <Input
                            id="endroitName"
                            placeholder="Ex: Maladie parent"
                            value={endroitName}
                            onChange={(e) => setEndroitName(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Sera inclus dans le motif</p>
                        </div>
                      )}
                    </div>
                    <div className={`border rounded p-3 ${reasonType==='urgence' ? 'ring-2 ring-primary' : ''}`}>
                      <button
                        type="button"
                        className="w-full text-left hover:bg-accent rounded p-1"
                        onClick={() => setReasonType('urgence')}
                      >
                        <p className="font-medium">Urgence familiale</p>
                        <p className="text-xs text-muted-foreground">Situation urgente à domicile</p>
                      </button>
                      {reasonType === 'urgence' && (
                        <div className="mt-2">
                          <Label htmlFor="urgenceName" className="text-xs">Motif</Label>
                          <Input
                            id="urgenceName"
                            placeholder="Ex: Maladie parent"
                            value={urgenceName}
                            onChange={(e) => setUrgenceName(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Sera inclus dans le motif</p>
                        </div>
                      )}
                    </div>
                    <div
                      className={`border rounded p-3 ${reasonType==='prospection' ? 'ring-2 ring-primary' : ''}`}
                    >
                      <button
                        type="button"
                        className="w-full text-left hover:bg-accent rounded p-1"
                        onClick={() => setReasonType('prospection')}
                      >
                        <p className="font-medium">Prospection client</p>
                        <p className="text-xs text-muted-foreground">Visite/relance client</p>
                      </button>
                      {reasonType === 'prospection' && (
                        <div className="mt-2">
                          <Label htmlFor="clientName" className="text-xs">Nom du client</Label>
                          <Input
                            id="clientName"
                            placeholder="Ex: Société ABC"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Sera inclus dans le motif</p>
                        </div>
                      )}
                    </div>
                    <div className={`border rounded p-3 ${reasonType==='autre' ? 'ring-2 ring-primary' : ''}`}>
                      <button
                        type="button"
                        className="w-full text-left hover:bg-accent rounded p-1"
                        onClick={() => setReasonType('autre')}
                      >
                        <p className="font-medium">Autre</p>
                        <p className="text-xs text-muted-foreground">Saisir un motif personnalisé</p>
                      </button>
                      {reasonType === 'autre' && (
                        <div className="mt-2">
                          <Textarea
                            placeholder="Décrivez le motif..."
                            rows={3}
                            value={otherReason}
                            onChange={(e) => setOtherReason(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`border rounded p-3 text-left hover:bg-accent ${reasonType==='rendezvous' ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setReasonType('rendezvous')}
                    >
                      <p className="font-medium">Rendez-vous professionnel</p>
                      <p className="text-xs text-muted-foreground">Déplacement lié au travail</p>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-4 mt-6 pt-6 border-t">
            <Button
              onClick={() => handleSubmit('departure')}
              className="flex-1"
              disabled={!selectedEmp}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Enregistrer Sortie
            </Button>
          </div>
          
          {/* Sorties temporaires autorisées à toute heure */}
        </CardContent>
      </Card>

      {/* Tableau des sorties du mois (uniquement entreprise connectée) */}
      {filteredMonthDeps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Sorties du mois
            </CardTitle>
            <CardDescription>
              Cliquez sur "Marquer retour" pour enregistrer l'heure de retour.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Employé</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Fonction</th>
                    <th className="py-2 pr-4">Heure départ</th>
                    <th className="py-2 pr-4">Heure retour</th>
                    <th className="py-2 pr-4">Motif</th>
                    <th className="py-2 pr-4">Signature</th>
                    <th className="py-2 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonthDeps.map((d) => (
                    <tr key={d.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4">{d.employe ? `${d.employe.first_name} ${d.employe.last_name}` : `#${d.employe_id}`}</td>
                      <td className="py-2 pr-4">{formatDate(d.date)}</td>
                      <td className="py-2 pr-4">{d.employe?.position || '-'}</td>
                      <td className="py-2 pr-4">{d.departure_time}</td>
                      <td className="py-2 pr-4">{d.return_time || '-'}</td>
                      <td className="py-2 pr-4">{d.reason || '-'}</td>
                      <td className="py-2 pr-4">
                        {(() => {
                          const src = getSignatureSrc(d);
                          return src ? (
                            <img
                              src={src}
                              alt="Signature"
                              style={{ width: 50, height: 50, objectFit: 'contain', borderRadius: 4 }}
                              onError={(e) => {
                                if (d.return_signature && d.return_signature.startsWith('data:image') && e.currentTarget.src !== d.return_signature) {
                                  e.currentTarget.src = d.return_signature;
                                } else {
                                  e.currentTarget.replaceWith(document.createTextNode('-'));
                                }
                              }}
                            />
                          ) : '-';
                        })()}
                      </td>
                      <td className="py-2 pr-4">
                        {!d.return_time ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              // Pré-remplir le formulaire et ouvrir la signature pour RETURN
                              if (d.employe) {
                                setFormData({ firstName: d.employe.first_name, lastName: d.employe.last_name, position: d.employe.position || '', reason: formData.reason });
                                setSelectedEmp({ id: String(d.employe_id), firstName: d.employe.first_name, lastName: d.employe.last_name, position: d.employe.position || '' });
                              } else {
                                setFormData({ ...formData });
                                setSelectedEmp({ id: String(d.employe_id), firstName: formData.firstName, lastName: formData.lastName, position: formData.position });
                              }
                              setActionType('return');
                              setIsSignatureModalOpen(true);
                            }}
                          >
                            Marquer retour
                          </Button>
                        ) : (
                          <span className="text-emerald-600">Retour enregistré</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
        <DialogContent
          className="max-w-none p-0"
          style={{
            width: SIGNATURE_MODAL_WIDTH,
            height: SIGNATURE_MODAL_HEIGHT,
          }}
        >
          <DialogHeader className="p-4 border-b">
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
