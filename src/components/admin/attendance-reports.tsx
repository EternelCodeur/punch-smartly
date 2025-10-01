import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AttendanceCalendar } from '@/components/ui/attendance-calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Download, FileText, Filter, Search, Grid, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listTemporaryDepartures, listEntreprises, type Entreprise } from '@/lib/api';

// Backend base URL for assets like /storage/*. Set VITE_BACKEND_BASE in .env (e.g. http://127.0.0.1:8000)
const BACKEND_BASE = (import.meta as any)?.env?.VITE_BACKEND_BASE || (typeof window !== 'undefined' ? window.location.origin : '');

// Row model for the departures table (derived from TemporaryDeparture)
type Row = {
  id: number;
  date: string; // YYYY-MM-DD
  employeeName: string;
  departure_time?: string | null;
  return_time?: string | null;
  reason?: string | null;
  signatureUrl?: string | null; // prefer file url if available
};

export const AttendanceReports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>('all');
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Load entreprises for filter
  useEffect(() => {
    (async () => {
      try { setEntreprises(await listEntreprises()); } catch {}
    })();
  }, []);

  // Fetch departures when filters change
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const today = new Date();
        const monthStart = new Date(selectedMonth + '-01');
        if (monthStart > today) { if (alive) setRows([]); return; }
        const entId = selectedEntreprise !== 'all' ? Number(selectedEntreprise) : undefined;
        const data = await listTemporaryDepartures(selectedMonth, undefined, entId);
        const mapped: Row[] = (data || []).map((d: any) => ({
          id: d.id,
          date: d.date,
          employeeName: d.employe ? `${d.employe.first_name} ${d.employe.last_name}` : `#${d.employe_id}`,
          departure_time: d.departure_time ?? null,
          return_time: d.return_time ?? null,
          reason: d.reason ?? null,
          signatureUrl: d.return_signature_file_url || d.return_signature || null,
        }));
        if (alive) setRows(mapped);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Chargement impossible');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedMonth, selectedEntreprise]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r => r.employeeName.toLowerCase().includes(term) || (r.reason || '').toLowerCase().includes(term));
  }, [rows, searchTerm]);

  const handleExport = () => {
    const format = exportFormat === 'pdf' ? 'PDF' : 'CSV';
    toast({
      title: `Export ${format} lancé`,
      description: `Le rapport sera téléchargé dans quelques instants.`,
    });

    // TODO: Implement actual export functionality
    console.log('Exporting data:', {
      format: exportFormat,
      month: selectedMonth,
      entreprise: selectedEntreprise,
      records: filteredRows,
    });
  };

  // Generate calendar data for selected user (kept mock for now)
  const generateCalendarData = (month: string, userName: string) => {
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    const days: any[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        days.push({ date: new Date(d), status: 'weekend' as const });
        continue;
      }
      const isPresent = Math.random() > 0.2;
      days.push({
        date: new Date(d),
        status: isPresent ? 'present' as const : 'absent' as const,
        arrivalTime: isPresent ? '08:' + String(Math.floor(Math.random() * 60)).padStart(2, '0') : undefined,
        departureTime: isPresent ? '17:' + String(Math.floor(Math.random() * 60)).padStart(2, '0') : undefined,
        hoursWorked: isPresent ? 7.5 + Math.random() * 1 : undefined,
        breaks: isPresent ? [{ start: '12:00', end: '13:00', reason: 'Pause déjeuner' }] : undefined,
      });
    }
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et Exports
          </CardTitle>
          <CardDescription>
            Filtrez les données par mois et entreprise, puis exportez les rapports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <Label htmlFor="month">Mois</Label>
              <Input id="month" type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="entreprise">Entreprise</Label>
              <Select value={selectedEntreprise} onValueChange={setSelectedEntreprise}>
                <SelectTrigger id="entreprise"><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {entreprises.map(ent => (
                    <SelectItem key={ent.id} value={String(ent.id)}>{ent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end lg:ml-40">
              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content based on view mode */}
      {viewMode === 'table' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Fiche de sortie
            </CardTitle>
            <CardDescription>
              Consultez les fiches des sorties pour la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Sortie</TableHead>
                    <TableHead>Retour</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Signature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employeeName}</TableCell>
                      <TableCell>{new Date(r.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{r.departure_time || '-'}</TableCell>
                      <TableCell>{r.return_time || '-'}</TableCell>
                      <TableCell>{r.reason || '-'}</TableCell>
                      <TableCell>
                        {(() => {
                          let url = r.signatureUrl || '';
                          if (!url) return '-';
                          // Normalize url
                          // 1) Direct data URL or absolute http(s)
                          if (url.startsWith('data:image')) {
                            // ok
                          } else if (url.startsWith('http://') || url.startsWith('https://')) {
                            // ok
                          } else if (url.startsWith('/storage/')) {
                            url = `${BACKEND_BASE}${url}`;
                          } else if (url.startsWith('/')) {
                            url = `${BACKEND_BASE}${url}`;
                          } else if (url.startsWith('storage/')) {
                            url = `${BACKEND_BASE}/${url}`;
                          } else {
                            // 2) Try base64-like (even if short)
                            const base64Like = /^[A-Za-z0-9+/=]+$/.test(url);
                            if (base64Like) {
                              url = `data:image/png;base64,${url}`;
                            } else {
                              // Unknown format -> show checkmark
                              return '✓';
                            }
                          }
                          return (
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="Signature" className="h-6 w-auto inline-block" />
                            </a>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {(!loading && !error && filteredRows.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun enregistrement trouvé pour cette période</p>
              </div>
            )}
            {loading && (
              <div className="text-center py-8 text-muted-foreground">Chargement…</div>
            )}
            {error && (
              <div className="text-center py-8 text-destructive">{error}</div>
            )}
          </CardContent>
        </Card>
      ) : (
        <AttendanceCalendar
          attendanceData={[]}
          month={new Date(selectedMonth + '-01')}
          userName={selectedUser === 'all' ? 'Tous les employés' : 'Utilisateur'}
        />
      )}
    </div>
  );
};

