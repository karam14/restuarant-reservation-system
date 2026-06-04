"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function CreateReservationPage() {
  const { tenant } = useTenant();
  const { t } = useTranslations();
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
      toast.error(t("reservations.tenantNotFound"));
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
      console.error("Error creating reservation:", error);
      toast.error(t("reservations.createError"));
    } else {
      toast.success(t("reservations.createSuccess"));
      router.push(`/${tenantSlug}/reservations`);
    }
  };

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${tenantSlug}/reservations`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{t("reservations.createTitle")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("reservations.createInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest_name">{t("reservations.guestName")}</Label>
              <Input
                id="guest_name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t("reservations.namePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_email">{t("reservations.guestEmail")}</Label>
              <Input
                id="guest_email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder={t("reservations.emailPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_phone">{t("reservations.guestPhone")}</Label>
              <Input
                id="guest_phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder={t("reservations.phonePlaceholder")}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reservation_date">{t("reservations.date")}</Label>
                <Input
                  id="reservation_date"
                  type="date"
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservation_time">{t("reservations.time")}</Label>
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
              <Label htmlFor="guests_count">{t("reservations.guestCount")}</Label>
              <Input
                id="guests_count"
                type="number"
                min={1}
                value={guestsCount}
                onChange={(e) => setGuestsCount(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.push(`/${tenantSlug}/reservations`)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? t("reservations.creating") : t("reservations.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
