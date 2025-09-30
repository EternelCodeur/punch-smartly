import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SuperAdmin: React.FC = () => {
  const { user, logout, listAccounts, createAccount, deleteAccount } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<{ username: string; role: "user" | "admin" | "superadmin" }[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "user" as "user" | "admin" | "superadmin",
  });

  const refresh = () => {
    const data = listAccounts();
    setAccounts(data);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return accounts.filter(a => `${a.username} ${a.role}`.toLowerCase().includes(q));
  }, [accounts, search]);

  const onCreate = async () => {
    if (!form.username || !form.password) {
      toast({ title: "Champs obligatoires", description: "Renseignez le nom d'utilisateur et le mot de passe", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await createAccount(form.username.trim(), form.password, form.role);
      toast({ title: "Compte créé", description: `${form.username} (${form.role})` });
      setForm({ username: "", password: "", role: "user" });
      refresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Impossible de créer le compte", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (username: string) => {
    if (username === user?.username) {
      toast({ title: "Action non autorisée", description: "Vous ne pouvez pas supprimer votre propre compte en étant connecté.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await deleteAccount(username);
      toast({ title: "Compte supprimé", description: username });
      refresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Suppression impossible", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Connecté en tant que</span>
            <span className="text-sm font-medium">{user?.username} (superadmin)</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={logout}>Se déconnecter</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestion des Comptes</CardTitle>
            <CardDescription>Créer des comptes pour utilisateurs, admins et superadmins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sa_username">Nom d'utilisateur</Label>
                <Input id="sa_username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ex: jean" />
              </div>
              <div>
                <Label htmlFor="sa_password">Mot de passe</Label>
                <Input id="sa_password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div>
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onCreate} disabled={creating}>{creating ? "Création..." : "Créer le compte"}</Button>
            </div>

            <div className="flex items-center gap-2">
              <Input className="max-w-sm" placeholder="Rechercher un compte..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom d'utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((acc) => (
                    <TableRow key={acc.username}>
                      <TableCell className="font-medium">{acc.username}</TableCell>
                      <TableCell>{acc.role}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button variant="destructive" size="sm" onClick={() => onDelete(acc.username)} disabled={loading}>
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">Aucun compte</TableCell>
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

export default SuperAdmin;
