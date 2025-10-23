import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Inline API calls (no lib/api)
type AttendanceSummary = {
  perDay: Array<{
    date: string;
    in?: string | null;
    out?: string | null;
    inSignature?: string | null;
    outSignature?: string | null;
    onField?: boolean | null;
    mins: number;
    leave?: boolean | null;
    leaveStatus?: string | null;
  }>;
  monthMins: number;
};

type Absence = {
  id: number;
  employe_id?: number;
  date: string; // YYYY-MM-DD
  status?: string | null; // conge | permission | justified | unjustified
  reason?: string | null; // e.g., "Congé Non Payé", "Naissance d'un enfant"
};

async function authFetch(input: RequestInfo, init?: RequestInit) {
  const headers: Record<string, string> = { ...(init?.headers as any) };
  return fetch(input, { credentials: 'include', ...init, headers });
}

async function apiListAbsences(employeId: number, month: string): Promise<Absence[]> {
  // Use month filtering on backend to avoid timezone parsing pitfalls
  const params = new URLSearchParams({ employe_id: String(employeId), month, per_page: '0' });
  const res = await authFetch(`/api/absences?${params.toString()}`);
  if (!res.ok) throw new Error('Chargement absences impossible');
  const json = await res.json();
  return Array.isArray(json) ? json : (json?.data ?? []);
}

async function apiGetEmploye(id: number): Promise<{ first_name: string; last_name: string; position?: string | null; }>{
  const res = await authFetch(`/api/employes/${id}`);
  if (!res.ok) throw new Error('Chargement employé impossible');
  return res.json();
}

async function apiGetAttendanceSummary(employeId: number, monthStr: string): Promise<AttendanceSummary> {
  const qs = new URLSearchParams();
  if (monthStr) qs.set('month', monthStr);
  const url = qs.toString() ? `/api/attendances/summary/${employeId}?${qs.toString()}` : `/api/attendances/summary/${employeId}`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Chargement résumé impossible');
  return res.json();
}

