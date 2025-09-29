import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Simple mock entries: Replace with real data fetch later
// Each entry = { date: 'YYYY-MM-DD', in: 'HH:MM', out: 'HH:MM', inSignature?: string, outSignature?: string }
const mockMonthlyEntries = (year: number, month: number) => {
  const days = new Date(year, month + 1, 0).getDate();
  const entries: { date: string; in?: string; out?: string; inSignature?: string; outSignature?: string }[] = [];
  for (let d = 1; d <= days; d++) {
    const weekday = new Date(year, month, d).getDay(); // 0=Sun .. 6=Sat
    const isWeekend = weekday === 0 || weekday === 6;
    if (isWeekend) {
      entries.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    } else {
      // randomize a little for demo
      const late = (d % 5) === 0;
      const early = (d % 7) === 0;
      const inH = late ? 9 : 8;
      const outH = early ? 16 : 17;
      entries.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        in: `${String(inH).padStart(2, '0')}:00`,
        out: `${String(outH).padStart(2, '0')}:00`,
        // Demo signature placeholders; replace with real signature data URLs later
        inSignature: late ? '—' : '✓',
        outSignature: early ? '—' : '✓',
      });
    }
  }
  return entries;
};

function minutesBetween(inTime?: string, outTime?: string) {
  if (!inTime || !outTime) return 0;
  const [ih, im] = inTime.split(":").map(Number);
  const [oh, om] = outTime.split(":").map(Number);
  return (oh * 60 + om) - (ih * 60 + im);
}

function formatHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getMonthOptions(count = 12) {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
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

  const now = new Date();
  const defaultValue = `${params.get('period') ?? `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`}`;
  const [period, setPeriod] = useState(defaultValue);

  const [year, month] = period.split('-').map(Number);
  const monthIndex = (month ?? now.getMonth()+1) - 1;

  const entries = useMemo(() => mockMonthlyEntries(year, monthIndex), [year, monthIndex]);

  const totals = useMemo(() => {
    let monthMins = 0;
    const perDay = entries.map(e => {
      const mins = minutesBetween(e.in, e.out);
      monthMins += mins;
      return { ...e, mins };
    });
    return { perDay, monthMins };
  }, [entries]);

  const handleChangePeriod = (value: string) => {
    setPeriod(value);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('period', value);
      return next;
    }, { replace: true });
  };

  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const generatedAt = new Date().toLocaleString('fr-FR');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6 print:p-2 print:space-y-2">
        <div className="flex items-center justify-between">
          <div className="print:hidden">
            <h1 className="text-2xl font-bold">Fiche de présence mensuelle</h1>
            <p className="text-muted-foreground">
              {userName ? (
                <>
                  {userName}{userPosition ? ` • ${userPosition}` : ""} • {monthLabel}
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
              {userName ? (
                <>
                  {userName}{userPosition ? ` • ${userPosition}` : ""}
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
          <CardHeader className="print:py-2 print:px-2">
            <CardTitle className="print:text-sm">Détails des présences</CardTitle>
          </CardHeader>
          <CardContent className="print:p-2">
            <div className="overflow-x-auto print:overflow-visible">
              <Table className="print:text-[10px] print:leading-tight print:table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-blue-200/100 print:text-[10px]">
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
                  {totals.perDay.map((e) => {
                    const d = new Date(e.date);
                    const weekday = d.getDay(); // 0 Sunday, 6 Saturday
                    if (weekday === 0 || weekday === 6) return null; // hide weekends
                    const jour = d.toLocaleDateString('fr-FR', { weekday: 'long' });
                    const date = d.toLocaleDateString('fr-FR');
                    return (
                      <TableRow key={e.date} className="even:bg-muted/100  print:text-[10px]">
                        <TableCell className="capitalize text-center px-3 py-2 print:px-4 print:py-2">{jour}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{date}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{e.in ?? '-'}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{e.inSignature ?? '-'}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{e.out ?? '-'}</TableCell>
                        <TableCell className="text-center px-3 py-2 print:px-4 print:py-2">{e.outSignature ?? '-'}</TableCell>
                        <TableCell className="text-center font-medium px-3 py-2 print:px-4 print:py-2">{formatHours(e.mins)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="print:text-[10px] bg-amber-100 print:bg-gray-200">
                    <TableCell
                      colSpan={6}
                      className="text-right font-semibold px-3 py-2 print:px-4 print:py-2 border border-amber-300 print:border-gray-400 border-r-0 rounded-l-md print:rounded-none"
                    >
                      Total mensuel
                    </TableCell>
                    <TableCell
                      className="text-right font-bold px-3 py-2 print:px-4 print:py-2 border border-amber-300 print:border-gray-400 border-l-0 rounded-r-md print:rounded-none"
                    >
                      {formatHours(totals.monthMins)}
                    </TableCell>
                  </TableRow>
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
