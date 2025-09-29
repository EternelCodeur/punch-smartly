import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Search, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  site: string;
  createdAt: string;
}
export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      firstName: 'Jean',
      lastName: 'Dupont',
      position: 'Développeur',
      site: 'OGAR',
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      firstName: 'Marie',
      lastName: 'Martin',
      position: 'Chef de projet',
      site: 'OGAR',
      createdAt: '2024-02-01',
    },
    {
      id: '3',
      firstName: 'Pierre',
      lastName: 'Bernard',
      position: 'Designer',
      site: 'SIEGE ARCHIGED',
      createdAt: '2024-01-20',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    site: '',
  });

  const { toast } = useToast();

  const filteredUsers = users.filter(user =>
    `${user.firstName} ${user.lastName} ${user.position} ${user.site}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      position: '',
      site: '',
    });
    setEditingUser(null);
  };

  const handleAddUser = () => {
    if (!formData.firstName || !formData.lastName || !formData.position || !formData.site) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUsers(prev => [...prev, newUser]);
    toast({
      title: "Utilisateur ajouté",
      description: `${formData.firstName} ${formData.lastName} a été ajouté avec succès.`,
    });

    resetForm();
    setIsAddUserOpen(false);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      position: user.position,
      site: user.site,
    });
    setIsAddUserOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;

    setUsers(prev =>
      prev.map(user =>
        user.id === editingUser.id
          ? { ...user, ...formData }
          : user
      )
    );

    toast({
      title: "Utilisateur modifié",
      description: `Les informations de ${formData.firstName} ${formData.lastName} ont été mises à jour.`,
    });

    resetForm();
    setIsAddUserOpen(false);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
    toast({
      title: "Utilisateur supprimé",
      description: "L'utilisateur a été supprimé avec succès.",
    });
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestion des Utilisateurs</CardTitle>
              <CardDescription>
                Ajoutez, modifiez ou supprimez les utilisateurs de l'application
              </CardDescription>
            </div>
            
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Ajoutez un nouvel utilisateur au système'}
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
                    <Label htmlFor="site">Site</Label>
                    <Select
                      value={formData.site}
                      onValueChange={(value) => handleInputChange('site', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Site" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Selectionnez la localisation</SelectItem>
                        <SelectItem value="OGAR">OGAR</SelectItem>
                        <SelectItem value="SIEGE ARCHIGED">SIEGE ARCHIGED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={editingUser ? handleUpdateUser : handleAddUser}>
                    {editingUser ? 'Modifier' : 'Ajouter'}
                  </Button>
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
                  <TableHead>Localisation</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.position}</TableCell>
                    <TableCell>{user.site}</TableCell>
                   
                    <TableCell>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</TableCell>
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

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun utilisateur trouvé
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};