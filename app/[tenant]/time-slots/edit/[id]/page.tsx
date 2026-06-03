"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditTimeSlotPage() {
  const { tenant, loading: tenantLoading } = useTenant();
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
        console.error("Fout bij het ophalen van tijdslot:", error);
        toast.error("Kon tijdslot niet laden");
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
      console.error("Fout bij het bijwerken van tijdslot:", error);
      toast.error("Kon tijdslot niet bijwerken");
      setSubmitting(false);
    } else {
      toast.success("Tijdslot bijgewerkt");
      router.push(`/${tenantSlug}/time-slots`);
    }
  };

  if (tenantLoading || loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${tenantSlug}/time-slots`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Terug
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Tijdslot Bewerken
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tijdslot Gegevens</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slot_time">Tijd</Label>
              <Input
                id="slot_time"
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_reservations">Max Reserveringen</Label>
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
                {submitting ? "Bezig..." : "Tijdslot Bijwerken"}
              </Button>
              <Link href={`/${tenantSlug}/time-slots`}>
                <Button type="button" variant="outline">
                  Annuleren
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
