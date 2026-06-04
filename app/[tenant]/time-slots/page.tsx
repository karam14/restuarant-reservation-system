"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TimeSlotTemplate {
  id: string;
  slot_time: string;
  max_reservations: number;
  tenant_id: string;
}

export default function TimeSlotsPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { t } = useTranslations();
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [timeSlots, setTimeSlots] = useState<TimeSlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TimeSlotTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        console.error("Error fetching time slots:", error);
        toast.error(t("timeSlots.toastLoadError"));
      } else {
        setTimeSlots(data || []);
      }
      setLoading(false);
    }

    fetchTimeSlots();
  }, [tenant]);

  const handleDelete = async (slot: TimeSlotTemplate) => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("time_slot_templates")
      .delete()
      .eq("id", slot.id)
      .eq("tenant_id", tenant!.id);

    if (error) {
      console.error("Error deleting time slot:", error);
      toast.error(t("timeSlots.toastDeleteError"));
    } else {
      setTimeSlots((prev) => prev.filter((s) => s.id !== slot.id));
      toast.success(t("timeSlots.toastDeleted"));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("timeSlots.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("timeSlots.subtitle")}</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/${tenantSlug}/time-slots/create`}>
            <Plus className="mr-2 h-4 w-4" />
            {t("timeSlots.newSlot")}
          </Link>
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <h2 className="text-lg font-semibold mb-1 text-emerald-900 dark:text-emerald-100">
            {t("timeSlots.scheduleTitle")}
          </h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
            {t("timeSlots.scheduleDesc")}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${tenantSlug}/schedule`}>{t("timeSlots.manageSchedule")}</Link>
          </Button>
        </div>
      </motion.div>

      {timeSlots.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">{t("timeSlots.noSlots")}</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href={`/${tenantSlug}/time-slots/create`}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("timeSlots.newSlot")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("timeSlots.standardSlots")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("timeSlots.time")}</TableHead>
                    <TableHead>{t("timeSlots.maxReservations")}</TableHead>
                    <TableHead className="text-right">{t("timeSlots.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {timeSlots.map((slot, i) => (
                      <motion.tr
                        key={slot.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {slot.slot_time}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{slot.max_reservations}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/${tenantSlug}/time-slots/edit/${slot.id}`}>
                                <Pencil className="mr-1 h-3 w-3" />
                                {t("timeSlots.edit")}
                              </Link>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteTarget(slot)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              {t("timeSlots.delete")}
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.delete")}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.slot_time}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
