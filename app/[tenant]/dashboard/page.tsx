"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarCheck, Clock, CheckCircle, Users, CheckCircle2,
  XCircle, RotateCcw, Trash2, MoreHorizontal,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl, enUS } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { ActionButton } from "@/components/action-button";

interface DashboardStats {
  todayTotal: number;
  pending: number;
  confirmed: number;
  todayGuests: number;
}

interface Reservation {
  id: string;
  guest_name: string;
  guest_email: string;
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

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { tenant } = useTenant();
  const { t, locale } = useTranslations();
  const dateFnsLocale = locale === "nl" ? nl : enUS;
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const statusEmailMap: Record<string, string> = {
    confirmed: "bevestigd",
    cancelled: "geannuleerd",
    pending: "in afwachting",
  };

  const updateStatus = async (reservation: Reservation, newStatus: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("reservations")
      .update({ status: newStatus })
      .eq("id", reservation.id)
      .eq("tenant_id", tenant!.id);

    if (error) {
      toast.error(t("reservations.toastStatusError"));
      return;
    }

    setRecentReservations((prev) =>
      prev.map((r) => (r.id === reservation.id ? { ...r, status: newStatus } : r))
    );

    if (stats) {
      const oldStatus = reservation.status;
      setStats({
        ...stats,
        pending: stats.pending + (newStatus === "pending" ? 1 : 0) - (oldStatus === "pending" ? 1 : 0),
        confirmed: stats.confirmed + (newStatus === "confirmed" ? 1 : 0) - (oldStatus === "confirmed" ? 1 : 0),
      });
    }

    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: reservation.guest_email,
          guestName: reservation.guest_name,
          reservationTime: format(new Date(reservation.reservation_time), "PPPp", { locale: dateFnsLocale }),
          status: statusEmailMap[newStatus],
          isConfirmation: true,
        }),
      });
    } catch {
      toast.error(t("reservations.toastEmailError"));
      return;
    }

    const toastKeyMap: Record<string, string> = {
      confirmed: "reservations.toastConfirmed",
      cancelled: "reservations.toastCancelled",
      pending: "reservations.toastRestored",
    };
    toast.success(t(toastKeyMap[newStatus], { name: reservation.guest_name }));
  };

  useEffect(() => {
    if (!tenant) return;

    const supabase = createClient();
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    async function fetchData() {
      const { data: allReservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });

      if (!allReservations) {
        setLoading(false);
        return;
      }

      const todayReservations = allReservations.filter((r) =>
        r.reservation_time.startsWith(todayStr)
      );

      setStats({
        todayTotal: todayReservations.length,
        pending: allReservations.filter((r) => r.status === "pending").length,
        confirmed: allReservations.filter((r) => r.status === "confirmed").length,
        todayGuests: todayReservations.reduce((sum, r) => sum + (r.guests_count || 0), 0),
      });

      setRecentReservations(allReservations.slice(0, 8));

      const last30 = allReservations.filter((r) => new Date(r.created_at) >= thirtyDaysAgo);
      const byDate: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        byDate[format(d, "dd MMM", { locale: dateFnsLocale })] = 0;
      }
      last30.forEach((r) => {
        const key = format(new Date(r.created_at), "dd MMM", { locale: dateFnsLocale });
        if (key in byDate) byDate[key]++;
      });
      setChartData(Object.entries(byDate).map(([date, count]) => ({ date, count })));

      const dayNames = locale === "nl"
        ? ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayCounts = [0, 0, 0, 0, 0, 0, 0];
      allReservations.forEach((r) => {
        const day = new Date(r.reservation_time).getDay();
        dayCounts[day]++;
      });
      setDayOfWeekData(dayNames.map((name, i) => ({ day: name, count: dayCounts[i] })));

      setLoading(false);
    }

    fetchData();
  }, [tenant]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
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
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.title")}</h1>

      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.08 }}
      >
        {[
          { title: t("dashboard.today"), value: stats?.todayTotal ?? 0, sub: t("dashboard.reservations"), icon: CalendarCheck, iconClass: "text-muted-foreground" },
          { title: t("dashboard.pending"), value: stats?.pending ?? 0, sub: t("dashboard.toConfirm"), icon: Clock, iconClass: "text-warning" },
          { title: t("dashboard.confirmed"), value: stats?.confirmed ?? 0, sub: t("dashboard.totalConfirmed"), icon: CheckCircle, iconClass: "text-accent" },
          { title: t("dashboard.guestsToday"), value: stats?.todayGuests ?? 0, sub: t("dashboard.expectedGuests"), icon: Users, iconClass: "text-primary" },
        ].map((card) => (
          <motion.div key={card.title} variants={cardVariants} transition={{ duration: 0.3 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className={`h-4 w-4 ${card.iconClass}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="grid gap-4 md:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.last30Days")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.busiestDays")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.recentReservations")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReservations.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("dashboard.noReservations")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">{t("dashboard.guest")}</th>
                      <th className="text-left py-2 font-medium">{t("dashboard.dateTime")}</th>
                      <th className="text-left py-2 font-medium">{t("dashboard.guests")}</th>
                      <th className="text-left py-2 font-medium">{t("dashboard.status")}</th>
                      <th className="text-right py-2 font-medium">{t("reservations.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReservations.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("button, [data-radix-collection-item]")) return;
                          router.push(`/${tenantSlug}/reservations/${r.id}`);
                        }}
                      >
                        <td className="py-2">
                          <span className="font-medium">{r.guest_name}</span>
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {format(new Date(r.reservation_time), "d MMM HH:mm", { locale: dateFnsLocale })}
                        </td>
                        <td className="py-2 text-muted-foreground">{r.guests_count}</td>
                        <td className="py-2">
                          <Badge variant="outline" className={getStatusColor(r.status)}>
                            {t(`reservations.${r.status}`)}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end items-center gap-1">
                            {r.status === "pending" && (
                              <>
                                <ActionButton
                                  tooltip={t("reservations.confirm")}
                                  onClick={() => updateStatus(r, "confirmed")}
                                  className="text-accent hover:text-accent hover:bg-accent/10"
                                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                />
                                <ActionButton
                                  tooltip={t("reservations.cancel")}
                                  onClick={() => updateStatus(r, "cancelled")}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  icon={<XCircle className="h-3.5 w-3.5" />}
                                />
                              </>
                            )}
                            <DropdownMenu>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent><p>{t("reservations.moreActions")}</p></TooltipContent>
                              </UITooltip>
                              <DropdownMenuContent align="end">
                                {r.status !== "pending" && r.status !== "confirmed" && (
                                  <DropdownMenuItem onClick={() => updateStatus(r, "confirmed")}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> {t("reservations.confirm")}
                                  </DropdownMenuItem>
                                )}
                                {r.status === "confirmed" && (
                                  <DropdownMenuItem onClick={() => updateStatus(r, "cancelled")}>
                                    <XCircle className="h-4 w-4 mr-2" /> {t("reservations.cancel")}
                                  </DropdownMenuItem>
                                )}
                                {r.status !== "pending" && (
                                  <DropdownMenuItem onClick={() => updateStatus(r, "pending")}>
                                    <RotateCcw className="h-4 w-4 mr-2" /> {t("reservations.restore")}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
