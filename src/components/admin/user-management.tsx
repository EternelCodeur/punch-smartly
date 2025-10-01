import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Search, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createEmploye, deleteEmploye, updateEmploye, listEntreprises, listEmployes, type Employe, Entreprise } from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  entrepriseId?: string | null;
  entrepriseName: string;
}
type UserManagementProps = { entrepriseFilterId?: string };
export const UserManagement: React.FC<UserManagementProps> = ({ entrepriseFilterId = 'all' }) => {
  const navigate = useNavigate();
  const [emps, setEmps] = useState<Employe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      setError(null);
      const all = await listEmployes();
      setEmps(all);
    } catch (e: any) {
      setError(e?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const users: User[] = (emps || []).map(e => ({
    id: String(e.id),
    firstName: e.first_name,
    lastName: e.last_name,
    position: e.position || '',
    entrepriseId: e.entreprise_id != null ? String(e.entreprise_id) : null,
    entrepriseName: e.entreprise?.name ?? '',
  }));

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    entrepriseId: 'none' as string,
  });

  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);

  React.useEffect(() => {
    let alive = true;
    listEntreprises()
      .then((list) => { if (alive) setEntreprises(list); })
      .catch(() => {})
    return () => { alive = false; };
  }, []);

  const { toast } = useToast();

  const filteredUsers = useMemo(() => {
    const base = entrepriseFilterId === 'all' ? users : users.filter(u => u.entrepriseId === entrepriseFilterId);
    return base.filter(user =>
      `${user.firstName} ${user.lastName} ${user.position} ${user.entrepriseName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [users, entrepriseFilterId, searchTerm]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      position: '',
      entrepriseId: 'none',
    });
    setEditingUser(null);
  };

  const handleAddUser = async () => {
    if (!formData.firstName || !formData.lastName || !formData.position) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez remplir prénom, nom et fonction.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createEmploye({
        first_name: formData.firstName,
        last_name: formData.lastName,
        position: formData.position,
        entreprise_id: formData.entrepriseId === 'none' ? null : Number(formData.entrepriseId),
      } as any);
      toast({ title: 'Employé ajouté', description: `${formData.firstName} ${formData.lastName} a été ajouté avec succès.` });
      resetForm();
      setIsAddUserOpen(false);
      reload();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Ajout impossible', variant: 'destructive' });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      position: user.position,
      entrepriseId: user.entrepriseId ?? 'none',
    });
    setIsEditUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      await updateEmploye(Number(editingUser.id), {
        first_name: formData.firstName,
        last_name: formData.lastName,
        position: formData.position,
        entreprise_id: formData.entrepriseId === 'none' ? null : Number(formData.entrepriseId),
      } as any);
      toast({ title: 'Employé modifié', description: `Les informations de ${formData.firstName} ${formData.lastName} ont été mises à jour.` });
      resetForm();
      setIsEditUserOpen(false);
      reload();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e?.message || 'Mise à jour impossible', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteEmploye(Number(userId));
      toast({ title: 'Employé supprimé', description: "L'employé a été supprimé avec succès." });
      reload();
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('Not Found') || msg.includes('404')) {
        toast({ title: 'Employé introuvable', description: "La fiche n'existe plus. Rafraîchissement de la liste.", variant: 'destructive' });
        reload();
        return;
      }
      toast({ title: 'Erreur', description: msg || 'Suppression impossible', variant: 'destructive' });
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestion des Employés</CardTitle>
              <CardDescription>
                Ajoutez, modifiez ou supprimez les employés de l'application
              </CardDescription>
            </div>
            
            <Button onClick={() => { setIsAddUserOpen(true); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Employé
            </Button>
            <Dialog
              open={isAddUserOpen}
              onOpenChange={(open) => {
                setIsAddUserOpen(open);
                if (open) {
                  // Opening Add dialog: ensure clean state
                  setEditingUser(null);
                  resetForm();
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Nouvel Employé
                  </DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouvel Employé au système
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Prénom"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Nom"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="position">Fonction</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      placeholder="Fonction dans l'entreprise"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="entreprise">Entreprise</Label>
                    <Select
                      value={formData.entrepriseId}
                      onValueChange={(value) => handleInputChange('entrepriseId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="(Optionnel) Lier à une entreprise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        {entreprises.map((ent) => (
                          <SelectItem key={ent.id} value={String(ent.id)}>{ent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAddUser}>Ajouter</Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Employee Dialog */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifier l'Employé</DialogTitle>
                  <DialogDescription>
                    Modifiez les informations de l'Employé puis enregistrez les changements
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName_edit">Prénom</Label>
                      <Input
                        id="firstName_edit"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Prénom"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName_edit">Nom</Label>
                      <Input
                        id="lastName_edit"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Nom"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="position_edit">Fonction</Label>
                    <Input
                      id="position_edit"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      placeholder="Fonction dans l'entreprise"
                    />
                  </div>

                  <div>
                    <Label htmlFor="entreprise_edit">Entreprise</Label>
                    <Select
                      value={formData.entrepriseId}
                      onValueChange={(value) => handleInputChange('entrepriseId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="(Optionnel) Lier à une entreprise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        {entreprises.map((ent) => (
                          <SelectItem key={ent.id} value={String(ent.id)}>{ent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleUpdateUser}>Enregistrer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Fonction</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Chargement…</TableCell>
                  </TableRow>
                )}
                {error && !loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-destructive">{error}</TableCell>
                  </TableRow>
                )}
                {!loading && !error && filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.position}</TableCell>
                    <TableCell>{user.entrepriseName}</TableCell>
                   
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          className='bg-blue-500 hover:bg-blue-700'
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-500 hover:bg-red-700"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className='bg-green-500 hover:bg-green-700'
                          onClick={() =>
                            navigate(`/admin/users/${user.id}/attendance`, {
                              state: { name: `${user.firstName} ${user.lastName}`, position: user.position },
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!loading && !error && filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun utilisateur trouvé
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};