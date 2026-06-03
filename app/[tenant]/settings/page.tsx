"use client";

import { useTenant } from "@/lib/tenant-context";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function SettingsPage() {
  const { tenant, loading } = useTenant();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setEmail(tenant.email || "");
      setDomain(tenant.domain || "");
    }
  }, [tenant]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("tenants")
      .update({ name, email, domain })
      .eq("id", tenant.id);

    setSaving(false);

    if (error) {
      toast.error("Er is een fout opgetreden bij het opslaan.");
    } else {
      toast.success("Instellingen succesvol opgeslagen.");
    }
  }

  if (loading) {
    return <div className="p-4">Laden...</div>;
  }

  if (!tenant) {
    return <div className="p-4">Tenant niet gevonden.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Instellingen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Naam</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Restaurant naam"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@voorbeeld.nl"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="domain">Domein</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="voorbeeld.nl"
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Opslaan..." : "Opslaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
