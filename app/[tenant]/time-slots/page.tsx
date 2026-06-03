"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TimeSlotTemplate {
  id: string;
  slot_time: string;
  max_reservations: number;
  tenant_id: string;
}

export default function TimeSlotsPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const router = useRouter();
  const [timeSlots, setTimeSlots] = useState<TimeSlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;

    async function fetchTimeSlots() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("time_slot_templates")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("slot_time", { ascending: true });

      if (error) {
        console.error("Fout bij het ophalen van tijdsloten:", error);
        toast.error("Kon tijdsloten niet laden");
      } else {
        setTimeSlots(data || []);
      }
      setLoading(false);
    }

    fetchTimeSlots();
  }, [tenant]);

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("time_slot_templates")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant!.id);

    if (error) {
      console.error("Fout bij het verwijderen van tijdslot:", error);
      toast.error("Kon tijdslot niet verwijderen");
    } else {
      setTimeSlots((prev) => prev.filter((slot) => slot.id !== id));
      toast.success("Tijdslot verwijderd");
    }
  };

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tijdsloten</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Beheer de beschikbare tijdsloten voor reserveringen.
          </p>
        </div>
        <Link href={`/${tenantSlug}/time-slots/create`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nieuw Tijdslot
          </Button>
        </Link>
      </div>

      <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <h2 className="text-lg font-semibold mb-1 text-emerald-900 dark:text-emerald-100">
          Weekschema
        </h2>
        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
          Beheer welke dagen van de week open zijn en welke tijdsloten
          beschikbaar zijn per dag.
        </p>
        <Link href={`/${tenantSlug}/schedule`}>
          <Button variant="outline" size="sm">
            Weekschema Beheren
          </Button>
        </Link>
      </div>

      {timeSlots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">
              Nog geen tijdsloten aangemaakt.
            </p>
            <Link href={`/${tenantSlug}/time-slots/create`} className="mt-4">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nieuw Tijdslot
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Standaard Tijdsloten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tijd</TableHead>
                  <TableHead>Max Reserveringen</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {slot.slot_time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {slot.max_reservations}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/${tenantSlug}/time-slots/edit/${slot.id}`}
                        >
                          <Button variant="outline" size="sm">
                            <Pencil className="mr-1 h-3 w-3" />
                            Bewerken
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(slot.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Verwijderen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
