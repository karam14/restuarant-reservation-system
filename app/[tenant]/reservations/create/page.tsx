"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CreateReservationPage() {
  const { tenant } = useTenant();
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenant) {
      toast.error("Tenant niet gevonden.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const reservationDateTime = `${reservationDate}T${reservationTime}`;

    const { error } = await supabase.from("reservations").insert([
      {
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        reservation_time: reservationDateTime,
        guests_count: guestsCount,
        status: "pending",
        tenant_id: tenant.id,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("Fout bij het maken van reservering:", error);
      toast.error("Fout bij het opslaan van de reservering.");
    } else {
      toast.success("Reservering succesvol aangemaakt.");
      router.push(`/${tenantSlug}/reservations`);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">
        Nieuwe Reservering
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reservering Gegevens</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest_name">Gastnaam</Label>
              <Input
                id="guest_name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Volledige naam"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_email">E-mailadres</Label>
              <Input
                id="guest_email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="email@voorbeeld.nl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_phone">Telefoonnummer</Label>
              <Input
                id="guest_phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="+31 6 12345678"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reservation_date">Datum</Label>
                <Input
                  id="reservation_date"
                  type="date"
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservation_time">Tijd</Label>
                <Input
                  id="reservation_time"
                  type="time"
                  value={reservationTime}
                  onChange={(e) => setReservationTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests_count">Aantal gasten</Label>
              <Input
                id="guests_count"
                type="number"
                min={1}
                value={guestsCount}
                onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Bezig met opslaan..." : "Reservering Maken"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${tenantSlug}/reservations`)}
              >
                Annuleren
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
