import React, { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from './user-management';
import { AttendanceReports } from './attendance-reports';
import { Users, Calendar, Download, Settings, CheckCircle, XCircle, Clock } from 'lucide-react';
import { listEmployes, listEntreprises, getTodayCounts, type TodayCounts, type Employe, type Entreprise } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AbsencesList } from './absences-list';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [emps, setEmps] = useState<Employe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [filterEntrepriseId, setFilterEntrepriseId] = useState<string>('all');
  const [counts, setCounts] = useState<TodayCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [presentDialogOpen, setPresentDialogOpen] = useState(false);
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [leftDialogOpen, setLeftDialogOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [firstLoadCounts, setFirstLoadCounts] = useState(true);
  const [firstLoadEmps, setFirstLoadEmps] = useState(true);

  // Silent auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Date/heure locales d'affichage
  const currentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // YYYY-MM-DD pour aujourd'hui
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [refreshTick]);

  // Charger les compteurs du jour côté backend (indépendants du total)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (firstLoadCounts) setCountsLoading(true);
        setCountsError(null);
        const id = filterEntrepriseId !== 'all' ? Number(filterEntrepriseId) : undefined;
        const c = await getTodayCounts(id, true);
        if (alive) setCounts(c);
      } catch (e: any) {
        if (alive) setCountsError(e?.message || 'Erreur des compteurs');
      } finally {
        if (alive && firstLoadCounts) setCountsLoading(false);
        if (alive && firstLoadCounts) setFirstLoadCounts(false);
      }
    })();
    return () => { alive = false; };
  }, [filterEntrepriseId, refreshTick, firstLoadCounts]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (firstLoadEmps) setLoading(true);
      setError(null);
      try {
        const data = await listEmployes();
        if (mounted) setEmps(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (mounted && firstLoadEmps) setLoading(false);
        if (mounted && firstLoadEmps) setFirstLoadEmps(false);
      }
    })();
    return () => { mounted = false; };
  }, [refreshTick, firstLoadEmps]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ents = await listEntreprises();
        if (mounted) setEntreprises(ents);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredEmps = useMemo(() => {
    if (filterEntrepriseId === 'all') return emps;
    const idNum = Number(filterEntrepriseId);
    return emps.filter(e => e.entreprise_id === idNum);
  }, [emps, filterEntrepriseId]);

  const totalEmployees = filteredEmps.length;

  // Employés présents aujourd'hui (arrivés et pas encore partis)
  const presentEmployees = useMemo(() => {
    return filteredEmps.filter(e => {
      const isToday = e.attendance_date === todayStr;
      const arrived = !!e.arrival_signed;
      const notLeft = !e.departure_signed;
      return isToday && arrived && notLeft;
    });
  }, [filteredEmps, todayStr]);

  // Employés déjà partis aujourd'hui (check-out fait aujourd'hui)
  const leftEmployees = useMemo(() => {
    return filteredEmps.filter(e => {
      const isToday = e.attendance_date === todayStr;
      return isToday && !!e.departure_signed;
    });
  }, [filteredEmps, todayStr]);

  // Employés absents aujourd'hui (aucun check-in aujourd'hui)
  const absentEmployees = useMemo(() => {
    return filteredEmps.filter(e => {
      const isToday = e.attendance_date === todayStr;
      const arrived = !!e.arrival_signed;
      return !(isToday && arrived);
    });
  }, [filteredEmps, todayStr]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">Tableau de Bord Administrateur</h1>
        <p className="text-primary-foreground/80">
          Gérez les Employées, consultez les rapports et exportez les données
        </p>
        <p className="text-sm text-primary-foreground/60 mt-2">
          {currentDate} • {currentTime}
        </p>
        {loading ? (
          <p className="text-center text-muted-foreground">Chargement...</p>
        ) : error ? (
          <p className="text-center text-destructive">{error}</p>
        ) : null}
      </div>

      {/* Dialog: Liste des présents aujourd'hui */}
      <Dialog open={presentDialogOpen} onOpenChange={setPresentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Employés présents aujourd'hui</DialogTitle>
            <DialogDescription>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {presentEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucun employé présent pour le moment.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border">
                {presentEmployees.map(emp => (
                  <li key={emp.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                      {emp.position ? (
                        <p className="text-sm text-muted-foreground">{emp.position}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-success">Présent</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Liste des absents aujourd'hui */}
      <Dialog open={absentDialogOpen} onOpenChange={setAbsentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Employés absents aujourd'hui</DialogTitle>
            <DialogDescription>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {absentEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucun employé absent pour le moment.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border">
                {absentEmployees.map(emp => (
                  <li key={emp.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                      {emp.position ? (
                        <p className="text-sm text-muted-foreground">{emp.position}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-destructive">Absent</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Liste des employés déjà partis aujourd'hui */}
      <Dialog open={leftDialogOpen} onOpenChange={setLeftDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Employés déjà partis</DialogTitle>
            <DialogDescription>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {leftEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucun employé n'a encore quitté aujourd'hui.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border">
                {leftEmployees.map(emp => (
                  <li key={emp.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{emp.first_name} {emp.last_name}</p>
                      {emp.position ? (
                        <p className="text-sm text-muted-foreground">{emp.position}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-blue-700">Parti</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total employés</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>
          <Card
              className="pb-2 cursor-pointer hover:bg-accent/30 rounded-md"
              onClick={() => setPresentDialogOpen(true)}
              title="Voir la liste des présents aujourd'hui"
              >
            <CardHeader
              className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer hover:bg-accent/30 rounded-md"
            >
              <CardTitle className="text-sm font-medium">Présents aujourd'hui</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {countsLoading ? (
                <p className="text-center text-muted">Chargement...</p>
              ) : countsError ? (
                <p className="text-center text-destructive">{countsError}</p>
              ) : (
                <div className="text-2xl font-bold text-success">{counts?.presentToday ?? 0}</div>
              )}
            </CardContent>
          </Card>
          <Card
              className="pb-2 cursor-pointer hover:bg-accent/30 rounded-md"
              onClick={() => setAbsentDialogOpen(true)}
              title="Voir la liste des absents aujourd'hui"
              >
            <CardHeader
              className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer hover:bg-accent/30 rounded-md"
            >
              <CardTitle className="text-sm font-medium">Absents aujourd'hui</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {countsLoading ? (
                <p className="text-center text-muted">Chargement...</p>
              ) : countsError ? (
                <p className="text-center text-destructive">{countsError}</p>
              ) : (
                <div className="text-2xl font-bold text-destructive">{counts?.absentToday ?? 0}</div>
              )}
            </CardContent>
          </Card>
          <Card
              className="pb-2 cursor-pointer hover:bg-accent/30 rounded-md"
              onClick={() => setLeftDialogOpen(true)}
              title="Voir la liste des employés déjà partis"
              >
            <CardHeader
              className="flex flex-row items-center justify-between space-y-0 pb-2 cursor-pointer hover:bg-accent/30 rounded-md"
            >
              <CardTitle className="text-sm font-medium">Déjà partie</CardTitle>
              <XCircle className="h-4 w-4 text-blue-700" />
            </CardHeader>
            <CardContent>
              {countsLoading ? (
                <p className="text-center text-muted">Chargement...</p>
              ) : countsError ? (
                <p className="text-center text-blue-700">{countsError}</p>
              ) : (
                <div className="text-2xl font-bold text-blue-700">{counts?.leftToday ?? 0}</div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-64">
          <Select value={filterEntrepriseId} onValueChange={setFilterEntrepriseId}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par entreprise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les entreprises</SelectItem>
              {entreprises.map(ent => (
                <SelectItem key={ent.id} value={String(ent.id)}>{ent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestion des Employées
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Gestion des sorties
          </TabsTrigger>
          <TabsTrigger value="conges" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Gestion des congés & permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserManagement entrepriseFilterId={filterEntrepriseId} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AttendanceReports />
        </TabsContent>

        <TabsContent value="conges" className="space-y-6">
          <AbsencesList />
        </TabsContent>
      </Tabs>
    </div>
  );
};