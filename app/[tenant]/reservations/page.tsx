"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { nl, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
  Eye,
  Plus,
  Search,
  CalendarIcon,
  Users,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Clock,
  Loader2,
} from "lucide-react";

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

type SortField = "reservation_time" | "guest_name" | "guests_count" | "created_at";
type SortDirection = "asc" | "desc";
type DatePreset = "all" | "today" | "week" | "month" | "custom";
type DateFilterTarget = "reservation" | "creation";

const STATUS_KEYS = ["pending", "confirmed", "cancelled"] as const;

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

function sendStatusEmail(reservation: Reservation, status: string, dateFnsLocale: Locale) {
  return fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: reservation.guest_email,
      guestName: reservation.guest_name,
      reservationTime: format(new Date(reservation.reservation_time), "PPPp", { locale: dateFnsLocale }),
      status,
      isConfirmation: true,
    }),
  });
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.03 } },
};

export default function ReservationsPage() {
  const { tenant } = useTenant();
  const { t, locale } = useTranslations();
  const dateFnsLocale = locale === "nl" ? nl : enUS;
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateFilterTarget, setDateFilterTarget] = useState<DateFilterTarget>("reservation");
  const [sortField, setSortField] = useState<SortField>("reservation_time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    const supabase = createClient();

    async function fetchReservations() {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reservations:", error);
        toast.error(t("reservations.toastLoadError"));
      } else {
        setReservations(data ?? []);
      }
      setLoading(false);
    }

    fetchReservations();
  }, [tenant]);

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
      return false;
    }

    setReservations((prev) =>
      prev.map((r) => (r.id === reservation.id ? { ...r, status: newStatus } : r))
    );

    try {
      await sendStatusEmail(reservation, statusEmailMap[newStatus], dateFnsLocale);
    } catch {
      toast.error(t("reservations.toastEmailError"));
      return true;
    }

    const toastKeyMap: Record<string, string> = {
      confirmed: "reservations.toastConfirmed",
      cancelled: "reservations.toastCancelled",
      pending: "reservations.toastRestored",
    };
    toast.success(t(toastKeyMap[newStatus], { name: reservation.guest_name }));
    return true;
  };

  const deleteReservation = async (reservation: Reservation) => {
    setActionLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservation.id)
      .eq("tenant_id", tenant!.id);

    if (error) {
      toast.error(t("reservations.toastDeleteError"));
      setActionLoading(false);
      return;
    }

    setReservations((prev) => prev.filter((r) => r.id !== reservation.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(reservation.id);
      return next;
    });
    setDeleteTarget(null);
    setActionLoading(false);
    toast.success(t("reservations.toastDeleted", { name: reservation.guest_name }));
  };

  const handleBulkAction = async (action: string) => {
    setActionLoading(true);
    const selected = reservations.filter((r) => selectedIds.has(r.id));

    if (action === "delete") {
      const supabase = createClient();
      const { error } = await supabase
        .from("reservations")
        .delete()
        .in("id", Array.from(selectedIds))
        .eq("tenant_id", tenant!.id);

      if (error) {
        toast.error(t("reservations.toastDeleteError"));
      } else {
        setReservations((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        toast.success(t("reservations.toastBulkDeleted", { count: selected.length }));
      }
    } else {
      let failed = 0;
      for (const r of selected) {
        const ok = await updateStatus(r, action);
        if (!ok) failed++;
      }
      if (failed > 0) {
        toast.error(t("reservations.toastBulkError", { count: failed }));
      }
    }

    setSelectedIds(new Set());
    setBulkAction(null);
    setActionLoading(false);
  };

  const getDateRange = (): { from: Date; to: Date } | null => {
    const now = new Date();
    switch (datePreset) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "week":
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "custom":
        if (dateFrom && dateTo) return { from: startOfDay(new Date(dateFrom)), to: endOfDay(new Date(dateTo)) };
        if (dateFrom) return { from: startOfDay(new Date(dateFrom)), to: endOfDay(new Date("2099-12-31")) };
        if (dateTo) return { from: startOfDay(new Date("2000-01-01")), to: endOfDay(new Date(dateTo)) };
        return null;
      default:
        return null;
    }
  };

  const filteredReservations = useMemo(() => {
    const dateRange = getDateRange();

    return reservations
      .filter((r) => {
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (
            !r.guest_name.toLowerCase().includes(q) &&
            !r.guest_email.toLowerCase().includes(q) &&
            !(r.guest_phone && r.guest_phone.includes(q))
          )
            return false;
        }
        if (dateRange) {
          const dateField = dateFilterTarget === "creation" ? r.created_at : r.reservation_time;
          const d = parseISO(dateField);
          if (!isWithinInterval(d, { start: dateRange.from, end: dateRange.to })) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "guest_name":
            cmp = a.guest_name.localeCompare(b.guest_name);
            break;
          case "guests_count":
            cmp = a.guests_count - b.guests_count;
            break;
          case "created_at":
            cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          default:
            cmp = new Date(a.reservation_time).getTime() - new Date(b.reservation_time).getTime();
        }
        return sortDirection === "asc" ? cmp : -cmp;
      });
  }, [reservations, statusFilter, searchQuery, datePreset, dateFrom, dateTo, dateFilterTarget, sortField, sortDirection]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: reservations.length, pending: 0, confirmed: 0, cancelled: 0 };
    reservations.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [reservations]);

  const allVisibleSelected =
    filteredReservations.length > 0 && filteredReservations.every((r) => selectedIds.has(r.id));

  const toggleAll = () => {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredReservations.map((r) => r.id)));
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("reservations.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("reservations.subtitle", {
              filtered: filteredReservations.length,
              total: reservations.length,
            })}
          </p>
        </div>
        <Button asChild>
          <Link href={`/${tenantSlug}/reservations/create`}>
            <Plus className="h-4 w-4 mr-2" />
            {t("reservations.newReservation")}
          </Link>
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v);
          setSelectedIds(new Set());
        }}
      >
        <TabsList>
          <TabsTrigger value="all">
            {t("reservations.all")}
            <Badge variant="secondary" className="ml-2 text-xs">
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          {STATUS_KEYS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {t(`reservations.${s}`)}
              <Badge variant="secondary" className="ml-2 text-xs">
                {statusCounts[s]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <motion.div className="flex flex-wrap items-end gap-3" {...fadeIn}>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("reservations.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={dateFilterTarget}
          onValueChange={(v) => setDateFilterTarget(v as DateFilterTarget)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reservation">
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5" /> {t("reservations.reservationDate")}
              </span>
            </SelectItem>
            <SelectItem value="creation">
              <span className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> {t("reservations.creationDate")}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={datePreset}
          onValueChange={(v) => {
            setDatePreset(v as DatePreset);
            if (v !== "custom") {
              setDateFrom("");
              setDateTo("");
            }
          }}
        >
          <SelectTrigger className="w-44">
            <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("reservations.allDates")}</SelectItem>
            <SelectItem value="today">{t("reservations.today")}</SelectItem>
            <SelectItem value="week">{t("reservations.thisWeek")}</SelectItem>
            <SelectItem value="month">{t("reservations.thisMonth")}</SelectItem>
            <SelectItem value="custom">{t("reservations.customRange")}</SelectItem>
          </SelectContent>
        </Select>

        <AnimatePresence>
          {datePreset === "custom" && (
            <motion.div
              className="flex items-center gap-2"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
              <span className="text-muted-foreground text-sm whitespace-nowrap">{t("reservations.through")}</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div {...fadeIn}>
            <Card>
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">
                  {selectedIds.size} {t("reservations.selected")}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-accent border-accent/30" onClick={() => setBulkAction("confirmed")}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t("reservations.confirm")}
                  </Button>
                  <Button size="sm" variant="outline" className="text-warning border-warning/30" onClick={() => setBulkAction("pending")}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> {t("reservations.restore")}
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setBulkAction("cancelled")}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> {t("reservations.cancel")}
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => setBulkAction("delete")}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("reservations.delete")}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds(new Set())}>
                  {t("reservations.deselect")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                </TableHead>
                <TableHead>
                  <SortHeader field="guest_name">{t("reservations.guest")}</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader field="reservation_time">{t("reservations.dateTime")}</SortHeader>
                </TableHead>
                <TableHead>
                  <SortHeader field="guests_count">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    {t("reservations.guests")}
                  </SortHeader>
                </TableHead>
                <TableHead>{t("reservations.status")}</TableHead>
                <TableHead>
                  <SortHeader field="created_at">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {t("reservations.createdAt")}
                  </SortHeader>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    {t("reservations.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredReservations.map((reservation, i) => (
                    <motion.tr
                      key={reservation.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: i < 20 ? i * 0.02 : 0 }}
                      className={`border-b transition-colors hover:bg-muted/50 ${selectedIds.has(reservation.id) ? "bg-muted/50" : ""}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(reservation.id)}
                          onCheckedChange={() => toggleOne(reservation.id)}
                          aria-label={`Select ${reservation.guest_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <Link
                            href={`/${tenantSlug}/reservations/${reservation.id}`}
                            className="font-medium hover:underline"
                          >
                            {reservation.guest_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{reservation.guest_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(new Date(reservation.reservation_time), "d MMM yyyy", { locale: dateFnsLocale })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(reservation.reservation_time), "HH:mm")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{reservation.guests_count}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(reservation.status)}>
                          {t(`reservations.${reservation.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(reservation.created_at), "d MMM yyyy", { locale: dateFnsLocale })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(reservation.created_at), "HH:mm")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/${tenantSlug}/reservations/${reservation.id}`}>
                                <Eye className="h-4 w-4 mr-2" /> {t("reservations.view")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {reservation.status !== "confirmed" && (
                              <DropdownMenuItem onClick={() => updateStatus(reservation, "confirmed")}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> {t("reservations.confirm")}
                              </DropdownMenuItem>
                            )}
                            {reservation.status !== "pending" && (
                              <DropdownMenuItem onClick={() => updateStatus(reservation, "pending")}>
                                <RotateCcw className="h-4 w-4 mr-2" /> {t("reservations.restore")}
                              </DropdownMenuItem>
                            )}
                            {reservation.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => updateStatus(reservation, "cancelled")}>
                                <XCircle className="h-4 w-4 mr-2" /> {t("reservations.cancel")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(reservation)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> {t("reservations.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reservations.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {deleteTarget &&
                t("reservations.deleteConfirmDesc", {
                  name: deleteTarget.guest_name,
                  date: format(new Date(deleteTarget.reservation_time), "d MMM yyyy HH:mm", { locale: dateFnsLocale }),
                })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteReservation(deleteTarget)}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionLoading ? t("reservations.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={!!bulkAction} onOpenChange={(open) => { if (!open) setBulkAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === "delete"
                ? t("reservations.bulkDeleteTitle", { count: selectedIds.size })
                : bulkAction === "confirmed"
                  ? t("reservations.bulkConfirmTitle", { count: selectedIds.size })
                  : bulkAction === "cancelled"
                    ? t("reservations.bulkCancelTitle", { count: selectedIds.size })
                    : t("reservations.bulkRestoreTitle", { count: selectedIds.size })}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === "delete"
                ? t("reservations.bulkDeleteDesc")
                : t("reservations.bulkUpdateDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)} disabled={actionLoading}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={bulkAction === "delete" || bulkAction === "cancelled" ? "destructive" : "default"}
              onClick={() => bulkAction && handleBulkAction(bulkAction)}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionLoading ? t("reservations.processing") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
