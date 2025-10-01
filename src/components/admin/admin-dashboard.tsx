import React, { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from './user-management';
import { AttendanceReports } from './attendance-reports';
import { Users, Calendar, Download, Settings, CheckCircle, XCircle, Clock } from 'lucide-react';
import { listEmployes, listEntreprises, getTodayCounts, type TodayCounts, type Employe, type Entreprise } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  }, []);

  // Charger les compteurs du jour côté backend (indépendants du total)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCountsLoading(true);
        setCountsError(null);
        const id = filterEntrepriseId !== 'all' ? Number(filterEntrepriseId) : undefined;
        const c = await getTodayCounts(id, true);
        if (alive) setCounts(c);
      } catch (e: any) {
        if (alive) setCountsError(e?.message || 'Erreur des compteurs');
      } finally {
        if (alive) setCountsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [filterEntrepriseId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listEmployes();
        if (mounted) setEmps(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestion des Employées
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Gestion des sorties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserManagement entrepriseFilterId={filterEntrepriseId} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AttendanceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};