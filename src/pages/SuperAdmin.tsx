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
  const { user, logout } = useAuth();
  const { toast } = useToast();

  type BackendUser = { id: number; nom: string; role: "user" | "admin" | "superadmin"; enterprise_id: number | null; entreprise?: { id: number; name: string } };
  type Entreprise = { id: number; name: string };
  const [accounts, setAccounts] = useState<BackendUser[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEntrepriseId, setSelectedEntrepriseId] = useState<string>("all");

  const [form, setForm] = useState({
    username: "",
    role: "user" as "user" | "admin" | "superadmin",
    enterprise_id: "none" as string,
  });

  const [pwAlert, setPwAlert] = useState<{ text: string; visible: boolean }>({ text: "", visible: false });

  const [entFormName, setEntFormName] = useState("");

  // Helper: always include credentials so backend receives HttpOnly JWT cookie
  const authFetch = async (input: RequestInfo, init?: RequestInit) => {
    const headers: Record<string, string> = { ...(init?.headers as any) };
    return fetch(input, { credentials: 'include', ...init, headers });
  };

  const fetchEntreprises = async () => {
    const res = await authFetch(`/api/entreprises`);
    if (!res.ok) throw new Error("Impossible de charger les entreprises");
    const json = await res.json();
    const data: Entreprise[] = Array.isArray(json) ? json : (json?.data ?? []);
    setEntreprises(data);
  };

  const fetchUsers = async () => {
    const params = new URLSearchParams();
    if (selectedEntrepriseId && selectedEntrepriseId !== "all") params.set("enterprise_id", selectedEntrepriseId);
    const res = await authFetch(`/api/users?${params.toString()}`);
    if (!res.ok) throw new Error("Impossible de charger les utilisateurs");
    const json = await res.json();
    const data: BackendUser[] = Array.isArray(json) ? json : (json?.data ?? []);
    setAccounts(data);
  };

  const refresh = async () => {
    try {
      await fetchEntreprises();
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Chargement impossible", variant: "destructive" });
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchUsers().catch((e) => toast({ title: "Erreur", description: String(e?.message ?? e), variant: "destructive" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntrepriseId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const roleFiltered = accounts.filter(a => a.role === 'user' || a.role === 'admin');
    return roleFiltered.filter(a => `${a.nom} ${a.role} ${a.entreprise?.name ?? ""}`.toLowerCase().includes(q));
  }, [accounts, search]);

  const onCreate = async () => {
    if (!form.username) {
      toast({ title: "Nom requis", description: "Renseignez le nom d'utilisateur", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await authFetch(`/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: form.username.trim(),
          role: form.role,
          enterprise_id: form.enterprise_id === "none" ? null : Number(form.enterprise_id)
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Création impossible");
      }
      const json = await res.json();
      const createdUser = json?.user;
      const plainPassword: string | undefined = json?.plain_password;
      toast({ title: "Compte créé", description: `${form.username} (${form.role})` });
      if (plainPassword) {
        setPwAlert({ text: `Mot de passe de ${form.username}: ${plainPassword}`, visible: true });
        setTimeout(() => setPwAlert({ text: "", visible: false }), 60000);
      }
      setForm({ username: "", role: "user", enterprise_id: "none" });
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Impossible de créer le compte", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: number, name: string) => {
    if (name === user?.username) {
      toast({ title: "Action non autorisée", description: "Vous ne pouvez pas supprimer votre propre compte en étant connecté.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Suppression impossible");
      toast({ title: "Compte supprimé", description: name });
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Suppression impossible", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onCreateEntreprise = async () => {
    if (!entFormName.trim()) {
      toast({ title: "Nom requis", description: "Veuillez saisir le nom de l'entreprise", variant: "destructive" });
      return;
    }
    try {
      const res = await authFetch(`/api/entreprises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: entFormName.trim() })
      });
      if (!res.ok) throw new Error("Création entreprise impossible");
      setEntFormName("");
      await fetchEntreprises();
      toast({ title: "Entreprise créée", description: entFormName });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Création impossible", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Connecté en tant que</span>
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={logout}>Se déconnecter</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Localisation</CardTitle>
            <CardDescription>Créer et sélectionner une localisation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Filtrer par entreprise</Label>
                <Select value={selectedEntrepriseId} onValueChange={(v) => setSelectedEntrepriseId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les entreprises" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {entreprises.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nouvelle localisation</Label>
                <div className="flex gap-2">
                  <Input placeholder="Nom de la localisation" value={entFormName} onChange={(e) => setEntFormName(e.target.value)} />
                  <Button onClick={onCreateEntreprise}>Ajouter</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Localisation</Label>
                <Select value={form.enterprise_id} onValueChange={(v: any) => setForm({ ...form, enterprise_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="(Optionnel) Lier à une entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {entreprises.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {pwAlert.visible && (
              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
                <div className="font-semibold">Mot de passe généré</div>
                <div className="text-sm break-all">{pwAlert.text}</div>
                <div className="text-xs mt-1 opacity-70">Cet encart disparaîtra dans 30 secondes. Copiez le mot de passe maintenant.</div>
              </div>
            )}
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
                    <TableHead>Entreprise</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.nom}</TableCell>
                      <TableCell>{acc.role}</TableCell>
                      <TableCell>{acc.entreprise?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button variant="destructive" size="sm" onClick={() => onDelete(acc.id, acc.nom)} disabled={loading}>
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun compte</TableCell>
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
