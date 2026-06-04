"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Save, Pencil, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

interface TimeSlotTemplate {
  id: string;
  slot_time: string;
  max_reservations: number;
}

interface WeeklySchedule {
  id: string;
  day_of_week: number;
  is_enabled: boolean;
  tenant_id: string;
}

interface WeeklyScheduleWithSlots extends WeeklySchedule {
  slots: string[];
  slot_ids: string[];
}

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function SchedulePage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const { t } = useTranslations();
  const params = useParams();

  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleWithSlots[]>([]);
  const [timeSlotTemplates, setTimeSlotTemplates] = useState<TimeSlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [dayEnabled, setDayEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    fetchData();
  }, [tenant]);

  async function fetchData() {
    if (!tenant) return;

    const supabase = createClient();

    const { data: templates, error: templatesError } = await supabase
      .from("time_slot_templates")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("slot_time", { ascending: true });

    if (templatesError) {
      toast.error(t("schedule.toastLoadSlotsError"));
      setLoading(false);
      return;
    }

    setTimeSlotTemplates(templates || []);

    const { data: schedules, error: schedulesError } = await supabase
      .from("weekly_schedule")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("day_of_week", { ascending: true });

    if (schedulesError) {
      toast.error(t("schedule.toastLoadError"));
      setLoading(false);
      return;
    }

    const schedulesWithSlots = await Promise.all(
      (schedules || []).map(async (schedule) => {
        const { data: slots } = await supabase
          .from("weekly_schedule_time_slots")
          .select("time_slot_template_id, time_slot_templates(slot_time)")
          .eq("weekly_schedule_id", schedule.id);

        return {
          ...schedule,
          slots: slots?.map((s: any) => s.time_slot_templates.slot_time) || [],
          slot_ids: slots?.map((s: any) => s.time_slot_template_id) || [],
        };
      })
    );

    setWeeklySchedules(schedulesWithSlots);
    setLoading(false);
  }

  const getDayName = (dayOfWeek: number) => t(`schedule.days.${dayOfWeek}`);

  const handleEdit = (schedule: WeeklyScheduleWithSlots) => {
    setEditingDay(schedule.day_of_week);
    setSelectedSlots([...schedule.slot_ids]);
    setDayEnabled(schedule.is_enabled);
  };

  const handleSave = async (dayOfWeek: number) => {
    if (!tenant) return;

    const supabase = createClient();
    const schedule = weeklySchedules.find((s) => s.day_of_week === dayOfWeek);
    if (!schedule) return;

    setSaving(true);

    const { error: updateError } = await supabase
      .from("weekly_schedule")
      .update({ is_enabled: dayEnabled })
      .eq("id", schedule.id)
      .eq("tenant_id", tenant.id);

    if (updateError) {
      toast.error(t("schedule.toastUpdateError"));
      setSaving(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("weekly_schedule_time_slots")
      .delete()
      .eq("weekly_schedule_id", schedule.id);

    if (deleteError) {
      toast.error(t("schedule.toastSlotsError"));
      setSaving(false);
      return;
    }

    if (dayEnabled && selectedSlots.length > 0) {
      const slotsData = selectedSlots.map((slotId) => ({
        weekly_schedule_id: schedule.id,
        time_slot_template_id: slotId,
      }));

      const { error: insertError } = await supabase
        .from("weekly_schedule_time_slots")
        .insert(slotsData);

      if (insertError) {
        toast.error(t("schedule.toastAssignError"));
        setSaving(false);
        return;
      }
    }

    toast.success(t("schedule.toastUpdated", { day: getDayName(dayOfWeek) }));
    setEditingDay(null);
    setSelectedSlots([]);
    setSaving(false);
    fetchData();
  };

  const handleCancel = () => {
    setEditingDay(null);
    setSelectedSlots([]);
    setDayEnabled(true);
  };

  const handleSlotToggle = (slotId: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const handleToggleEnabled = async (schedule: WeeklyScheduleWithSlots) => {
    if (!tenant) return;

    const supabase = createClient();
    const newEnabled = !schedule.is_enabled;

    const { error } = await supabase
      .from("weekly_schedule")
      .update({ is_enabled: newEnabled })
      .eq("id", schedule.id)
      .eq("tenant_id", tenant.id);

    if (error) {
      toast.error(t("schedule.toastToggleError"));
    } else {
      toast.success(
        t("schedule.toastToggled", {
          day: getDayName(schedule.day_of_week),
          status: newEnabled ? t("schedule.enabled").toLowerCase() : t("schedule.disabled").toLowerCase(),
        })
      );
      fetchData();
    }
  };

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const orderedSchedules = [
    ...weeklySchedules.filter((s) => s.day_of_week >= 1),
    ...weeklySchedules.filter((s) => s.day_of_week === 0),
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("schedule.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("schedule.subtitle")}</p>
      </div>

      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.05 }}
      >
        {orderedSchedules.map((schedule) => {
          const isEditing = editingDay === schedule.day_of_week;

          return (
            <motion.div key={schedule.day_of_week} variants={cardVariants} transition={{ duration: 0.3 }}>
              <Card className={!schedule.is_enabled && !isEditing ? "opacity-60" : undefined}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{getDayName(schedule.day_of_week)}</CardTitle>
                    {!isEditing && (
                      <button
                        onClick={() => handleToggleEnabled(schedule)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          schedule.is_enabled ? "bg-primary" : "bg-muted"
                        }`}
                        role="switch"
                        aria-checked={schedule.is_enabled}
                        aria-label={`${getDayName(schedule.day_of_week)} toggle`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                            schedule.is_enabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  <Badge variant={schedule.is_enabled ? "default" : "secondary"} className="w-fit">
                    {schedule.is_enabled ? t("schedule.open") : t("schedule.closed")}
                  </Badge>
                </CardHeader>
                <Separator />
                <CardContent className="pt-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          id={`enabled-${schedule.day_of_week}`}
                          checked={dayEnabled}
                          onCheckedChange={(checked) => setDayEnabled(checked === true)}
                        />
                        <label htmlFor={`enabled-${schedule.day_of_week}`} className="text-sm font-medium">
                          {t("schedule.enabled")}
                        </label>
                      </div>

                      {dayEnabled && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">{t("schedule.timeSlots")}</p>
                          {timeSlotTemplates.length === 0 ? (
                            <p className="text-xs text-muted-foreground">{t("schedule.noSlotsAvailable")}</p>
                          ) : (
                            <div className="space-y-1.5">
                              {timeSlotTemplates.map((template) => (
                                <div key={template.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`slot-${schedule.day_of_week}-${template.id}`}
                                    checked={selectedSlots.includes(template.id)}
                                    onCheckedChange={() => handleSlotToggle(template.id)}
                                  />
                                  <label htmlFor={`slot-${schedule.day_of_week}-${template.id}`} className="text-sm">
                                    {template.slot_time}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => handleSave(schedule.day_of_week)} disabled={saving}>
                          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                          {saving ? t("common.saving") : t("common.save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {schedule.is_enabled ? (
                        schedule.slots.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {schedule.slots.map((slot, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {slot}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t("schedule.allSlots")}</p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">-</p>
                      )}
                      <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => handleEdit(schedule)}>
                        <Pencil className="mr-1 h-3 w-3" />
                        {t("timeSlots.edit")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">{t("schedule.howItWorks")}</h3>
            <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>{t("schedule.tip1")}</li>
              <li>{t("schedule.tip2")}</li>
              <li>{t("schedule.tip3")}</li>
              <li>{t("schedule.tip4")}</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
