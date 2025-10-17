import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createTenant, deleteTenant, listTenants, Tenant, updateTenant } from "@/lib/api";

const SuperTenant: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; contact: string }>({ name: "", contact: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string } | null>(null);
  const [copyVisible, setCopyVisible] = useState<boolean>(false);

  // Hide the copy button after 60 seconds from showing credentials
  useEffect(() => {
    if (createdCreds) {
      setCopyVisible(true);
      const t = setTimeout(() => setCopyVisible(false), 60000);
      return () => clearTimeout(t);
    } else {
      setCopyVisible(false);
    }
  }, [createdCreds]);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast({ title: 'Copié', description: 'Le texte a été copié dans le presse-papiers.' });
    } catch {
      toast({ title: 'Impossible de copier', description: 'Copiez manuellement le texte si nécessaire.', variant: 'destructive' });
    }
  };

  const authFetchTenants = async () => {
    const data = await listTenants({ per_page: 0, user_role: 'superadmin' });
    setTenants(data);
  };

  useEffect(() => {
    authFetchTenants().catch((e) => toast({ title: "Erreur", description: String(e?.message ?? e), variant: "destructive" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tenants.filter(t => `${t.name} ${t.contact ?? ""}`.toLowerCase().includes(q));
  }, [tenants, search]);

  const onCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nom requis", description: "Veuillez saisir le nom du tenant", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await createTenant({ name: form.name.trim(), contact: form.contact.trim() || undefined });
      // Afficher le mot de passe généré pour l'utilisateur créé avec le tenant
      if (res?.plain_password && res?.user) {
        setCreatedCreds({ username: res.user.nom, password: res.plain_password });
      } else {
        toast({ title: "Tenant créé", description: form.name });
      }
      setForm({ name: "", contact: "" });
      await authFetchTenants();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Création impossible", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const onStartEdit = (t: Tenant) => {
    setEditingId(t.id);
    setForm({ name: t.name, contact: t.contact ?? "" });
  };

  const onSaveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      await updateTenant(editingId, { name: form.name.trim(), contact: form.contact.trim() || undefined });
      setEditingId(null);
      setForm({ name: "", contact: ""});
      await authFetchTenants();
      toast({ title: "Tenant mis à jour", description: form.name });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Mise à jour impossible", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: number) => {
    setLoading(true);
    try {
      await deleteTenant(id);
      await authFetchTenants();
      toast({ title: "Tenant supprimé" });
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
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={logout}>Se déconnecter</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Créer et gérer une entreprise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {createdCreds && (
              <div className="rounded-md border p-4 bg-muted/30">
                <p className="font-medium mb-2">Code Secret du compte créé</p>
                <div className="grid md:grid-cols-[1fr_auto] gap-2 items-center">
                  <Input readOnly type="text" value={createdCreds.password} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Conservez ce code secret. Il n’est affiché qu’une seule fois.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Rechercher</Label>
                <Input placeholder="Rechercher une entreprise..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{editingId ? "Modifier l'entreprise" : "Nouvelle entreprise"}</Label>
                <div className="space-y-2">
                  <Input placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Input placeholder="Contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                  <div className="flex justify-end">
                    {editingId ? (
                      <Button onClick={onSaveEdit} disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer"}</Button>
                    ) : (
                      <Button onClick={onCreate} disabled={creating}>{creating ? "Création..." : "Créer"}</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.contact ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => onStartEdit(t)}>Modifier</Button>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(t.id)} disabled={loading}>Supprimer</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun tenant</TableCell>
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

export default SuperTenant;
