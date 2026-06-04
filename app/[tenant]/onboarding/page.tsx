"use client";

import { useTenant } from "@/lib/tenant-context";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  Palette,
  Mail,
  UserPlus,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Eye,
  EyeOff,
  Server,
} from "lucide-react";

const STEPS = [
  { key: "details", label: "Restaurant", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "smtp", label: "SMTP", icon: Mail },
  { key: "admin", label: "Beheerder", icon: UserPlus },
  { key: "review", label: "Overzicht", icon: CheckCircle2 },
];

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export default function OnboardingPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Step 1: Restaurant Details
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");

  // Step 2: Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#4CAF50");

  // Step 3: SMTP
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [testingSmtp, setTestingSmtp] = useState(false);

  // Step 4: Admin User
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState(() => generatePassword());
  const [showPassword, setShowPassword] = useState(false);

  // Result
  const [createdTenant, setCreatedTenant] = useState<any>(null);

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

  function handleNameChange(value: string) {
    setName(value);
    setSlug(generateSlug(value));
  }

  async function handleTestSmtp() {
    setTestingSmtp(true);
    try {
      const res = await fetch(`/api/${tenant?.slug}/test-smtp`, {
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
      toast.error("Kon geen verbinding maken");
    }
    setTestingSmtp(false);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/onboard-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          email: email || null,
          domain: domain || null,
          logoUrl: logoUrl || null,
          brandColor: brandColor || "#4CAF50",
          smtpHost: smtpHost || null,
          smtpPort: parseInt(smtpPort, 10) || 587,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
          smtpSecure,
          adminEmail,
          adminPassword,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setCreatedTenant(data.tenant);
        setCreated(true);
        toast.success("Restaurant succesvol aangemaakt!");
      } else {
        toast.error(data.error || "Kon restaurant niet aanmaken");
      }
    } catch {
      toast.error("Kon restaurant niet aanmaken");
    }
    setCreating(false);
  }

  function handleCopyCredentials() {
    const text = `E-mail: ${adminEmail}\nWachtwoord: ${adminPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function canProceed() {
    switch (step) {
      case 0:
        return name.trim() && slug.trim();
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return adminEmail.trim() && adminPassword.trim();
      case 4:
        return true;
      default:
        return false;
    }
  }

  if (tenantLoading || authorized === null) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  if (!tenant || !authorized) return null;

  if (created) {
    return (
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {createdTenant?.name} is aangemaakt!
              </h2>
              <p className="text-muted-foreground mt-1">
                Het restaurant is klaar voor gebruik.
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4 text-left font-mono text-sm space-y-1 max-w-sm mx-auto">
              <div>
                <span className="text-muted-foreground">E-mail: </span>
                {adminEmail}
              </div>
              <div>
                <span className="text-muted-foreground">Wachtwoord: </span>
                {adminPassword}
              </div>
              <div>
                <span className="text-muted-foreground">Dashboard: </span>/
                {createdTenant?.slug}/dashboard
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleCopyCredentials}>
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Gekopieerd!" : "Kopieer inloggegevens"}
              </Button>
              <Button
                onClick={() =>
                  router.push(`/${createdTenant?.slug}/dashboard`)
                }
              >
                Ga naar dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = STEPS[step].icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                {step === 0 && "Restaurantgegevens"}
                {step === 1 && "E-mail branding"}
                {step === 2 && "SMTP-configuratie"}
                {step === 3 && "Beheerder aanmaken"}
                {step === 4 && "Overzicht"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 0: Restaurant Details */}
              {step === 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Restaurantnaam *</Label>
                    <Input
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Restaurant naam"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug *</Label>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="restaurant-slug"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL wordt: /{slug}/dashboard
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Contact e-mail</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="info@restaurant.nl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Domein</Label>
                    <Input
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="restaurant.nl"
                    />
                  </div>
                </>
              )}

              {/* Step 1: Branding */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
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
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Merkkleur</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-10 w-10 rounded border cursor-pointer"
                      />
                      <Input
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
                  <p className="text-sm text-muted-foreground">
                    Deze stap is optioneel. U kunt dit later instellen via de
                    instellingen.
                  </p>
                </>
              )}

              {/* Step 2: SMTP */}
              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Poort</Label>
                      <Input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder="587"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gebruikersnaam</Label>
                    <Input
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wachtwoord</Label>
                    <Input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>TLS/SSL</Label>
                      <p className="text-sm text-muted-foreground">
                        Beveiligde verbinding
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
                  <p className="text-sm text-muted-foreground">
                    Deze stap is optioneel. Zonder SMTP worden de standaard
                    e-mailinstellingen gebruikt.
                  </p>
                </>
              )}

              {/* Step 3: Admin User */}
              {step === 3 && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Maak een beheerder aan voor dit restaurant. U deelt de
                    inloggegevens zelf met de gebruiker.
                  </p>
                  <div className="space-y-2">
                    <Label>E-mailadres *</Label>
                    <Input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="beheerder@restaurant.nl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wachtwoord *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
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
                        onClick={() => setAdminPassword(generatePassword())}
                      >
                        Genereer
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Restaurant</span>
                      <span className="font-medium">{name}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Slug</span>
                      <code className="text-sm bg-muted px-2 py-0.5 rounded">
                        /{slug}
                      </code>
                    </div>
                    {email && (
                      <>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">E-mail</span>
                          <span>{email}</span>
                        </div>
                      </>
                    )}
                    {domain && (
                      <>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Domein</span>
                          <span>{domain}</span>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Branding</span>
                      <div className="flex items-center gap-2">
                        {logoUrl ? (
                          <Badge variant="secondary">Logo ingesteld</Badge>
                        ) : (
                          <Badge variant="outline">Geen logo</Badge>
                        )}
                        <div
                          className="h-6 w-6 rounded border"
                          style={{ backgroundColor: brandColor }}
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">SMTP</span>
                      {smtpHost ? (
                        <Badge variant="secondary">{smtpHost}</Badge>
                      ) : (
                        <Badge variant="outline">Standaard</Badge>
                      )}
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Beheerder</span>
                      <span>{adminEmail}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Vorige
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
            Volgende
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Restaurant aanmaken
          </Button>
        )}
      </div>
    </motion.div>
  );
}
