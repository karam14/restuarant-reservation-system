"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditTimeSlotPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { t } = useTranslations();
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const id = params.id as string;
  const router = useRouter();

  const [slotTime, setSlotTime] = useState("");
  const [maxReservations, setMaxReservations] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) return;

    async function fetchTimeSlot() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("time_slot_templates")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenant!.id)
        .single();

      if (error) {
        console.error("Error fetching time slot:", error);
        toast.error(t("timeSlots.toastLoadError"));
      } else if (data) {
        setSlotTime(data.slot_time);
        setMaxReservations(String(data.max_reservations));
      }
      setLoading(false);
    }

    fetchTimeSlot();
  }, [tenant, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("time_slot_templates")
      .update({
        slot_time: slotTime,
        max_reservations: parseInt(maxReservations, 10),
      })
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) {
      console.error("Error updating time slot:", error);
      toast.error(t("timeSlots.toastUpdateError"));
      setSubmitting(false);
    } else {
      toast.success(t("timeSlots.toastUpdated"));
      router.push(`/${tenantSlug}/time-slots`);
    }
  };

  if (tenantLoading || loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-lg mx-auto space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${tenantSlug}/time-slots`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{t("timeSlots.editTitle")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("timeSlots.editInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slot_time">{t("timeSlots.time")}</Label>
              <Input id="slot_time" type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_reservations">{t("timeSlots.maxReservations")}</Label>
              <Input
                id="max_reservations"
                type="number"
                min="1"
                value={maxReservations}
                onChange={(e) => setMaxReservations(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {submitting ? t("common.saving") : t("timeSlots.updateButton")}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/${tenantSlug}/time-slots`}>{t("common.cancel")}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
