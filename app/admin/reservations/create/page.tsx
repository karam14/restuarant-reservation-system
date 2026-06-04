'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { zonedTimeToUtc } from 'date-fns-tz';
import { format } from 'date-fns';

export default function CreateReservation() {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [overrideValidation, setOverrideValidation] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWarning('');

    const supabase = createClient();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('domain', 'athenesolijf.nl')
      .single();

    if (!tenant) {
      setError('Tenant niet gevonden');
      setLoading(false);
      return;
    }

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
        .eq('tenant_id', tenant.id)
        .single();

      if (dayError && dayError.code !== 'PGRST116') {
        setError('Fout bij het controleren van dagbeschikbaarheid');
        setLoading(false);
        return;
      }

      // If specific day exists and is explicitly disabled
      if (dayData && dayData.is_enabled === false) {
        setWarning('Deze dag is uitgeschakeld. Weet u zeker dat u een reservering wilt maken?');
        setLoading(false);
        return;
      }

      // If no specific day override, check weekly schedule
      if (!dayData || dayData.is_enabled === null) {
        const { data: weeklySchedule, error: weeklyScheduleError } = await supabase
          .from('weekly_schedule')
          .select('id, is_enabled')
          .eq('day_of_week', dayOfWeek)
          .eq('tenant_id', tenant.id)
          .single();

        if (weeklyScheduleError && weeklyScheduleError.code !== 'PGRST116') {
          setError('Fout bij het controleren van weekschema');
          setLoading(false);
          return;
        }

        // If weekly schedule exists and day is disabled
        if (weeklySchedule && !weeklySchedule.is_enabled) {
          setWarning('Deze dag is uitgeschakeld in het weekschema. Weet u zeker dat u een reservering wilt maken?');
          setLoading(false);
          return;
        }
      }

      // Validate that the requested time slot is available for this day
      let availableTimeSlots: string[] = [];

      if (dayData) {
        // Check custom time slots for this specific day
        const { data: customSlots } = await supabase
          .from('day_time_slots')
          .select('time_slot_templates(slot_time)')
          .eq('day_id', dayData.id);

        if (customSlots && customSlots.length > 0) {
          availableTimeSlots = customSlots.map((slot: any) => slot.time_slot_templates.slot_time);
        }
      }

      // If no custom slots and day is enabled, check weekly schedule
      if (availableTimeSlots.length === 0 && (!dayData || dayData.is_enabled !== false)) {
        const { data: weeklySchedule } = await supabase
          .from('weekly_schedule')
          .select('id, is_enabled')
          .eq('day_of_week', dayOfWeek)
          .eq('tenant_id', tenant.id)
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

      // If still no slots, get all standard slots (backward compatibility)
      if (availableTimeSlots.length === 0) {
        const { data: standardSlots } = await supabase
          .from('time_slot_templates')
          .select('slot_time');

        if (standardSlots) {
          availableTimeSlots = standardSlots.map((slot: any) => slot.slot_time);
        }
      }

      // Validate the requested time slot is in the available list
      // Normalize time formats for comparison (handle both HH:MM and HH:MM:SS)
      const normalizeTime = (timeStr: string) => timeStr.substring(0, 5);
      const normalizedTime = normalizeTime(time);
      const normalizedAvailableSlots = availableTimeSlots.map(slot => normalizeTime(slot));
      
      if (availableTimeSlots.length > 0 && !normalizedAvailableSlots.includes(normalizedTime)) {
        setWarning(`Dit tijdslot (${time}) is niet beschikbaar voor ${date}. Beschikbare tijdsloten: ${availableTimeSlots.map(s => normalizeTime(s)).join(', ')}. Wilt u toch doorgaan?`);
        setLoading(false);
        return;
      }
    }

    // Convert the local reservation time to UTC
    const utcReservationTime = zonedTimeToUtc(reservationTime, 'Europe/Amsterdam').toISOString();

    const { data, error: insertError } = await supabase.from('reservations').insert([
      {
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        reservation_time: utcReservationTime,
        status: 'pending',
        tenant_id: tenant.id,
      },
    ]);

    setLoading(false);

    if (insertError) {
      console.error('Fout bij het maken van reservering:', insertError);
      setError('Fout bij het opslaan van de reservering: ' + insertError.message);
    } else {
      router.push('/admin/reservations');
    }
  };

  const handleOverride = () => {
    setOverrideValidation(true);
    setWarning('');
    // Automatically resubmit
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Nieuwe Reservering Maken</h1>
      
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Gastnaam</label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">E-mailadres</label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Telefoonnummer</label>
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            required
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
              setOverrideValidation(false); // Reset override when time changes
              setWarning('');
              setError('');
            }}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Het systeem controleert automatisch of deze dag/tijd beschikbaar is volgens het weekschema en afwijkende dagen.
          </p>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className={`inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition ${loading ? 'opacity-50' : ''}`}
          >
            {loading ? 'Bezig met opslaan...' : 'Reservering Maken'}
          </button>
        </div>
      </form>
    </div>
  );
}
