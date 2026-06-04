"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import { useTranslations } from "@/lib/use-translations";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, startOfDay, endOfDay } from "date-fns";
import { nl, enUS } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker, getDefaultPresets } from "@/components/date-range-picker";
import { ActionButton } from "@/components/action-button";
import {
  MoreHorizontal, CheckCircle2, XCircle, RotateCcw, Trash2,
  Plus, Search, Users, ArrowUpDown, ChevronUp, ChevronDown,
  Clock, Loader2,
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
type DateFilterTarget = "reservation" | "creation";

const PAGE_SIZE = 25;
const STATUS_KEYS = ["pending", "confirmed", "cancelled"] as const;

function getStatusColor(status: string) {
  switch (status) {
    case "confirmed": return "bg-accent/10 text-accent border-accent/20";
    case "cancelled": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-warning/10 text-warning border-warning/20";
  }
}

function sendStatusEmail(reservation: Reservation, status: string, dateFnsLocale: Locale, tenantId?: string) {
  return fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: reservation.guest_email,
      guestName: reservation.guest_name,
      reservationTime: format(new Date(reservation.reservation_time), "PPPp", { locale: dateFnsLocale }),
      status,
      isConfirmation: true,
      tenantId,
    }),
  });
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

export default function ReservationsPage() {
  const { tenant } = useTenant();
  const { t, locale } = useTranslations();
  const dateFnsLocale = locale === "nl" ? nl : enUS;
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({ all: 0, pending: 0, confirmed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateFilterTarget, setDateFilterTarget] = useState<DateFilterTarget>("reservation");
  const [sortField, setSortField] = useState<SortField>("reservation_time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Reservation | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const datePresets = useMemo(() => getDefaultPresets(t), [t]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const dateColumn = dateFilterTarget === "creation" ? "created_at" : "reservation_time";

  function applyDateFilter(query: any) {
    if (dateRange?.from) {
      query = query.gte(dateColumn, startOfDay(dateRange.from).toISOString());
    }
    if (dateRange?.to) {
      query = query.lte(dateColumn, endOfDay(dateRange.to).toISOString());
    } else if (dateRange?.from) {
      query = query.lte(dateColumn, endOfDay(dateRange.from).toISOString());
    }
    return query;
  }

  // Fetch status counts (lightweight — just id + status with date filter)
  const fetchCounts = useCallback(async () => {
    if (!tenant) return;
    const supabase = createClient();
    let query = supabase.from("reservations").select("status").eq("tenant_id", tenant.id);
    query = applyDateFilter(query);
    const { data } = await query;

    const counts: Record<string, number> = { all: 0, pending: 0, confirmed: 0, cancelled: 0 };
    (data ?? []).forEach((r: { status: string }) => {
      counts.all++;
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    setStatusCounts(counts);
  }, [tenant, dateRange, dateFilterTarget]);

  // Fetch a page of reservations
  const fetchPage = useCallback(async (page: number, reset: boolean) => {
    if (!tenant) return;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const supabase = createClient();
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("reservations")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order(sortField, { ascending: sortDirection === "asc" })
      .range(from, to);

    query = applyDateFilter(query);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (debouncedSearch) {
      const pattern = `%${debouncedSearch}%`;
      query = query.or(`guest_name.ilike.${pattern},guest_email.ilike.${pattern},guest_phone.ilike.${pattern}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reservations:", error);
      toast.error(t("reservations.toastLoadError"));
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const rows = data ?? [];
    setHasMore(rows.length === PAGE_SIZE);

    if (reset) {
      setReservations(rows);
    } else {
      setReservations((prev) => [...prev, ...rows]);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [tenant, statusFilter, debouncedSearch, dateRange, dateFilterTarget, sortField, sortDirection]);

  // Reset and refetch when filters change
  useEffect(() => {
    pageRef.current = 0;
    setSelectedIds(new Set());
    fetchCounts();
    fetchPage(0, true);
  }, [tenant, statusFilter, debouncedSearch, dateRange, dateFilterTarget, sortField, sortDirection]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          pageRef.current += 1;
          fetchPage(pageRef.current, false);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, fetchPage]);

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

    // Update counts locally
    setStatusCounts((prev) => {
      const next = { ...prev };
      next[reservation.status] = Math.max(0, (next[reservation.status] || 0) - 1);
      next[newStatus] = (next[newStatus] || 0) + 1;
      return next;
    });

    try {
      await sendStatusEmail(reservation, statusEmailMap[newStatus], dateFnsLocale, tenant?.id);
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

    setDeleteTarget(null);
    setActionLoading(false);

    requestAnimationFrame(() => {
      setReservations((prev) => prev.filter((r) => r.id !== reservation.id));
      setStatusCounts((prev) => {
        const next = { ...prev };
        next.all = Math.max(0, next.all - 1);
        next[reservation.status] = Math.max(0, (next[reservation.status] || 0) - 1);
        return next;
      });
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(reservation.id); return next; });
      document.body.style.pointerEvents = "";
      toast.success(t("reservations.toastDeleted", { name: reservation.guest_name }));
    });
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
        setStatusCounts((prev) => {
          const next = { ...prev };
          selected.forEach((r) => {
            next.all = Math.max(0, next.all - 1);
            next[r.status] = Math.max(0, (next[r.status] || 0) - 1);
          });
          return next;
        });
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

  const allVisibleSelected =
    reservations.length > 0 && reservations.every((r) => selectedIds.has(r.id));

  const toggleAll = () => {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(reservations.map((r) => r.id)));
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
    else { setSortField(field); setSortDirection("desc"); }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  if (loading && reservations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-32 mt-2" /></div>
          <Skeleton className="h-10 w-44" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="flex gap-3"><Skeleton className="h-10 w-64" /><Skeleton className="h-10 w-44" /></div>
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
              filtered: statusFilter === "all" ? statusCounts.all : statusCounts[statusFilter] || 0,
              total: statusCounts.all,
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
      <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}>
        <TabsList>
          <TabsTrigger value="all">
            {t("reservations.all")}
            <Badge variant="secondary" className="ml-2 text-xs">{statusCounts.all}</Badge>
          </TabsTrigger>
          {STATUS_KEYS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {t(`reservations.${s}`)}
              <Badge variant="secondary" className="ml-2 text-xs">{statusCounts[s]}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <motion.div className="flex flex-wrap items-center gap-3" {...fadeIn}>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("reservations.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          presets={datePresets}
          dateFnsLocale={dateFnsLocale}
          labels={{
            filterByHeader: t("dateRange.filterByHeader"),
            quickSelectHeader: t("dateRange.quickSelectHeader"),
            clearFilter: t("dateRange.clearFilter"),
          }}
          placeholder={t("reservations.allDates")}
          triggerClassName="w-auto min-w-[200px]"
          secondaryOptions={[
            { label: t("reservations.reservationDate"), value: "reservation", active: dateFilterTarget === "reservation", onClick: () => setDateFilterTarget("reservation") },
            { label: t("reservations.creationDate"), value: "creation", active: dateFilterTarget === "creation", onClick: () => setDateFilterTarget("creation") },
          ]}
        />
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div {...fadeIn}>
            <Card>
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium">{selectedIds.size} {t("reservations.selected")}</span>
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
                <TableHead><SortHeader field="guest_name">{t("reservations.guest")}</SortHeader></TableHead>
                <TableHead><SortHeader field="reservation_time">{t("reservations.dateTime")}</SortHeader></TableHead>
                <TableHead><SortHeader field="guests_count"><Users className="h-3.5 w-3.5 mr-1" />{t("reservations.guests")}</SortHeader></TableHead>
                <TableHead>{t("reservations.status")}</TableHead>
                <TableHead><SortHeader field="created_at"><Clock className="h-3.5 w-3.5 mr-1" />{t("reservations.createdAt")}</SortHeader></TableHead>
                <TableHead className="text-right">{t("reservations.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    {t("reservations.noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence mode="popLayout">
                  {reservations.map((reservation, i) => (
                    <motion.tr
                      key={reservation.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: i < PAGE_SIZE ? i * 0.02 : 0 }}
                      className={`border-b transition-colors hover:bg-muted/50 cursor-pointer ${selectedIds.has(reservation.id) ? "bg-muted/50" : ""}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button, [role=checkbox], a, [data-radix-collection-item]")) return;
                        router.push(`/${tenantSlug}/reservations/${reservation.id}`);
                      }}
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
                          <span className="font-medium">{reservation.guest_name}</span>
                          <p className="text-xs text-muted-foreground">{reservation.guest_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{format(new Date(reservation.reservation_time), "d MMM yyyy", { locale: dateFnsLocale })}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(reservation.reservation_time), "HH:mm")}</p>
                        </div>
                      </TableCell>
                      <TableCell>{reservation.guests_count}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(reservation.status)}>
                          {t(`reservations.${reservation.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">{format(new Date(reservation.created_at), "d MMM yyyy", { locale: dateFnsLocale })}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(reservation.created_at), "HH:mm")}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          {reservation.status === "pending" && (
                            <>
                              <ActionButton
                                tooltip={t("reservations.confirm")}
                                onClick={() => updateStatus(reservation, "confirmed")}
                                className="text-accent hover:text-accent hover:bg-accent/10"
                                icon={<CheckCircle2 className="h-4 w-4" />}
                              />
                              <ActionButton
                                tooltip={t("reservations.cancel")}
                                onClick={() => updateStatus(reservation, "cancelled")}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                icon={<XCircle className="h-4 w-4" />}
                              />
                            </>
                          )}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={t("reservations.moreActions")}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {reservation.status === "confirmed" && (
                                <DropdownMenuItem onClick={() => updateStatus(reservation, "cancelled")}>
                                  <XCircle className="h-4 w-4 mr-2" /> {t("reservations.cancel")}
                                </DropdownMenuItem>
                              )}
                              {reservation.status === "cancelled" && (
                                <DropdownMenuItem onClick={() => updateStatus(reservation, "confirmed")}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> {t("reservations.confirm")}
                                </DropdownMenuItem>
                              )}
                              {reservation.status !== "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => updateStatus(reservation, "pending")}>
                                    <RotateCcw className="h-4 w-4 mr-2" /> {t("reservations.restore")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(reservation)}>
                                <Trash2 className="h-4 w-4 mr-2" /> {t("reservations.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!hasMore && reservations.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-3">
              {t("reservations.subtitle", { filtered: reservations.length, total: statusCounts.all })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); requestAnimationFrame(() => { document.body.style.pointerEvents = ""; }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reservations.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {deleteTarget && t("reservations.deleteConfirmDesc", {
                name: deleteTarget.guest_name,
                date: format(new Date(deleteTarget.reservation_time), "d MMM yyyy HH:mm", { locale: dateFnsLocale }),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteReservation(deleteTarget)} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionLoading ? t("reservations.deleting") : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={!!bulkAction} onOpenChange={(open) => { if (!open) { setBulkAction(null); requestAnimationFrame(() => { document.body.style.pointerEvents = ""; }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === "delete" ? t("reservations.bulkDeleteTitle", { count: selectedIds.size })
                : bulkAction === "confirmed" ? t("reservations.bulkConfirmTitle", { count: selectedIds.size })
                : bulkAction === "cancelled" ? t("reservations.bulkCancelTitle", { count: selectedIds.size })
                : t("reservations.bulkRestoreTitle", { count: selectedIds.size })}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === "delete" ? t("reservations.bulkDeleteDesc") : t("reservations.bulkUpdateDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)} disabled={actionLoading}>{t("common.cancel")}</Button>
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
