"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

const statusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-accent/10 text-accent border-accent/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-warning/10 text-warning border-warning/20";
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "confirmed":
      return "Bevestigd";
    case "cancelled":
      return "Geannuleerd";
    default:
      return "In afwachting";
  }
};

export default function ReservationDetailPage() {
  const { tenant } = useTenant();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const id = params.id as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

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
        console.error("Fout bij het ophalen van reservering:", error);
      } else {
        setReservation(data);
      }
      setLoading(false);
    }

    fetchReservation();
  }, [tenant, id]);

  const handleConfirm = async () => {
    if (!reservation || !tenant) return;
    const supabase = createClient();

    const { error } = await supabase
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", reservation.id)
      .eq("tenant_id", tenant.id);

    if (error) {
      console.error("Fout bij het bevestigen van reservering:", error);
      return;
    }

    setReservation({ ...reservation, status: "confirmed" });

    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: reservation.guest_email,
        guestName: reservation.guest_name,
        reservationTime: format(
          new Date(reservation.reservation_time),
          "PPPp",
          { locale: nl }
        ),
        status: "bevestigd",
        isConfirmation: true,
      }),
    });
  };

  const handleCancel = async () => {
    if (!reservation || !tenant) return;
    const supabase = createClient();

    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", reservation.id)
      .eq("tenant_id", tenant.id);

    if (error) {
      console.error("Fout bij het annuleren van reservering:", error);
      return;
    }

    setReservation({ ...reservation, status: "cancelled" });

    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: reservation.guest_email,
        guestName: reservation.guest_name,
        reservationTime: format(
          new Date(reservation.reservation_time),
          "PPPp",
          { locale: nl }
        ),
        status: "geannuleerd",
        isConfirmation: true,
      }),
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Reservering niet gevonden.</p>
        <Button variant="outline" onClick={() => router.back()}>
          Terug
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Reservering Details
        </h1>
        <Badge variant="outline" className={statusColor(reservation.status)}>
          {statusLabel(reservation.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gastinformatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Gastnaam</p>
              <p className="font-medium">{reservation.guest_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">E-mailadres</p>
              <p className="font-medium">{reservation.guest_email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefoonnummer</p>
              <p className="font-medium">{reservation.guest_phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aantal gasten</p>
              <p className="font-medium">{reservation.guests_count}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Reserveringsdatum & tijd
              </p>
              <p className="font-medium">
                {format(new Date(reservation.reservation_time), "PPPp", {
                  locale: nl,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aangemaakt op</p>
              <p className="font-medium">
                {format(new Date(reservation.created_at), "PPPp", {
                  locale: nl,
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {reservation.status === "pending" && (
          <>
            <Button
              onClick={handleConfirm}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Bevestigen
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Annuleren
            </Button>
          </>
        )}
        <Button variant="outline" asChild>
          <Link href={`/${tenantSlug}/reservations`}>Terug</Link>
        </Button>
      </div>
    </div>
  );
}
