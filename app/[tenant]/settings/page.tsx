"use client";

import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, Palette, Server } from "lucide-react";

export default function SettingsPage() {
  const { tenant, loading } = useTenant();
  const { t } = useTranslations();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");

  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#4CAF50");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);

  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setEmail(tenant.email || "");
      setDomain(tenant.domain || "");
      setLogoUrl(tenant.logo_url || "");
      setBrandColor(tenant.brand_color || "#4CAF50");
      setSmtpHost(tenant.smtp_host || "");
      setSmtpPort(String(tenant.smtp_port || 587));
      setSmtpUser(tenant.smtp_user || "");
      setSmtpPass(tenant.smtp_pass || "");
      setSmtpSecure(tenant.smtp_secure ?? true);
    }
  }, [tenant]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;

    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("tenants")
      .update({
        name,
        email,
        domain,
        logo_url: logoUrl || null,
        brand_color: brandColor || "#4CAF50",
        smtp_host: smtpHost || null,
        smtp_port: parseInt(smtpPort, 10) || 587,
        smtp_user: smtpUser || null,
        smtp_pass: smtpPass || null,
        smtp_secure: smtpSecure,
      })
      .eq("id", tenant.id);

    setSaving(false);

    if (error) {
      toast.error(t("settings.error"));
    } else {
      toast.success(t("settings.saved"));
    }
  }

  async function handleTestSmtp() {
    if (!tenant) return;

    setTestingSmtp(true);
    try {
      const res = await fetch(`/api/${tenant.slug}/test-smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost,
          smtpPort: parseInt(smtpPort, 10) || 587,
          smtpUser,
          smtpPass,
          smtpSecure,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "SMTP-verbinding succesvol");
      } else {
        toast.error(data.error || "SMTP-test mislukt");
      }
    } catch {
      toast.error("Kon geen verbinding maken met de server");
    }
    setTestingSmtp(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-4 text-muted-foreground">{t("settings.notFound")}</div>
    );
  }

  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t("settings.restaurantName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.namePlaceholder")}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="email">{t("settings.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("settings.emailPlaceholder")}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="domain">{t("settings.domain")}</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={t("settings.domainPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              E-mail branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {logoUrl && (
                <div className="mt-3 p-4 border rounded-lg bg-muted/30">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-h-20 mx-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="brandColor">Merkkleur</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="brandColorPicker"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-10 rounded border cursor-pointer"
                />
                <Input
                  id="brandColor"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#4CAF50"
                  className="w-32 font-mono"
                />
                <div
                  className="h-10 flex-1 rounded border"
                  style={{ backgroundColor: brandColor }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMTP Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              SMTP-configuratie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Poort</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="smtpUser">Gebruikersnaam</Label>
              <Input
                id="smtpUser"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="smtpPass">Wachtwoord</Label>
              <Input
                id="smtpPass"
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>TLS/SSL</Label>
                <p className="text-sm text-muted-foreground">
                  Beveiligde verbinding gebruiken
                </p>
              </div>
              <Switch
                checked={smtpSecure}
                onCheckedChange={setSmtpSecure}
              />
            </div>

            <Separator />

            <Button
              type="button"
              variant="outline"
              onClick={handleTestSmtp}
              disabled={testingSmtp || !smtpHost || !smtpUser || !smtpPass}
              className="w-full"
            >
              {testingSmtp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verbinding testen...
                </>
              ) : (
                <>
                  <Server className="h-4 w-4 mr-2" />
                  Test SMTP-verbinding
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {saving ? t("settings.saving") : t("settings.save")}
        </Button>
      </form>
    </motion.div>
  );
}
