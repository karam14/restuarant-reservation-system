'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export default function ReservationDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [reservation, setReservation] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [guestsCount, setGuestsCount] = useState(1); // Add state for guests_count
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [overrideValidation, setOverrideValidation] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function fetchReservation() {
      if (id) {
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Fout bij het ophalen van reservering:', error);
        } else {
          setReservation(data);
          setGuestName(data.guest_name);
          setGuestEmail(data.guest_email);
          setGuestPhone(data.guest_phone);
          setGuestsCount(data.guests_count); // Set guests_count

          // Convert UTC time from database to local time
          const localTime = utcToZonedTime(data.reservation_time, 'Europe/Amsterdam');
          const formattedTime = format(localTime, "yyyy-MM-dd'T'HH:mm");

          setReservationTime(formattedTime);
          setStatus(data.status);
        }
        setLoading(false);
      }
    }

    fetchReservation();
  }, [id]);

  const handleUpdate = async () => {
    setError('');
    setWarning('');
    const supabase = createClient();

    // Extract date and time for validation
    const dateTime = new Date(reservationTime);
    const date = format(dateTime, 'yyyy-MM-dd');
    const time = format(dateTime, 'HH:mm');
    const dayOfWeek = dateTime.getDay();

    // VALIDATE DAY/TIME AVAILABILITY (unless admin overrides)
    if (!overrideValidation) {
      // Check if this specific day exists and is disabled
      const { data: dayData, error: dayError } = await supabase
        .from('days')
        .select('id, is_enabled')
        .eq('day_date', date)
        .single();

      if (dayError && dayError.code !== 'PGRST116') {
        setError('Fout bij het controleren van dagbeschikbaarheid');
        return;
      }

      // If specific day exists and is explicitly disabled
      if (dayData && dayData.is_enabled === false) {
        setWarning('Deze dag is uitgeschakeld. Weet u zeker dat u deze wijziging wilt opslaan?');
        return;
      }

      // If no specific day override, check weekly schedule
      if (!dayData || dayData.is_enabled === null) {
        const { data: weeklySchedule, error: weeklyScheduleError } = await supabase
          .from('weekly_schedule')
          .select('id, is_enabled')
          .eq('day_of_week', dayOfWeek)
          .single();

        if (weeklyScheduleError && weeklyScheduleError.code !== 'PGRST116') {
          setError('Fout bij het controleren van weekschema');
          return;
        }

        // If weekly schedule exists and day is disabled
        if (weeklySchedule && !weeklySchedule.is_enabled) {
          setWarning('Deze dag is uitgeschakeld in het weekschema. Weet u zeker dat u deze wijziging wilt opslaan?');
          return;
        }
      }

      // Validate that the requested time slot is available for this day
      let availableTimeSlots: string[] = [];

      if (dayData) {
        const { data: customSlots } = await supabase
          .from('day_time_slots')
          .select('time_slot_templates(slot_time)')
          .eq('day_id', dayData.id);

        if (customSlots && customSlots.length > 0) {
          availableTimeSlots = customSlots.map((slot: any) => slot.time_slot_templates.slot_time);
        }
      }

      if (availableTimeSlots.length === 0 && (!dayData || dayData.is_enabled !== false)) {
        const { data: weeklySchedule } = await supabase
          .from('weekly_schedule')
          .select('id, is_enabled')
          .eq('day_of_week', dayOfWeek)
          .single();

        if (weeklySchedule && weeklySchedule.is_enabled) {
          const { data: weeklySlots } = await supabase
            .from('weekly_schedule_time_slots')
            .select('time_slot_templates(slot_time)')
            .eq('weekly_schedule_id', weeklySchedule.id);

          if (weeklySlots && weeklySlots.length > 0) {
            availableTimeSlots = weeklySlots.map((slot: any) => slot.time_slot_templates.slot_time);
          }
        }
      }

      if (availableTimeSlots.length === 0) {
        const { data: standardSlots } = await supabase
          .from('time_slot_templates')
          .select('slot_time');

        if (standardSlots) {
          availableTimeSlots = standardSlots.map((slot: any) => slot.slot_time);
        }
      }

      // Normalize time formats for comparison (handle both HH:MM and HH:MM:SS)
      const normalizeTime = (timeStr: string) => timeStr.substring(0, 5);
      const normalizedTime = normalizeTime(time);
      const normalizedAvailableSlots = availableTimeSlots.map(slot => normalizeTime(slot));
      
      if (availableTimeSlots.length > 0 && !normalizedAvailableSlots.includes(normalizedTime)) {
        setWarning(`Dit tijdslot (${time}) is niet beschikbaar voor ${date}. Beschikbare tijdsloten: ${availableTimeSlots.map(s => normalizeTime(s)).join(', ')}. Wilt u toch doorgaan?`);
        return;
      }
    }

    // Convert local time back to UTC before saving
    const utcTime = zonedTimeToUtc(reservationTime, 'Europe/Amsterdam');

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        reservation_time: utcTime.toISOString(), // Convert to UTC before saving
        guests_count: guestsCount, // Include guests_count in update
        status,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Fout bij het bijwerken van reservering:', updateError);
      setError('Fout bij het opslaan: ' + updateError.message);
    } else {
      let emailStatus = '';
      if (status === 'confirmed') {
        emailStatus = 'bevestigd';
      } else if (status === 'cancelled') {
        emailStatus = 'geannuleerd';
      }

      if (emailStatus) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: guestEmail,
            guestName,
            reservationTime: format(utcToZonedTime(utcTime, 'Europe/Amsterdam'), 'PPPp', { locale: nl }), // Format for email
            status: emailStatus,
            isConfirmation: true,
          }),
        });
      }

      router.back();
    }
  };

  const handleDelete = async () => {
    const supabase = createClient();

    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Fout bij het ophalen van reservering:', fetchError);
      return;
    }

    if (reservation) {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: reservation.guest_email,
          guestName: reservation.guest_name,
          reservationTime: format(utcToZonedTime(reservation.reservation_time, 'Europe/Amsterdam'), 'PPPp', { locale: nl }),
          status: 'geannuleerd',
          isConfirmation: true,
        }),
      });
    }

    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Fout bij het verwijderen van reservering:', deleteError);
    } else {
      router.back();
    }
  };

  const handleOverride = () => {
    setOverrideValidation(true);
    setWarning('');
    // Call handleUpdate directly
    setTimeout(() => {
      handleUpdate();
    }, 100);
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  if (!reservation) {
    return <div className="p-8">Reservering niet gevonden.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Reservering Details</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 font-semibold">❌ Fout</p>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {warning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 font-semibold">⚠️ Waarschuwing</p>
          <p className="text-yellow-700 mb-3">{warning}</p>
          <button
            type="button"
            onClick={handleOverride}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition"
          >
            Toch Doorgaan (Admin Override)
          </button>
        </div>
      )}
      <div className="border border-gray-300 p-6 rounded-lg shadow-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Gastnaam</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">E-mailadres</label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Telefoonnummer</label>
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Reserveringstijd</label>
          <input
            type="datetime-local"
            value={reservationTime}
            onChange={(e) => {
              setReservationTime(e.target.value);
              setOverrideValidation(false);
              setWarning('');
              setError('');
            }}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Aantal gasten</label>
          <input
            type="number"
            value={guestsCount}
            onChange={(e) => setGuestsCount(parseInt(e.target.value))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="pending">In afwachting</option>
            <option value="confirmed">Bevestigd</option>
            <option value="cancelled">Geannuleerd</option>
          </select>
        </div>
      </div>

      <div className="mt-8 flex space-x-4">
        <button
          onClick={handleUpdate}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Bijwerken
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
        >
          Verwijderen
        </button>
        <button
          onClick={handleBack}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Terug
        </button>
      </div>
    </div>
  );
}