async function apiAdminCheckInOnField(employeId: number, date?: string): Promise<void> {
  const res = await authFetch(`/api/attendances/admin/check-in-on-field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employe_id: employeId, ...(date ? { date } : {}) }),
  });
  if (!res.ok) {
    let msg = 'Marquage sur le terrain impossible';
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    throw new Error(msg);
  }
}

function formatHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getMonthOptions(count = 12) {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  // Start from current month and go forward (ascending)
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

const UserAttendance: React.FC = () => {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const userName: string | undefined = location?.state?.name;
  const userPosition: string | undefined = location?.state?.position;
  const [empName, setEmpName] = React.useState<string | undefined>(userName);
  const [empPosition, setEmpPosition] = React.useState<string | undefined>(userPosition);

  const now = new Date();
  const defaultValue = `${params.get('period') ?? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`}`;
  const [period, setPeriod] = useState(defaultValue);

  const [year, month] = period.split('-').map(Number);
  const monthIndex = (month ?? now.getMonth()+1) - 1;

  const [summary, setSummary] = React.useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [markingField, setMarkingField] = React.useState<boolean>(false);
  const [markError, setMarkError] = React.useState<string | null>(null);
  const [markSuccess, setMarkSuccess] = React.useState<string | null>(null);
  const [absencesMap, setAbsencesMap] = React.useState<Record<string, Absence>>({});

  // Formulaire de création de congé
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [leaveReason, setLeaveReason] = React.useState<string>('');
  const [leaveType, setLeaveType] = React.useState<'maladie' | 'conge' | 'paternite' | 'maternite'>('conge');
  const [creating, setCreating] = React.useState<boolean>(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = React.useState<string | null>(null);

  // Fallback: si on arrive sans state (rafraichissement / lien direct), charger l'employé
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      if (empName && empPosition !== undefined) return; // déjà fournis via state
      try {
        const emp = await apiGetEmploye(Number(id));
        if (!alive) return;
        setEmpName(`${emp.first_name} ${emp.last_name}`);
        setEmpPosition(emp.position ?? '');
      } catch (e) {
        // ignore, on affichera #id
      }
    })();
    return () => { alive = false; };
  }, [id]);

  React.useEffect(() => {
    let alive = true;
    async function run() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        // If selected month is in the future, return empty table
        const today = new Date();
        const selectedMonthStart = new Date(year, monthIndex, 1);
        if (selectedMonthStart > today) {
          if (alive) setSummary({ perDay: [], monthMins: 0 });
          if (alive) setAbsencesMap({});
          return;
        }
        const monthStr = `${year}-${String(monthIndex+1).padStart(2,'0')}`;
        const data = await apiGetAttendanceSummary(Number(id), monthStr);
        if (alive) setSummary(data);
        // Fetch absences for current month and index by date (avoid timezone shifts)
        const abs = await apiListAbsences(Number(id), monthStr);
        if (alive) {
          const map: Record<string, Absence> = {};
          for (const a of abs) {
            const key = String((a as any).date).slice(0, 10); // normalize to YYYY-MM-DD
            map[key] = a; // unique par jour côté backend
          }
          setAbsencesMap(map);
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'Chargement impossible');
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [id, year, monthIndex]);

  async function handleCreateLeave() {
    if (!id) return;
    setCreateError(null);
    setCreateSuccess(null);
    if (!startDate || !endDate) {
      setCreateError('Veuillez sélectionner une date de début et une date de fin');
      return;
    }
    try {
      setCreating(true);
      const res = await authFetch(`/api/absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employe_id: Number(id),
          start_date: startDate,
          end_date: endDate,
          status: leaveType,
          reason: leaveReason || undefined,
        }),
      });
      if (!res.ok) {
        let msg = 'Création du congé impossible';
        try { const j = await res.json(); msg = j?.message || msg; } catch {}
        throw new Error(msg);
      }
      setCreateSuccess('Congé créé avec succès');
      // Rafraîchir le résumé
      const monthStr = `${year}-${String(monthIndex+1).padStart(2,'0')}`;
      const data = await apiGetAttendanceSummary(Number(id), monthStr);
      setSummary(data);
    } catch (e: any) {
      setCreateError(e?.message || 'Erreur inconnue');
    } finally {
      setCreating(false);
    }
  }

  const handleChangePeriod = (value: string) => {
    setPeriod(value);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('period', value);
      return next;
    }, { replace: true });
  };

  const monthLabel = new Date(year, monthIndex, 27).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const generatedAt = new Date().toLocaleString('fr-FR');
  const todayStr = new Date().toISOString().slice(0,10);

  // Compute displayed monthly total: add 8h for permission days, 0h for congés
  const computedTotalMins = useMemo(() => {
    if (!summary) return 0;
    let total = 0;
    for (const e of summary.perDay) {
      const dateKey = String(e.date).slice(0, 10);
      const [yStr, mStr, dStr] = dateKey.split('-');
      const y = Number(yStr);
      const mIdx = Math.max(1, Number(mStr || '1')) - 1;
      const dayNum = Math.max(1, Number(dStr || '1'));
      const d = new Date(y, mIdx, dayNum);
      const weekday = d.getDay();
      if (weekday === 0 || weekday === 6) continue; // skip weekends like the table
      const abs = absencesMap[dateKey];
      if (abs) {
        const status = (abs.status || '').toLowerCase();
        if (status === 'permission') total += 8 * 60; // 8h
        else total += 0; // congé or others -> 0h
      } else {
        total += e.mins;
      }
    }
    return total;
  }, [summary, absencesMap]);

  return (
    <div className="min-h-screen bg-background container mx-auto">
      <div className="container mx-auto p-6 space-y-6 print:p-2 print:space-y-2 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
        <div className="flex items-center justify-between">
          <div className="print:hidden">
            <h1 className="text-2xl font-bold">Fiche de présence mensuelle</h1>
            <p className="text-muted-foreground">
              {empName ? (
                <>
                  {empName}{empPosition ? ` • ${empPosition}` : ""} • {monthLabel}
                </>
              ) : (
                <>
                  #{id} • {monthLabel}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => navigate(-1)}>Retour</Button>
            <Select value={period} onValueChange={handleChangePeriod}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions(18).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="default"
              onClick={async () => {
                if (!id) return;
                setMarkError(null);
                setMarkSuccess(null);
                try {
                  setMarkingField(true);
                  await apiAdminCheckInOnField(Number(id), todayStr);
                  setMarkSuccess("Arrivée marquée 'Sur le terrain' pour aujourd'hui");
                  const monthStr = `${year}-${String(monthIndex+1).padStart(2,'0')}`;
                  const data = await apiGetAttendanceSummary(Number(id), monthStr);
                  setSummary(data);
                } catch (e: any) {
                  setMarkError(e?.message || 'Erreur inconnue');
                } finally {
                  setMarkingField(false);
                }
              }}
              disabled={markingField}
            >
              {markingField ? 'Marquage…' : "Marquer Sur le terrain"}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>Imprimer</Button>
          </div>
        </div>


        {/* Print-only header */}
        <div className="hidden print:block">
          <div className="text-center border-b pb-4 mb-1">
            <div className="text-xl font-extrabold tracking-wide">FICHE DE PRÉSENCE MENSUELLE</div>
            <div className="mt-2 font-medium">
              {empName ? (
                <>
                  {monthLabel} {empName}{empPosition ? ` • ${empPosition}` : ""}
                </>
              ) : (
                <>
                  Utilisateur #{id}
                </>
              )}
            </div>
          </div>
        </div>

        <Card className="print:border-0 print:shadow-none"> 
          <CardContent className="print:p-2 mt-2">
            {(markError || markSuccess) && (
              <div className="mb-3 text-sm">
                {markError && <div className="text-destructive">{markError}</div>}
                {markSuccess && <div className="text-green-600">{markSuccess}</div>}
              </div>
            )}
            <div className="overflow-x-auto print:overflow-visible">
              <Table className="print:text-[12px] print:leading-tight print:table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-blue-100/100 print:bg-blue-200 print:text-[10px]">
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Jour</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Date</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Heure d'arrivée</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Signature Arrivée</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Heure de départ</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Signature Départ</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Chargement…</TableCell>
                    </TableRow>
                  )}
                  {error && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-destructive">{error}</TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && summary && summary.perDay.map((e) => {
                    // Use the raw string date (YYYY-MM-DD...) to build a local date without timezone shift
                    const dateKey = String(e.date).slice(0, 10); // YYYY-MM-DD
                    const [yStr, mStr, dStr] = dateKey.split('-');
                    const y = Number(yStr);
                    const mIdx = Math.max(1, Number(mStr || '1')) - 1; // 0-11
                    const dayNum = Math.max(1, Number(dStr || '1'));
                    const d = new Date(y, mIdx, dayNum);
                    const weekday = d.getDay(); // 0 Sunday, 6 Saturday
                    if (weekday === 0 || weekday === 6) return null;
                    const abs = absencesMap[dateKey];
                    const jour = d.toLocaleDateString('fr-FR', { weekday: 'long' });
                    const date = d.toLocaleDateString('fr-FR');
                    // Mark leave strictly based on database absences
                    const isLeave = !!absencesMap[dateKey];
                    const statusCap = absencesMap[dateKey]?.status ? (absencesMap[dateKey]!.status!.charAt(0).toUpperCase() + absencesMap[dateKey]!.status!.slice(1)) : null;
                    const leaveLabel = absencesMap[dateKey]
                      ? [statusCap, absencesMap[dateKey]!.reason || null].filter(Boolean).join(' — ')
                      : '-';
                    const rowMins = abs
                      ? (((abs.status || '').toLowerCase() === 'permission') ? (8 * 60) : 0)
                      : e.mins;
                    return (
                      <TableRow key={e.date} className={`print:text-[10px] ${isLeave ? 'bg-yellow-50 print:bg-yellow-100' : 'even:bg-muted/100 print:even:bg-gray-100'}`}>
                        <TableCell className="capitalize text-center px-3 py-2 print:px-4 print:py-2">{jour}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{date}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">
                          {isLeave
                            ? leaveLabel
                            : (
                              e.in ? (
                                <span>
                                  {e.in}
                                  {e.onField ? ' Sur le terrain' : ''}
                                </span>
                              ) : '-'
                            )}
                        </TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-0 print:py-0">
                          {!isLeave && e.inSignature && typeof e.inSignature === 'string' && (
                            e.inSignature.startsWith('data:image') ||
                            e.inSignature.startsWith('/storage/') ||
                            e.inSignature.startsWith('http://') ||
                            e.inSignature.startsWith('https://')
                          ) ? (
                            <img src={e.inSignature} alt="Signature arrivée" className="inline-block h-6 w-auto print:h-4" />
                          ) : (
                            isLeave ? '—' : (e.inSignature ? '✓' : '-')
                          )}
                        </TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{isLeave ? leaveLabel : (e.out ?? '-')}</TableCell>
                        <TableCell className="text-center px-2 py-2 print:px-0 print:py-0">
                          {!isLeave && e.outSignature && typeof e.outSignature === 'string' && (
                            e.outSignature.startsWith('data:image') ||
                            e.outSignature.startsWith('/storage/') ||
                            e.outSignature.startsWith('http://') ||
                            e.outSignature.startsWith('https://')
                          ) ? (
                            <img src={e.outSignature} alt="Signature départ" className="inline-block h-6 w-auto print:h-6" />
                          ) : (
                            isLeave ? '—' : (e.outSignature ? '✓' : '-')
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium px-3 py-2 print:px-4 print:py-2">{formatHours(rowMins)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {summary && summary.perDay.length > 0 && (
                    <TableRow className="print:text-[12px] bg-red-200 print:bg-red-200">
                      <TableCell
                        colSpan={6}
                        className="text-right font-semibold px-3 py-2 print:px-4 print:py-2 border border-red-300 print:border-red-300"
                      >
                        Total mensuel
                      </TableCell>
                      <TableCell
                        className="text-center font-bold px-3 py-2 print:px-4 print:py-2 border border-red-300 print:border-red-300"
                      >
                        {formatHours(computedTotalMins)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserAttendance;
