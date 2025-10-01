import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AttendanceTab } from '@/components/time-tracking/attendance-tab';
import { DepartureListTab } from '@/components/time-tracking/departure-list-tab';
import { Clock, Users, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEmployes } from '@/hooks/use-employes';
import { listAttendances, Attendance } from '@/lib/api';
import { REFRESH_MS } from '@/lib/config';
import { DepartureTab } from '@/components/time-tracking/departure-tab';

const Pointage: React.FC = () => {
  const { logout, user } = useAuth();

  const { data: emps, loading, error } = useEmployes();
  const users = (emps || []).map(e => ({
    id: String(e.id),
    firstName: e.first_name,
    lastName: e.last_name,
    position: e.position || '',
  }));

  // Fetch today's attendances
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [attLoading, setAttLoading] = useState<boolean>(false);
  const [attError, setAttError] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }, []);

  const reloadAttendances = useCallback(() => {
    let alive = true;
    setAttLoading(true);
    listAttendances({ from: todayStr, to: todayStr, per_page: 0 })
      .then((rows) => { if (alive) { setAttendances(rows); setAttError(null); } })
      .catch((e) => { if (alive) setAttError(e?.message || 'Erreur de chargement des pointages'); })
      .finally(() => { if (alive) setAttLoading(false); });
    return () => { alive = false; };
  }, [todayStr]);

  useEffect(() => {
    const cancel = reloadAttendances();
    return cancel;
  }, [reloadAttendances]);

  // Auto-refresh attendances at interval
  useEffect(() => {
    const id = setInterval(() => {
      reloadAttendances();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [reloadAttendances]);

  const checkedInIds = useMemo(() => new Set(attendances.filter(a => !!a.check_in_at).map(a => String(a.employe_id))), [attendances]);
  const checkedOutIds = useMemo(() => new Set(attendances.filter(a => !!a.check_out_at).map(a => String(a.employe_id))), [attendances]);

  // Prefer backend flags on employes; fallback to attendance sets
  const arrivalUsers = useMemo(() => {
    const empMap = new Map((emps || []).map(e => [String(e.id), e]));
    return users.filter(u => {
      const e = empMap.get(u.id);
      if (e && e.attendance_date === todayStr) {
        return !e.arrival_signed; // show only those without arrival signed today
      }
      return !checkedInIds.has(u.id);
    });
  }, [users, emps, checkedInIds, todayStr]);

  const departureUsers = useMemo(() => {
    const empMap = new Map((emps || []).map(e => [String(e.id), e]));
    return users.filter(u => {
      const e = empMap.get(u.id);
      if (e && e.attendance_date === todayStr) {
        return !!e.arrival_signed && !e.departure_signed; // ready for departure, not yet signed
      }
      return checkedInIds.has(u.id) && !checkedOutIds.has(u.id);
    });
  }, [users, emps, checkedInIds, checkedOutIds, todayStr]);

  const waitingDepartureCount = useMemo(() => {
    return (emps || []).filter(e => e.attendance_date === todayStr && e.arrival_signed && !e.departure_signed).length;
  }, [emps, todayStr]);

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
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="attendance" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Fiche d'Arrivée
                </TabsTrigger>
                <TabsTrigger value="departure" className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Fiche de Départ
                  {waitingDepartureCount > 0 && (
                    <span className="ml-2 text-xs
                    mr-2 rounded-full bg-primary/10 text-primary px-2 py-0.5">
                      {waitingDepartureCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="waiting" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Fiche de Sortie
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="attendance">
              {(loading || attLoading) && <div className="p-4 text-center text-muted-foreground">Chargement des données...</div>}
              {(error || attError) && <div className="p-4 text-center text-destructive">{error || attError}</div>}
              {!loading && !error && !attLoading && !attError && (
                <AttendanceTab users={arrivalUsers} onUpdated={() => { reloadAttendances(); }} />
              )}
            </TabsContent>

            <TabsContent value="departure">
              {(loading || attLoading) && <div className="p-4 text-center text-muted-foreground">Chargement des données...</div>}
              {(error || attError) && <div className="p-4 text-center text-destructive">{error || attError}</div>}
              {!loading && !error && !attLoading && !attError && (
                <DepartureListTab users={departureUsers} onUpdated={() => { reloadAttendances(); }} />
              )}
            </TabsContent>

            <TabsContent value="waiting">
              {(loading || attLoading) && <div className="p-4 text-center text-muted-foreground">Chargement des données...</div>}
              {(error || attError) && <div className="p-4 text-center text-destructive">{error || attError}</div>}
              {!loading && !error && !attLoading && !attError && (
                <DepartureTab users={departureUsers} onUpdated={() => { reloadAttendances(); }} />
              )}
            </TabsContent>
          </Tabs>

          {/*<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
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
                    <span className="font-medium">08:00 - 10:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sorties :</span>
                    <span className="font-medium">À partir de 10:00</span>
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
          </div>*/}
        </div>
      </div>
    </div>
  );
};

export default Pointage;
