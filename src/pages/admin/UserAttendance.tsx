import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAttendanceSummary, getEmploye, type Employe, type AttendanceSummary } from "@/lib/api";

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

  // Fallback: si on arrive sans state (rafraichissement / lien direct), charger l'employé
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      if (empName && empPosition !== undefined) return; // déjà fournis via state
      try {
        const emp = await getEmploye(Number(id));
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
          return;
        }
        const monthStr = `${year}-${String(monthIndex+1).padStart(2,'0')}`;
        const data = await getAttendanceSummary(Number(id), monthStr);
        if (alive) setSummary(data);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Chargement impossible');
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [id, year, monthIndex]);

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
            <Button variant="outline" onClick={() => window.print()}>Imprimer</Button>
          </div>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block">
          <div className="text-center border-b pb-4 mb-6">
            <div className="text-xl font-extrabold tracking-wide">FICHE DE PRÉSENCE MENSUELLE</div>
            <div className="mt-1 text-sm text-muted-foreground">{monthLabel}</div>
            <div className="mt-2 font-medium">
              {empName ? (
                <>
                  {empName}{empPosition ? ` • ${empPosition}` : ""}
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
          <CardContent className="print:p-2 mt-6">
            <div className="overflow-x-auto print:overflow-visible">
              <Table className="print:text-[12px] print:leading-tight print:table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-blue-100/100 print:bg-blue-200 print:text-[10px]">
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Jour</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Date</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Heure d'arrivée</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Signture Arrivée</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Heure de départ</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-3 py-2 print:px-1 print:py-0.5">Signture Départ</TableHead>
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
                    const d = new Date(e.date);
                    const weekday = d.getDay(); // 0 Sunday, 6 Saturday
                    // Hide weekends only if there is no attendance data for that day
                    const hasData = !!(e.in || e.out || e.inSignature || e.outSignature);
                    if ((weekday === 0 || weekday === 6) && !hasData) return null;
                    const jour = d.toLocaleDateString('fr-FR', { weekday: 'long' });
                    const date = d.toLocaleDateString('fr-FR');
                    return (
                      <TableRow key={e.date} className="even:bg-muted/100 print:even:bg-gray-100 print:text-[10px]">
                        <TableCell className="capitalize text-center px-3 py-2 print:px-4 print:py-2">{jour}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{date}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{e.in ?? '-'}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">
                          {e.inSignature && typeof e.inSignature === 'string' && (
                            e.inSignature.startsWith('data:image') ||
                            e.inSignature.startsWith('/storage/') ||
                            e.inSignature.startsWith('http://') ||
                            e.inSignature.startsWith('https://')
                          ) ? (
                            <img src={e.inSignature} alt="Signature arrivée" className="inline-block h-6 w-auto print:h-5" />
                          ) : (
                            e.inSignature ? '✓' : '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{e.out ?? '-'}</TableCell>
                        <TableCell className="text-center px-2 py-2 print:px-2 print:py-2">
                          {e.outSignature && typeof e.outSignature === 'string' && (
                            e.outSignature.startsWith('data:image') ||
                            e.outSignature.startsWith('/storage/') ||
                            e.outSignature.startsWith('http://') ||
                            e.outSignature.startsWith('https://')
                          ) ? (
                            <img src={e.outSignature} alt="Signature départ" className="inline-block h-6 w-auto print:h-5" />
                          ) : (
                            e.outSignature ? '✓' : '-'
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium px-3 py-2 print:px-4 print:py-2">{formatHours(e.mins)}</TableCell>
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
                        {formatHours(summary?.monthMins || 0)}
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
