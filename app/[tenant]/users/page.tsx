"use client";

import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export default function UsersPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { t } = useTranslations();
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function checkSuperAdmin() {
      const { data } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", session!.user.id)
        .single();

      if (data) {
        setAuthorized(true);
      } else {
        setAuthorized(false);
        router.replace(`/${tenant?.slug || ""}/dashboard`);
      }
    }

    checkSuperAdmin();
  }, [session, supabase, tenant, router]);

  useEffect(() => {
    if (authorized && tenant) fetchUsers();
  }, [authorized, tenant]);

  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/admin/users?tenantId=${tenant!.id}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
      } else {
        toast.error(data.error || "Kon gebruikers niet laden");
      }
    } catch {
      toast.error("Kon gebruikers niet laden");
    }
    setLoadingUsers(false);
  }

  async function handleAddUser() {
    if (!tenant || !newEmail || !newPassword) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
          tenantId: tenant.id,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setShowAddDialog(false);
        setCreatedCredentials({ email: newEmail, password: newPassword });
        setShowCredentialsDialog(true);
        setNewEmail("");
        setNewPassword("");
        setNewRole("admin");
        fetchUsers();
        toast.success("Gebruiker aangemaakt");
      } else {
        toast.error(data.error || "Kon gebruiker niet aanmaken");
      }
    } catch {
      toast.error("Kon gebruiker niet aanmaken");
    }
    setSaving(false);
  }

  async function handleEditRole() {
    if (!tenant || !selectedUser) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          tenantId: tenant.id,
          role: editRole,
        }),
      });

      if (res.ok) {
        setShowEditDialog(false);
        fetchUsers();
        toast.success("Rol bijgewerkt");
      } else {
        const data = await res.json();
        toast.error(data.error || "Kon rol niet bijwerken");
      }
    } catch {
      toast.error("Kon rol niet bijwerken");
    }
    setSaving(false);
  }

  async function handleDeleteUser() {
    if (!tenant || !selectedUser) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          tenantId: tenant.id,
        }),
      });

      if (res.ok) {
        setShowDeleteDialog(false);
        setSelectedUser(null);
        fetchUsers();
        toast.success("Gebruiker verwijderd uit restaurant");
      } else {
        const data = await res.json();
        toast.error(data.error || "Kon gebruiker niet verwijderen");
      }
    } catch {
      toast.error("Kon gebruiker niet verwijderen");
    }
    setSaving(false);
  }

  function handleCopyCredentials() {
    if (!createdCredentials) return;
    const text = `E-mail: ${createdCredentials.email}\nWachtwoord: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function generatePassword() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  }

  if (tenantLoading || authorized === null) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  if (!tenant || !authorized) return null;

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gebruikersbeheer
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Gebruiker toevoegen
          </Button>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Geen gebruikers gevonden voor dit restaurant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Laatst ingelogd</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString(
                              "nl-NL",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "Nog niet ingelogd"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditRole(user.role);
                              setShowEditDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruiker toevoegen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>E-mailadres</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
              />
            </div>
            <div className="space-y-2">
              <Label>Wachtwoord</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Wachtwoord"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                >
                  Genereer
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Medewerker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={saving || !newEmail || !newPassword}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Confirmation Dialog */}
      <Dialog
        open={showCredentialsDialog}
        onOpenChange={setShowCredentialsDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruiker aangemaakt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Deel deze inloggegevens met de gebruiker. Het wachtwoord wordt
              niet opnieuw getoond.
            </p>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">E-mail: </span>
                {createdCredentials?.email}
              </div>
              <div>
                <span className="text-muted-foreground">Wachtwoord: </span>
                {createdCredentials?.password}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyCredentials}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Gekopieerd!" : "Kopieer inloggegevens"}
            </Button>
            <Button onClick={() => setShowCredentialsDialog(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rol wijzigen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Rol wijzigen voor{" "}
              <span className="font-medium">{selectedUser?.email}</span>
            </p>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Medewerker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              Annuleren
            </Button>
            <Button onClick={handleEditRole} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gebruiker verwijderen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Weet u zeker dat u{" "}
            <span className="font-medium">{selectedUser?.email}</span> wilt
            verwijderen uit dit restaurant? De gebruiker kan nog toegang hebben
            tot andere restaurants.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
