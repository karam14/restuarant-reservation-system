"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTenant } from "@/lib/tenant-context";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Reservation {
  id: number;
  guest_name: string;
  guest_email: string;
  reservation_time: string;
  guests_count: number;
  status: string;
  created_at: string;
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

export default function ReservationsPage() {
  const { tenant } = useTenant();
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
        console.error("Fout bij het ophalen van reserveringen:", error);
      } else {
        setReservations(data ?? []);
      }
      setLoading(false);
    }

    fetchReservations();
  }, [tenant]);

  const updateReservationStatus = (id: number, newStatus: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const handleConfirm = async (id: number) => {
    const supabase = createClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant!.id)
      .single();

    if (error) {
      console.error("Fout bij het ophalen van reservering:", error);
      return;
    }

    const { error: updateError } = await supabase
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", id)
      .eq("tenant_id", tenant!.id);

    if (updateError) {
      console.error("Fout bij het bevestigen van reservering:", updateError);
    } else {
      updateReservationStatus(id, "confirmed");

      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: reservation.guest_email,
          guestName: reservation.guest_name,
          reservationTime: format(
            new Date(reservation.reservation_time),
            "PPPp",
            { locale: nl }
          ),
          status: "bevestigd",
          isConfirmation: true,
        }),
      });
    }
  };

  const handleCancel = async (id: number) => {
    const supabase = createClient();
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant!.id)
      .single();

    if (error) {
      console.error("Fout bij het ophalen van reservering:", error);
      return;
    }

    const { error: updateError } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("tenant_id", tenant!.id);

    if (updateError) {
      console.error("Fout bij het annuleren van reservering:", updateError);
    } else {
      updateReservationStatus(id, "cancelled");

      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: reservation.guest_email,
          guestName: reservation.guest_name,
          reservationTime: format(
            new Date(reservation.reservation_time),
            "PPPp",
            { locale: nl }
          ),
          status: "geannuleerd",
          isConfirmation: true,
        }),
      });
    }
  };

  const filteredReservations = reservations
    .filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (
        searchQuery &&
        !r.guest_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (
        filterDate &&
        format(parseISO(r.reservation_time), "yyyy-MM-dd") !== filterDate
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      return sortOrder === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reserveringen</h1>
        <Button asChild>
          <Link href={`/${tenantSlug}/reservations/create`}>
            + Nieuwe Reservering
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Zoek op naam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Alle statussen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="pending">In afwachting</SelectItem>
                <SelectItem value="confirmed">Bevestigd</SelectItem>
                <SelectItem value="cancelled">Geannuleerd</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-48"
            />
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Nieuwste eerst</SelectItem>
                <SelectItem value="asc">Oudste eerst</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gastnaam</TableHead>
                <TableHead>Datum & Tijd</TableHead>
                <TableHead>Gasten</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Geen reserveringen gevonden.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell className="font-medium">
                      {reservation.guest_name}
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(reservation.reservation_time),
                        "d MMM yyyy HH:mm",
                        { locale: nl }
                      )}
                    </TableCell>
                    <TableCell>{reservation.guests_count}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColor(reservation.status)}
                      >
                        {statusLabel(reservation.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {reservation.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-accent border-accent/30 hover:bg-accent/10"
                              onClick={() => handleConfirm(reservation.id)}
                            >
                              Bevestigen
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => handleCancel(reservation.id)}
                            >
                              Annuleren
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/${tenantSlug}/reservations/${reservation.id}`}
                          >
                            Bekijk
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
