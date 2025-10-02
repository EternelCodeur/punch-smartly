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
  // Raw fields from backend to better resolve image source
  return_signature?: string | null;
  return_signature_file_url?: string | null;
  // Kept for backward compatibility; may be removed later
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

  // Normalize signature URL into a displayable image URL.
  // Handles: data URLs, http(s), blob:, relative /storage or storage/, base64-like strings (URL-safe too), trims whitespace.
  const resolveSignatureUrl = (raw: any): string | null => {
    if (raw === null || raw === undefined) return null;
    let s = String(raw).trim();
    if (!s) return null;
    // Already a data URL (any mime) or blob
    if (s.startsWith('data:image') || s.startsWith('data:')) return s;
    if (s.startsWith('blob:')) return s;
    // Absolute http(s)
    if (/^https?:\/\//i.test(s)) return s;
    // Relative paths
    if (s.startsWith('/storage/') || s.startsWith('/uploads/') || s.startsWith('/')) return `${BACKEND_BASE}${s}`;
    if (/^(storage|uploads)\//.test(s)) return `${BACKEND_BASE}/${s}`;
    // Base64-like (allow URL-safe -_). Strip whitespace and prefix
    const compact = s.replace(/\s+/g, '');
    const base64Like = /^[A-Za-z0-9+\/=_-]+$/.test(compact);
    if (base64Like && compact.length > 40) {
      return `data:image/png;base64,${compact}`;
    }
    return null; // Unknown format
  };

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
          return_signature: d.return_signature ?? null,
          return_signature_file_url: d.return_signature_file_url ?? null,
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
    // Print the current table with custom styles (header bg blue, striped rows)
    const title = 'Fiche de sortie';
    const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    const entrepriseLabel = selectedEntreprise !== 'all' ? ` — ${entreprises.find(e => e.id === Number(selectedEntreprise))?.name}` : '';

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${monthLabel}</title>
  <style>
    body{font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; padding:24px; color:#0f172a;}
    h1{font-size:18px; margin:0 0 16px;}
    table{width:100%; border-collapse: collapse;}
    th, td{border:1px solid #e2e8f0; padding:8px; font-size:12px; text-align:left;}
    thead tr{background:#dbeafe;} /* Tailwind bg-blue-100 */
    tbody tr:nth-child(odd){background:#f8fafc;} /* slate-50 */
    tbody tr:nth-child(even){background:#ffffff;}
    img{height:24px; width:auto; object-fit:contain;}
    @media print { @page { size: A4; margin: 12mm; } }
  </style>
  </head>
  <body>
    <h1>${title} — ${monthLabel}${entrepriseLabel}</h1>
    <table>
      <thead>
        <tr>
          <th>Employé</th>
          <th>Date</th>
          <th>Sortie</th>
          <th>Retour</th>
          <th>Motif</th>
          <th>Signature</th>
        </tr>
      </thead>
      <tbody>
        ${filteredRows.map((r) => {
          const dateStr = new Date(r.date).toLocaleDateString('fr-FR');
          const dep = r.departure_time || '-';
          const ret = r.return_time || '-';
          const reason = r.reason || '-';
          const url = (() => {
            // Prefer embedded data URL for print to avoid cross-origin/image blocking
            if (r.return_signature && typeof r.return_signature === 'string' && r.return_signature.trim().startsWith('data:image')) {
              return r.return_signature.trim();
            }
            const src = getSignatureSrc(r);
            return src || null;
          })();
          const sigCell = (r.return_signature || r.return_signature_file_url || r.signatureUrl)
            ? (url ? `<img src="${url}" alt="Signature" />` : '✓')
            : '-';
          return `<tr>
            <td>${r.employeeName}</td>
            <td>${dateStr}</td>
            <td>${dep}</td>
            <td>${ret}</td>
            <td>${reason}</td>
            <td>${sigCell}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <script>
      function whenImagesReady(cb){
        var imgs = Array.prototype.slice.call(document.images || []);
        if (imgs.length === 0) { cb(); return; }
        var pending = imgs.length; var done = function(){ if(--pending <= 0) cb(); };
        imgs.forEach(function(img){
          if (img.complete) { done(); }
          else {
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          }
        });
        setTimeout(cb, 2500); // fallback timeout
      }
      window.onload = function(){ whenImagesReady(function(){ window.print(); setTimeout(function(){ window.close(); }, 300); }); };
    <\/script>
  </body>
  </html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    } else {
      toast({
        title: "Impossible d’imprimer",
        description: "Veuillez autoriser les fenêtres pop-up pour lancer l’impression.",
      });
    }
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

  function getSignatureSrc(d: { return_signature?: string | null; return_signature_file_url?: string | null; signatureUrl?: string | null }) {
    // Priority: explicit file URL -> dataURL in return_signature -> resolve signatureUrl
    const fileFirst = d.return_signature_file_url ?? undefined;
    const rawSig = d.return_signature ?? undefined;
    // 1) If we have a file URL or relative path
    const byFile = fileFirst ? resolveSignatureUrl(fileFirst) : null;
    if (byFile) return byFile;
    // 2) If raw signature is a data URL
    if (rawSig && typeof rawSig === 'string' && rawSig.trim().startsWith('data:image')) return rawSig.trim();
    // 3) If raw signature is plain base64
    if (rawSig && typeof rawSig === 'string') {
      const compact = rawSig.replace(/\s+/g, '');
      if (/^[A-Za-z0-9+\/_=-]+$/.test(compact) && compact.length > 40) {
        return `data:image/png;base64,${compact}`;
      }
    }
    // 4) Fallback to legacy field if present
    if (d.signatureUrl) {
      const byLegacy = resolveSignatureUrl(d.signatureUrl);
      if (byLegacy) return byLegacy;
    }
    return null;
  }

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
            <div className="border rounded-lg overflow-x-auto print:overflow-visible">
              <Table className="print:text-[12px] print:leading-tight print:table-fixed w-full">
                <TableHeader>
                  <TableRow className="bg-blue-100/100 print:bg-blue-200 print:text-[10px]">
                    <TableHead className="whitespace-nowrap text-center px-1.5 py-1 print:px-0.5 print:py-0">Employé</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-1.5 py-1 print:px-0.5 print:py-0">Date</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-1.5 py-1 print:px-0.5 print:py-0">Sortie</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-1.5 py-1 print:px-0.5 print:py-0">Retour</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-1.5 py-1 print:px-0.5 print:py-0">Motif</TableHead>
                    <TableHead className="whitespace-nowrap text-center px-1.5 py-1 print:px-0.5 print:py-0">Signature</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 print:py-2 text-muted-foreground">Chargement…</TableCell>
                    </TableRow>
                  )}
                  {error && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 print:py-2 text-destructive">{error}</TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 print:py-2 text-muted-foreground">Aucun enregistrement trouvé pour cette période</TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && filteredRows.map((r) => (
                    <TableRow key={r.id} className="even:bg-muted/100 print:even:bg-gray-100 print:text-[10px]">
                      <TableCell className="font-medium text-center px-1.5 py-1 print:px-0.5 print:py-0">{r.employeeName}</TableCell>
                      <TableCell className="text-center px-1.5 py-1 print:px-0.5 print:py-0">{new Date(r.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="text-center px-1.5 py-1 print:px-0.5 print:py-0">{r.departure_time || '-'}</TableCell>
                      <TableCell className="text-center px-1.5 py-1 print:px-0.5 print:py-0">{r.return_time || '-'}</TableCell>
                      <TableCell className="text-center px-1.5 py-1 print:px-0.5 print:py-0">{r.reason || '-'}</TableCell>
                      <TableCell className="text-center px-1.5 py-1 print:px-0.5 print:py-0">
                      {(() => {
                          const src = getSignatureSrc(r);
                          return src ? (
                            <img
                              src={src}
                              alt="Signature"
                              className="inline-block h-10 object-contain rounded print:h-4"
                              onError={(e) => {
                                if (r.return_signature && r.return_signature.startsWith('data:image') && e.currentTarget.src !== r.return_signature) {
                                  e.currentTarget.src = r.return_signature;
                                } else {
                                  e.currentTarget.replaceWith(document.createTextNode('-'));
                                }
                              }}
                            />
                          ) : '-';
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

