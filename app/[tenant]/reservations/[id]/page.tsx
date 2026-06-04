"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import { format } from "date-fns";
import { utcToZonedTime, zonedTimeToUtc } from "date-fns-tz";
import { nl, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
  Save,
  ArrowLeft,
  Pencil,
  X,
  Loader2,
} from "lucide-react";

interface Reservation {
  id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  reservation_time: string;
  guests_count: number;
  status: string;
  created_at: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-accent/10 text-accent border-accent/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-warning/10 text-warning border-warning/20";
  }
}

function sendStatusEmail(reservation: Reservation, status: string, dateFnsLocale: Locale, tenantId?: string) {
  return fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: reservation.guest_email,
      guestName: reservation.guest_name,
      reservationTime: format(new Date(reservation.reservation_time), "PPPp", { locale: dateFnsLocale }),
      status,
      isConfirmation: true,
      tenantId,
    }),
  });
}

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function ReservationDetailPage() {
  const { tenant } = useTenant();
  const { t, locale } = useTranslations();
  const dateFnsLocale = locale === "nl" ? nl : enUS;
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const id = params.id as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editGuests, setEditGuests] = useState(1);

  useEffect(() => {
    if (!tenant || !id) return;
    const supabase = createClient();

    async function fetchReservation() {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenant!.id)
        .single();

      if (error) {
        console.error("Error fetching reservation:", error);
        toast.error(t("reservations.toastDetailLoadError"));
      } else {
        setReservation(data);
        populateEditFields(data);
      }
      setLoading(false);
    }

    fetchReservation();
  }, [tenant, id]);

  const populateEditFields = (r: Reservation) => {
    setEditName(r.guest_name);
    setEditEmail(r.guest_email);
    setEditPhone(r.guest_phone || "");
    const amsterdam = utcToZonedTime(new Date(r.reservation_time), "Europe/Amsterdam");
    setEditTime(format(amsterdam, "yyyy-MM-dd'T'HH:mm"));
    setEditGuests(r.guests_count);
  };

  const startEditing = () => {
    if (reservation) populateEditFields(reservation);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (reservation) populateEditFields(reservation);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!reservation || !tenant) return;
    setSaving(true);

    const utcTime = zonedTimeToUtc(new Date(editTime), "Europe/Amsterdam").toISOString();

    const supabase = createClient();
    const { error } = await supabase
      .from("reservations")
      .update({
        guest_name: editName,
        guest_email: editEmail,
        guest_phone: editPhone,
        reservation_time: utcTime,
        guests_count: editGuests,
      })
      .eq("id", reservation.id)
      .eq("tenant_id", tenant.id);

    if (error) {
      toast.error(t("reservations.toastSaveError"));
      setSaving(false);
      return;
    }

    const updated = {
      ...reservation,
      guest_name: editName,
      guest_email: editEmail,
      guest_phone: editPhone,
      reservation_time: utcTime,
      guests_count: editGuests,
    };
    setReservation(updated);
    setEditing(false);
    setSaving(false);
    toast.success(t("reservations.toastUpdated"));
  };

  const statusEmailMap: Record<string, string> = {
    confirmed: "bevestigd",
    cancelled: "geannuleerd",
    pending: "in afwachting",
  };

  const updateStatus = async (newStatus: string) => {
    if (!reservation || !tenant) return;
    setStatusLoading(newStatus);

    const supabase = createClient();
    const { error } = await supabase
      .from("reservations")
      .update({ status: newStatus })
      .eq("id", reservation.id)
      .eq("tenant_id", tenant.id);

    if (error) {
      toast.error(t("reservations.toastStatusError"));
      setStatusLoading(null);
      return;
    }

    const updated = { ...reservation, status: newStatus };
    setReservation(updated);

    try {
      await sendStatusEmail(reservation, statusEmailMap[newStatus], dateFnsLocale, tenant?.id);
    } catch {
      toast.error(t("reservations.toastEmailError"));
      setStatusLoading(null);
      return;
    }

    const toastKeyMap: Record<string, string> = {
      confirmed: "reservations.statusConfirmed",
      cancelled: "reservations.statusCancelled",
      pending: "reservations.statusRestored",
    };
    toast.success(t(toastKeyMap[newStatus]));
    setStatusLoading(null);
  };

  const handleDelete = async () => {
    if (!reservation || !tenant) return;
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservation.id)
      .eq("tenant_id", tenant.id);

    if (error) {
      toast.error(t("reservations.toastDeleteError"));
      setDeleting(false);
      return;
    }

    toast.success(t("reservations.toastDeleted", { name: reservation.guest_name }));
    router.push(`/${tenantSlug}/reservations`);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <motion.div className="space-y-4" {...fadeIn}>
        <p className="text-muted-foreground">{t("reservations.notFound")}</p>
        <Button variant="outline" asChild>
          <Link href={`/${tenantSlug}/reservations`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t("reservations.back")}
          </Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-6 max-w-2xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${tenantSlug}/reservations`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{t("reservations.detail")}</h1>
          <motion.div key={reservation.status} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Badge variant="outline" className={getStatusColor(reservation.status)}>
              {t(`reservations.${reservation.status}`)}
            </Badge>
          </motion.div>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={startEditing}>
            <Pencil className="h-4 w-4 mr-2" /> {t("reservations.edit")}
          </Button>
        )}
      </div>

      {/* Guest Info Card */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("reservations.guestInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                <div className="space-y-2">
                  <Label>{t("reservations.guestName")}</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("reservations.guestEmail")}</Label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("reservations.guestPhone")}</Label>
                  <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("reservations.guestCount")}</Label>
                  <Input type="number" min={1} value={editGuests} onChange={(e) => setEditGuests(parseInt(e.target.value) || 1)} />
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("reservations.guestName")}</p>
                  <p className="font-medium">{reservation.guest_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("reservations.guestEmail")}</p>
                  <p className="font-medium">{reservation.guest_email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("reservations.guestPhone")}</p>
                  <p className="font-medium">{reservation.guest_phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("reservations.guestCount")}</p>
                  <p className="font-medium">{reservation.guests_count}</p>
                </div>
              </div>
            )}

            <Separator />

            {editing ? (
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                <div className="space-y-2">
                  <Label>{t("reservations.dateTime")}</Label>
                  <Input type="datetime-local" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("reservations.createdAtFull")}</p>
                  <p className="font-medium mt-2">
                    {format(new Date(reservation.created_at), "PPPp", { locale: dateFnsLocale })}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("reservations.dateTime")}</p>
                  <p className="font-medium">
                    {format(new Date(reservation.reservation_time), "PPPp", { locale: dateFnsLocale })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("reservations.createdAtFull")}</p>
                  <p className="font-medium">
                    {format(new Date(reservation.created_at), "PPPp", { locale: dateFnsLocale })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Actions */}
      {editing && (
        <motion.div className="flex gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? t("reservations.saving") : t("reservations.save")}
          </Button>
          <Button variant="outline" onClick={cancelEditing} disabled={saving}>
            <X className="h-4 w-4 mr-2" /> {t("common.cancel")}
          </Button>
        </motion.div>
      )}

      {/* Status Actions */}
      {!editing && (
        <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("reservations.actions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {reservation.status !== "confirmed" && (
                  <Button
                    variant="outline"
                    className="text-accent border-accent/30 hover:bg-accent/10"
                    onClick={() => updateStatus("confirmed")}
                    disabled={!!statusLoading}
                  >
                    {statusLoading === "confirmed" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {t("reservations.confirm")}
                  </Button>
                )}
                {reservation.status !== "pending" && (
                  <Button
                    variant="outline"
                    className="text-warning border-warning/30 hover:bg-warning/10"
                    onClick={() => updateStatus("pending")}
                    disabled={!!statusLoading}
                  >
                    {statusLoading === "pending" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                    {t("reservations.restore")}
                  </Button>
                )}
                {reservation.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => updateStatus("cancelled")}
                    disabled={!!statusLoading}
                  >
                    {statusLoading === "cancelled" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    {t("reservations.cancel")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> {t("reservations.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reservations.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("reservations.deleteConfirmDesc", {
                name: reservation.guest_name,
                date: format(new Date(reservation.reservation_time), "d MMM yyyy HH:mm", { locale: dateFnsLocale }),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {deleting ? t("reservations.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
