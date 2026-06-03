"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Clock, CheckCircle, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
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
import { useParams } from "next/navigation";

interface DashboardStats {
  todayTotal: number;
  pending: number;
  confirmed: number;
  todayGuests: number;
}

interface Reservation {
  id: string;
  guest_name: string;
  reservation_time: string;
  guests_count: number;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { tenant } = useTenant();
  const params = useParams();
  const tenantSlug = params.tenant as string;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        todayGuests: todayReservations.reduce(
          (sum, r) => sum + (r.guests_count || 0),
          0
        ),
      });

      setRecentReservations(allReservations.slice(0, 8));

      const last30 = allReservations.filter(
        (r) => new Date(r.created_at) >= thirtyDaysAgo
      );
      const byDate: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        byDate[format(d, "dd MMM", { locale: nl })] = 0;
      }
      last30.forEach((r) => {
        const key = format(new Date(r.created_at), "dd MMM", { locale: nl });
        if (key in byDate) byDate[key]++;
      });
      setChartData(
        Object.entries(byDate).map(([date, count]) => ({ date, count }))
      );

      const dayNames = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];
      const dayCounts = [0, 0, 0, 0, 0, 0, 0];
      allReservations.forEach((r) => {
        const day = new Date(r.reservation_time).getDay();
        dayCounts[day]++;
      });
      setDayOfWeekData(
        dayNames.map((name, i) => ({ day: name, count: dayCounts[i] }))
      );

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
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vandaag
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayTotal ?? 0}</div>
            <p className="text-xs text-muted-foreground">reserveringen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Afwachting</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending ?? 0}</div>
            <p className="text-xs text-muted-foreground">te bevestigen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bevestigd</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.confirmed ?? 0}</div>
            <p className="text-xs text-muted-foreground">totaal bevestigd</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasten Vandaag</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayGuests ?? 0}</div>
            <p className="text-xs text-muted-foreground">verwachte gasten</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reserveringen (30 dagen)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Drukste Dagen</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recente Reserveringen</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReservations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nog geen reserveringen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Gast</th>
                    <th className="text-left py-2 font-medium">Datum & Tijd</th>
                    <th className="text-left py-2 font-medium">Gasten</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReservations.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">
                        <Link
                          href={`/${tenantSlug}/reservations/${r.id}`}
                          className="font-medium hover:underline"
                        >
                          {r.guest_name}
                        </Link>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {format(new Date(r.reservation_time), "d MMM HH:mm", {
                          locale: nl,
                        })}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {r.guests_count}
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className={statusColor(r.status)}>
                          {statusLabel(r.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
