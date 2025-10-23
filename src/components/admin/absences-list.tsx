import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Briefcase } from 'lucide-react';
import { listAbsences, listEmployes, type Absence, type Employe } from '@/lib/api';
import { Button } from '@/components/ui/button';

export const AbsencesList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [firstLoad, setFirstLoad] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  // Local filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'conge' | 'permission' | 'justified' | 'unjustified'>('all');
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [monthFilter, setMonthFilter] = useState(''); // YYYY-MM

  // Silent auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [a, e] = await Promise.all([
          listAbsences({ per_page: 0 }),
          listEmployes(),
        ]);
        if (!alive) return;
        setAbsences(a);
        setEmployes(e);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || 'Erreur de chargement');
      } finally {
        if (alive) setLoading(false);
        if (alive && firstLoad) setFirstLoad(false);
      }
    })();
    return () => { alive = false; };
  }, [refreshTick]);

  const empById = useMemo(() => {
    const m = new Map<number, Employe>();
    for (const e of employes) m.set(e.id, e);
    return m;
  }, [employes]);

  // Step 1: list of employees who have at least one request matching filters
  const employeesWithRequests = useMemo(() => {
    // apply type + month filters first
    const typed = absences.filter(a => (typeFilter === 'all' ? true : (a.status || '') === typeFilter))
      .filter(a => monthFilter ? (a.date || '').startsWith(monthFilter) : true);
    const byEmp = new Map<number, { count: number; lastDate: string }>();
    for (const a of typed) {
      const entry = byEmp.get(a.employe_id) || { count: 0, lastDate: '' };
      entry.count += 1;
      if (!entry.lastDate || (a.date || '') > entry.lastDate) entry.lastDate = a.date || '';
      byEmp.set(a.employe_id, entry);
    }
    let rows = Array.from(byEmp.entries()).map(([id, info]) => ({ empId: id, ...info }));
    // search by employee name
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => {
        const emp = empById.get(r.empId);
        const full = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : '';
        return full.includes(q);
      });
    }
    // sort by last request date desc
    rows.sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));
    return rows;
  }, [absences, typeFilter, monthFilter, search, empById]);

  // Step 2: absences for the selected employee
  const selectedEmp = selectedEmpId ? empById.get(selectedEmpId) || null : null;
  const selectedEmpAbsences = useMemo(() => {
    if (!selectedEmpId) return [] as Absence[];
    return absences
      .filter(a => a.employe_id === selectedEmpId)
      .filter(a => (typeFilter === 'all' ? true : (a.status || '') === typeFilter))
      .filter(a => monthFilter ? (a.date || '').startsWith(monthFilter) : true)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [absences, selectedEmpId, typeFilter, monthFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="bg-gradient-primary text-primary-foreground">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {selectedEmp ? `Demandes de ${selectedEmp.first_name} ${selectedEmp.last_name}` : 'Congés & Permissions'}
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            {selectedEmp ? 'Liste des congés et permissions de cet employé.' : 'Liste des personnes ayant fait une demande.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {selectedEmp ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1" />
              <div className="w-full sm:w-60">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="conge">Congé</SelectItem>
                    <SelectItem value="permission">Permission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-56">
                <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-[220px]">
                <Input
                  placeholder="Rechercher par nom..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-60">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="conge">Congé</SelectItem>
                    <SelectItem value="permission">Permission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-56">
                <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
              </div>
            </div>
          )}

          {firstLoad && loading ? (
            <p className="text-center text-muted-foreground">Chargement...</p>
          ) : error ? (
            <p className="text-center text-destructive">{error}</p>
          ) : selectedEmp ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setSelectedEmpId(null)}>Retour</Button>
              </div>
              {selectedEmpAbsences.length === 0 ? (
                <p className="text-center text-muted-foreground">Aucune demande pour cet employé.</p>
              ) : (
                <ul className="divide-y divide-border rounded-md border">
                  {selectedEmpAbsences.map((a) => {
                    const status = (a.status || '').toLowerCase();
                    const statusBadge = status === 'permission' ? 'bg-amber-100 text-amber-800' : status === 'conge' ? 'bg-blue-100 text-blue-800' : 'bg-muted text-foreground';
                    return (
                      <li key={`${a.id}`} className="p-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{a.reason || '—'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs rounded ${statusBadge}`}>{a.status || '—'}</span>
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{a.date}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : employeesWithRequests.length === 0 ? (
            <p className="text-center text-muted-foreground">Aucun employé avec des demandes.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border">
              {employeesWithRequests.map((row) => {
                const emp = empById.get(row.empId);
                const fullName = emp ? `${emp.first_name} ${emp.last_name}` : `Employé #${row.empId}`;
                return (
                  <li key={row.empId} className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/40" onClick={() => setSelectedEmpId(row.empId)}>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{fullName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{row.count} demande(s)</p>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Dernière: {row.lastDate || '—'}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
