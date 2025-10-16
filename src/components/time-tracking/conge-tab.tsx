import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { listEmployes, type Employe, createAbsence } from '@/lib/api';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, LogOut, Briefcase, Calendar, Baby, Heart, Users, Skull, HeartCrack, Activity, Award } from 'lucide-react';

interface CongesTabProps {
  onUpdated?: () => void;
}

type View = 'search' | 'selection' | 'conge_types' | 'conge_form' | 'permissions_list';

interface Permission {
  title: string;
  duration: string;
  justification: string;
  icon: React.ElementType;
}

const permissions: Permission[] = [
  { title: "Naissance d'un enfant", duration: '3 jours', justification: 'Acte de naissance', icon: Baby },
  { title: "Mariage de l'employé", duration: '4 jours', justification: 'Certificat de mariage', icon: Heart },
  { title: 'Mariage Frère, Soeur ou Enfant', duration: '2 jours', justification: 'Certificat de mariage', icon: Users },
  { title: "Décès d'un frère ou d'une soeur", duration: '2 jours', justification: 'Acte de décès', icon: Skull },
  { title: "Décès du conjoit(e), du Pére, de la Mère", duration: '5 jours', justification: 'Acte de décès', icon: HeartCrack },
  { title: 'Décès de la belle Mère ou du beau Pére', duration: '2 jours', justification: 'Acte de décès', icon: Skull },
  { title: 'Accident ou maladie Enfant ou Conjoint(e)', duration: '15 jours', justification: 'Bulletin médical', icon: Activity },
  { title: 'Maladie', duration: '3 jours', justification: 'Bulletin médical', icon: Activity },
  { title: 'Ceremonie Réligieuse', duration: '1 jour', justification: 'Document officiel', icon: Award },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Helpers: permissions & business days (module scope)
function getAllowedDaysForPermission(title: string): number | null {
  const p = permissions.find(pp => pp.title === title);
  if (!p) return null;
  const m = p.duration.match(/(\\d+)\\s*jours?/i);
  return m ? parseInt(m[1], 10) : null;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

// Add N business days, excluding the start day itself
function addBusinessDaysExclusive(startISO: string, n: number): string {
  if (!startISO || !Number.isFinite(n) || n <= 0) return startISO;
  let d = new Date(startISO + 'T00:00:00');
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added += 1;
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Count business days between start (exclusive) and end (inclusive)
function countBusinessDaysExclusiveStart(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const start = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');
  if (end < start) return 0;
  let count = 0;
  const d = new Date(start);
  d.setDate(d.getDate() + 1); // exclude start day
  while (d <= end) {
    if (!isWeekend(d)) count += 1;
    d.setDate(d.getDate() + 1);
  }
  return count;
}
export const CongesTab: React.FC<CongesTabProps> = ({ onUpdated }) => {
  const { toast } = useToast();

  const [view, setView] = useState<View>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employe | null>(null);
  const [expandedPermission, setExpandedPermission] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) {
      toast({ title: 'Recherche', description: 'Veuillez saisir un nom pour commencer.' });
      return;
    }
    setSearching(true);
    try {
      const allEmployes = await listEmployes();
      const found = allEmployes.find(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (found) {
        setSelectedEmp(found);
        setView('selection');
      } else {
        toast({ title: 'Employé non trouvé', variant: 'destructive' });
        setSelectedEmp(null);
      }
    } catch (error) {
      toast({ title: 'Erreur de recherche', description: 'Impossible de contacter le serveur.', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const resetFlow = () => {
    setView('search');
    setSearchQuery('');
    setSelectedEmp(null);
    setLeaveType(null);
    setStartDate('');
    setEndDate('');
    setExpandedPermission(null);
  };

  const goBack = () => {
    if (view === 'conge_form' || view === 'permissions_list' || view === 'conge_types') {
      setView('selection');
      setExpandedPermission(null);
    }
  };

  const handleSubmit = async (type: string, start: string, end: string) => {
    if (!start || !end) {
      toast({ title: 'Champs requis', description: 'Les dates de début et de fin sont obligatoires.', variant: 'destructive' });
      return;
    }
    const isPermission = permissions.some(p => p.title === type);
    // Enforce maximum allowed business days for permissions
    if (isPermission) {
      const allowed = getAllowedDaysForPermission(type);
      if (allowed && allowed > 0) {
        const used = countBusinessDaysExclusiveStart(start, end);
        if (used > allowed) {
          toast({
            title: 'Trop de jours',
            description: `La permission « ${type} » autorise ${allowed} jour(s) ouvré(s). Vous en avez ${used}. Réduisez la date de fin.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    if (!selectedEmp) {
      toast({ title: 'Sélection requise', description: 'Veuillez d\'abord sélectionner un employé.' , variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    // Map to backend payload: always send the human-readable selection as reason
    const status = isPermission ? 'permission' : 'conge';
    const reason = type; // e.g., "Congé Payé", "Congé Non Payé", or a permission title

    try {
      await createAbsence({
        employe_id: Number(selectedEmp.id),
        start_date: start,
        end_date: end,
        status,
        reason,
      });

      toast({ title: 'Succès', description: 'Votre demande a été soumise avec succès.' });
      resetFlow();
      onUpdated?.();
    } catch {
      toast({ title: 'Erreur de soumission', description: 'Une erreur est survenue.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'search':
        return (
          <div>
            <Label htmlFor="employee-search" className="text-sm">Nom ou Prénom *</Label>
            <div className="flex max-w-full mx-auto mt-2">
              <Input
                id="employee-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Entrez votre nom ou prénom"
                onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching} className="ml-2">
                {searching ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
          </div>
        );

      case 'selection':
        return (
          <motion.div variants={cardVariants} initial="hidden" animate="visible" className="space-y-4">
            <Button onClick={resetFlow} variant="link" className="p-0 h-auto text-sm">Changer d'employé</Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants}>
                <Card className="cursor-pointer h-full hover:shadow-lg transition-shadow" onClick={() => setView('conge_types')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar /> Congés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Demander un congé payé ou non payé.</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="cursor-pointer h-full hover:shadow-lg transition-shadow" onClick={() => setView('permissions_list')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase /> Permissions Exceptionnelles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>Pour un événement spécial (naissance, mariage, etc.).</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        );

      case 'conge_types':
        return (
          <motion.div variants={cardVariants} initial="hidden" animate="visible" className="space-y-4">
            <Button onClick={goBack} variant="outline" size="sm" className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants}>
                <Card className="cursor-pointer h-full hover:shadow-lg transition-shadow" onClick={() => { setLeaveType('Congé Payé'); setView('conge_form'); }}>
                  <CardHeader><CardTitle>Congé Payé</CardTitle></CardHeader>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card className="cursor-pointer h-full hover:shadow-lg transition-shadow" onClick={() => { setLeaveType('Congé Non Payé'); setView('conge_form'); }}>
                  <CardHeader><CardTitle>Congé Non Payé</CardTitle></CardHeader>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        );

      case 'permissions_list':
        return (
          <motion.div variants={cardVariants} initial="hidden" animate="visible" className="space-y-4">
            <Button onClick={goBack} variant="outline" size="sm" className="mb-2"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.map(p => (
                <PermissionCard
                  key={p.title}
                  permission={p}
                  isExpanded={expandedPermission === p.title}
                  onExpand={setExpandedPermission}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          </motion.div>
        );

      case 'conge_form':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            <Button onClick={goBack} variant="outline" size="sm" className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
            <Card>
              <CardHeader>
                <CardTitle>Demande pour "{leaveType}"</CardTitle>
                <CardDescription>Pour {selectedEmp?.first_name} {selectedEmp?.last_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Date de début</Label>
                    <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Date de fin</Label>
                    <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => handleSubmit(leaveType!, startDate, endDate)} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Soumission...' : 'Soumettre la demande'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-primary text-primary-foreground">
          <CardTitle className="flex items-center gap-2"><LogOut className="h-5 w-5" /> Demande d'Absence</CardTitle>
          <CardDescription className="text-primary-foreground/80">
            {selectedEmp ? `Connecté en tant que ${selectedEmp.first_name} ${selectedEmp.last_name}` : 'Utilisez ce formulaire pour vos demandes de congés ou permissions.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

interface PermissionCardProps {
  permission: Permission;
  isExpanded: boolean;
  onExpand: (title: string | null) => void;
  onSubmit: (type: string, start: string, end: string) => void;
  isSubmitting: boolean;
}

const PermissionCard: React.FC<PermissionCardProps> = ({ permission, isExpanded, onExpand, onSubmit, isSubmitting }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleToggle = () => onExpand(isExpanded ? null : permission.title);
  // Auto-compute end date when start date changes for a permission
  const handleStartChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value;
    setStartDate(v);
    const m = permission.duration.match(/(\\d+)\\s*jours?/i);
    const days = m ? parseInt(m[1], 10) : 0;
    if (v && days > 0) {
      const autoEnd = addBusinessDaysExclusive(v, days);
      setEndDate(autoEnd);
    }
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSubmit(permission.title, startDate, endDate);
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className={`cursor-pointer transition-all ${isExpanded ? 'shadow-2xl ring-2 ring-primary' : 'hover:shadow-lg'}`} onClick={handleToggle}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <permission.icon className="h-5 w-5 text-primary" /> {permission.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-bold">{permission.duration}</p>
          <p className="text-xs text-muted-foreground mt-1">Justificatif: {permission.justification}</p>
        </CardContent>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-t space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`start-${permission.title}`}>Date de début</Label>
                    <Input id={`start-${permission.title}`} type="date" value={startDate} onChange={handleStartChange} />
                  </div>
                  <div>
                    <Label htmlFor={`end-${permission.title}`}>Date de fin</Label>
                    <Input id={`end-${permission.title}`} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Envoi...' : 'Soumettre la demande'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

