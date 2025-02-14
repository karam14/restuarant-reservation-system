'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import ReservationFilters from './_components/reservation-filters';
export default function Reservations() {
  interface Reservation {
    id: number;
    guest_name: string;
    guest_email: string;
    reservation_time: string;
    guests_count: number;
    status: string;
    created_at: string;
  }

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and Sorting States
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterReservationStartDate, setFilterReservationStartDate] = useState('');
  const [filterReservationEndDate, setFilterReservationEndDate] = useState('');
  const [filterCreationExactDate, setFilterCreationExactDate] = useState(''); // NEW exact filter
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const supabase = createClient();

    async function fetchReservations() {
      const { data, error } = await supabase.from('reservations').select('*');
      if (error) {
        console.error('Fout bij het ophalen van reserveringen:', error);
      } else {
        setReservations(data);
      }
      setLoading(false);
    }

    fetchReservations();
  }, []);

  const updateReservationStatus = (id: number, newStatus: string) => {
    setReservations((prevReservations) =>
      prevReservations.map((reservation) =>
        reservation.id === id ? { ...reservation, status: newStatus } : reservation
      )
    );
  };

  const handleConfirm = async (id: number) => {
    const supabase = createClient();
    const { data: reservation, error } = await supabase.from('reservations').select('*').eq('id', id).single();
  
    if (error) {
      console.error('Fout bij het ophalen van reservering:', error);
      return;
    }
  
    const { error: updateError } = await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', id);
  
    if (updateError) {
      console.error('Fout bij het bevestigen van reservering:', updateError);
    } else {
      updateReservationStatus(id, 'confirmed');

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reservation.guest_email,
          guestName: reservation.guest_name,
          reservationTime: format(new Date(reservation.reservation_time), 'PPPp', { locale: nl }),
          status: 'bevestigd',
          isConfirmation: true
        }),
      });
    }
  };

  const handleCancel = async (id: number) => {
    const supabase = createClient();
    const { data: reservation, error } = await supabase.from('reservations').select('*').eq('id', id).single();
  
    if (error) {
      console.error('Fout bij het ophalen van reservering:', error);
      return;
    }
  
    const { error: updateError } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
  
    if (updateError) {
      console.error('Fout bij het annuleren van reservering:', updateError);
    } else {
      updateReservationStatus(id, 'cancelled');

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reservation.guest_email,
          guestName: reservation.guest_name,
          reservationTime: format(new Date(reservation.reservation_time), 'PPPp', { locale: nl }),
          status: 'geannuleerd',
          isConfirmation: true
        }),
      });
    }
  };

  const filteredReservations = reservations
  .filter((reservation) => {
    if (filterStatus !== 'all' && reservation.status !== filterStatus) {
      return false;
    }
    if (searchQuery && !reservation.guest_name.toLowerCase().includes(searchQuery)) {
      return false;
    }
    if (filterDate && format(parseISO(reservation.reservation_time), 'yyyy-MM-dd') !== filterDate) {
      return false;
    }

    // Reserveringsdatum Range Filter
    if (filterReservationStartDate && filterReservationEndDate) {
      const resTime = new Date(reservation.reservation_time);
      const start = new Date(filterReservationStartDate);
      const end = new Date(filterReservationEndDate);
      end.setHours(23, 59, 59, 999); // Ensure end of the day is included

      if (!(resTime >= start && resTime <= end)) {
        return false;
      }
    }

    // Exact Creation Date Filter
    if (filterCreationExactDate && format(parseISO(reservation.created_at), 'yyyy-MM-dd') !== filterCreationExactDate) {
      return false;
    }

    // Aanmaakdatum Range Filter
    if (filterStartDate && filterEndDate) {
      const createdAt = new Date(reservation.created_at);
      const start = new Date(filterStartDate);
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999); // Ensure end of the day is included

      if (!(createdAt >= start && createdAt <= end)) {
        return false;
      }
    }

    return true;
  })
  .sort((a, b) => {
    return sortOrder === 'asc'
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  return (
    <div className="max-w-full mx-auto p-4 sm:p-6 lg:p-8">
      {/* Filters Section */}
      <ReservationFilters
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        filterReservationStartDate={filterReservationStartDate}
        setFilterReservationStartDate={setFilterReservationStartDate}
        filterReservationEndDate={filterReservationEndDate}
        setFilterReservationEndDate={setFilterReservationEndDate}
        filterCreationExactDate={filterCreationExactDate}
        setFilterCreationExactDate={setFilterCreationExactDate}
        filterStartDate={filterStartDate}
        setFilterStartDate={setFilterStartDate}
        filterEndDate={filterEndDate}
        setFilterEndDate={setFilterEndDate}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />
  
      <div className="flex justify-between items-center mb-6">
        <Link href="/admin/reservations/create" className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition">
          + Nieuwe Reservering
        </Link>
      </div>
  
      {/* Reservations Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gastnaam</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum en Tijd</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aantal Personen</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gemaakt Op</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
            </tr>
          </thead>
          <tbody>
            {filteredReservations.map((reservation) => (
              <tr key={reservation.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{reservation.guest_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {format(new Date(reservation.reservation_time), 'PPPp', { locale: nl })}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{reservation.guests_count}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      reservation.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : reservation.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {reservation.status === 'confirmed'
                      ? 'Bevestigd'
                      : reservation.status === 'cancelled'
                      ? 'Geannuleerd'
                      : 'In afwachting'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {format(new Date(reservation.created_at), 'PPPp', { locale: nl })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {reservation.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleConfirm(reservation.id)}
                          className="bg-emerald-500 text-white px-3 py-2 rounded-md hover:bg-emerald-600 transition"
                        >
                          Bevestigen
                        </button>
                        <button
                          onClick={() => handleCancel(reservation.id)}
                          className="bg-rose-500 text-white px-3 py-2 rounded-md hover:bg-rose-600 transition"
                        >
                          Annuleren
                        </button>
                      </>
                    )}
                    <Link
                      href={`/admin/reservations/${reservation.id}`}
                      className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition"
                    >
                      Bekijk Details
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  
}
