import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Download, FileText, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  arrivalTime: string;
  departureTime: string;
  breaks: { start: string; end: string; reason: string }[];
  totalHours: number;
  status: 'complete' | 'incomplete' | 'absent';
}

export const AttendanceReports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedUser, setSelectedUser] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');
  const { toast } = useToast();

  // Mock data for demonstration
  const attendanceRecords: AttendanceRecord[] = [
    {
      id: '1',
      userId: '1',
      userName: 'Jean Dupont',
      date: '2024-01-15',
      arrivalTime: '08:30',
      departureTime: '17:30',
      breaks: [{ start: '12:00', end: '13:00', reason: 'Pause déjeuner' }],
      totalHours: 8,
      status: 'complete',
    },
    {
      id: '2',
      userId: '2',
      userName: 'Marie Martin',
      date: '2024-01-15',
      arrivalTime: '08:15',
      departureTime: '17:45',
      breaks: [
        { start: '12:00', end: '13:00', reason: 'Pause déjeuner' },
        { start: '15:30', end: '16:00', reason: 'Rendez-vous médical' },
      ],
      totalHours: 9,
      status: 'complete',
    },
    {
      id: '3',
      userId: '3',
      userName: 'Pierre Bernard',
      date: '2024-01-15',
      arrivalTime: '09:00',
      departureTime: '',
      breaks: [],
      totalHours: 0,
      status: 'incomplete',
    },
  ];

  const users = [
    { id: '1', name: 'Jean Dupont' },
    { id: '2', name: 'Marie Martin' },
    { id: '3', name: 'Pierre Bernard' },
  ];

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesUser = selectedUser === 'all' || record.userId === selectedUser;
    const matchesMonth = record.date.startsWith(selectedMonth);
    return matchesUser && matchesMonth;
  });

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
      user: selectedUser,
      records: filteredRecords,
    });
  };

  const calculateMonthlyStats = () => {
    const totalDays = filteredRecords.length;
    const totalHours = filteredRecords.reduce((sum, record) => sum + record.totalHours, 0);
    const averageHours = totalDays > 0 ? (totalHours / totalDays).toFixed(2) : '0';
    const completeDays = filteredRecords.filter(r => r.status === 'complete').length;

    return { totalDays, totalHours, averageHours, completeDays };
  };

  const monthlyStats = calculateMonthlyStats();

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
            Filtrez les données par mois et utilisateur, puis exportez les rapports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="month">Mois</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="user">Utilisateur</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="format">Format d'export</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleExport} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{monthlyStats.totalDays}</p>
              <p className="text-sm text-muted-foreground">Jours totaux</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{monthlyStats.totalHours}h</p>
              <p className="text-sm text-muted-foreground">Heures totales</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{monthlyStats.averageHours}h</p>
              <p className="text-sm text-muted-foreground">Moyenne/jour</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{monthlyStats.completeDays}</p>
              <p className="text-sm text-muted-foreground">Jours complets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Rapports de Présence
          </CardTitle>
          <CardDescription>
            Consultez les détails des pointages pour la période sélectionnée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Arrivée</TableHead>
                  <TableHead>Départ</TableHead>
                  <TableHead>Pauses</TableHead>
                  <TableHead>Total heures</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.userName}</TableCell>
                    <TableCell>{new Date(record.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{record.arrivalTime || '-'}</TableCell>
                    <TableCell>{record.departureTime || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {record.breaks.map((breakItem, index) => (
                          <div key={index} className="mb-1">
                            {breakItem.start}-{breakItem.end}
                            <span className="text-muted-foreground ml-1">
                              ({breakItem.reason})
                            </span>
                          </div>
                        ))}
                        {record.breaks.length === 0 && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{record.totalHours}h</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'complete'
                            ? 'bg-success/10 text-success'
                            : record.status === 'incomplete'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {record.status === 'complete' ? 'Complet' : 
                         record.status === 'incomplete' ? 'Incomplet' : 'Absent'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun enregistrement trouvé pour cette période</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};