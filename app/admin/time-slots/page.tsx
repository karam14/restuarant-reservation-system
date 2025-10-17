'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function TimeSlots() {
    interface TimeSlotTemplate {
      id: string;
      slot_time: string;
      max_reservations: number;
    }
  
    interface DayTimeSlot {
      id: string;
      day_id: string;
      time_slot_template_id: string;
      days: {
        day_date: string;
        is_holiday: boolean;
        is_enabled: boolean;
      };
      time_slot_templates: {
        slot_time: string;
        max_reservations: number;
      };
    }
  

  const [timeSlotTemplates, setTimeSlotTemplates] = useState<TimeSlotTemplate[]>([]);
  const [dayTimeSlots, setDayTimeSlots] = useState<any[]>([]);
  const [allDays, setAllDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function fetchTimeSlots() {
      const templateData = await supabase
        .from('time_slot_templates')
        .select('*')
        .order('slot_time', { ascending: true });

      const daySlotData = await supabase
        .from('day_time_slots')
        .select(`
          id, 
          day_id, 
          time_slot_template_id, 
          days(day_date, is_holiday, is_enabled), 
          time_slot_templates(slot_time, max_reservations)
        `)
        .order('day_date', { foreignTable: 'days' });

      // Also fetch all days (including those without time slots)
      const allDaysData = await supabase
        .from('days')
        .select('*')
        .order('day_date', { ascending: true });

      if (templateData.error || daySlotData.error || allDaysData.error) {
        console.error('Fout bij het ophalen van tijdsloten:', templateData.error || daySlotData.error || allDaysData.error);
      } else {
        setTimeSlotTemplates(templateData.data);
        setDayTimeSlots(daySlotData.data);
        setAllDays(allDaysData.data);
      }
      setLoading(false);
    }

    fetchTimeSlots();
  }, []);

  const handleDeleteTemplate = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('time_slot_templates').delete().eq('id', id);
    if (error) {
      console.error('Fout bij het verwijderen van tijdslot:', error);
    } else {
      setTimeSlotTemplates((prev) => prev.filter((slot) => slot.id !== id));
    }
  };

  const handleDeleteDayTimeSlot = async (dayId: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('day_time_slots').delete().eq('day_id', dayId);
    if (error) {
      console.error('Fout bij het verwijderen van dagtijdsloten:', error);
    } else {
      setDayTimeSlots((prev) => prev.filter((slot) => slot.day_id !== dayId));
    }
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  return (
    <div className="max-w-full mx-auto p-4 sm:p-6 lg:p-8">
      {/* Weekly Schedule Link */}
      <div className="mb-8 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <h2 className="text-xl font-semibold mb-2 text-emerald-900">⚙️ Standaard Weekschema</h2>
        <p className="text-sm text-emerald-700 mb-3">
          Beheer welke dagen van de week standaard open zijn en welke tijdsloten beschikbaar zijn per dag.
        </p>
        <Link 
          href="/admin/weekly-schedule" 
          className="inline-block bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition"
        >
          Weekschema Beheren
        </Link>
      </div>

      {/* Standaard Tijdsloten */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Standaard Tijdsloten</h1>
        <Link href="/admin/time-slots/create" className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition">
          + Nieuw Tijdslot
        </Link>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tijdslot</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Reserveringen</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody>
              {timeSlotTemplates.map((slot) => (
                <tr key={slot.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {slot.slot_time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {slot.max_reservations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/admin/time-slots/edit/${slot.id}`} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition">
                        Bewerken
                      </Link>
                      <button
                        onClick={() => handleDeleteTemplate(slot.id)}
                        className="bg-rose-500 text-white px-3 py-2 rounded-md hover:bg-rose-600 transition"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Afwijkende Tijdsloten voor Specifieke Dagen */}
      <div>
        <h2 className="text-3xl font-bold mb-4">Afwijkende Tijdsloten voor Specifieke Dagen</h2>
        <Link href="/admin/time-slots/create-day-time-slot" className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition">
          + Nieuw Afwijkend Tijdslot
        </Link>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tijdsloten</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feestdag</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // First, group days with time slots
                const groupedSlots = dayTimeSlots.reduce((acc: { day_id: string; day_date: string; is_holiday: boolean; is_enabled: boolean; slots: string[] }[], slot) => {
                  const day = acc.find((d) => d.day_id === slot.day_id);
                  if (day) {
                    day.slots.push(slot.time_slot_templates.slot_time);
                  } else {
                    acc.push({
                      day_id: slot.day_id,
                      day_date: slot.days.day_date,
                      is_holiday: slot.days.is_holiday,
                      is_enabled: slot.days.is_enabled,
                      slots: [slot.time_slot_templates.slot_time],
                    });
                  }
                  return acc;
                }, []);

                // Add days without time slots (disabled days)
                allDays.forEach(day => {
                  if (!groupedSlots.find(gs => gs.day_id === day.id)) {
                    groupedSlots.push({
                      day_id: day.id,
                      day_date: day.day_date,
                      is_holiday: day.is_holiday,
                      is_enabled: day.is_enabled,
                      slots: [],
                    });
                  }
                });

                // Sort by date
                groupedSlots.sort((a, b) => new Date(a.day_date).getTime() - new Date(b.day_date).getTime());

                return groupedSlots;
              })().map((daySlot) => (
                <tr key={daySlot.day_id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {format(new Date(daySlot.day_date), 'PPP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={daySlot.is_enabled === false ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                      {daySlot.is_enabled === false ? 'Uitgeschakeld' : 'Ingeschakeld'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {daySlot.is_enabled === false ? '-' : (daySlot.slots.length > 0 ? daySlot.slots.join(', ') : 'Alle tijdsloten')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {daySlot.is_holiday ? 'Ja' : 'Nee'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/admin/time-slots/edit-day-time-slot/${daySlot.day_id}`} className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition">
                        Bewerken
                      </Link>
                      <button
                        onClick={() => handleDeleteDayTimeSlot(daySlot.day_id)}
                        className="bg-rose-500 text-white px-3 py-2 rounded-md hover:bg-rose-600 transition"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
