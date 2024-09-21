'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function TimeSlots() {
    interface TimeSlotTemplate {
      id: number;
      slot_time: string;
      max_reservations: number;
    }
  
    interface DayTimeSlot {
      id: number;
      day_id: number;
      time_slot_template_id: number;
      days: {
        day_date: string;
        is_holiday: boolean;
      };
      time_slot_templates: {
        slot_time: string;
        max_reservations: number;
      };
    }
  

  const [timeSlotTemplates, setTimeSlotTemplates] = useState<TimeSlotTemplate[]>([]);
  const [dayTimeSlots, setDayTimeSlots] = useState<any[]>([]);
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
          days(day_date, is_holiday), 
          time_slot_templates(slot_time, max_reservations)
        `)
        .order('day_date', { foreignTable: 'days' });

      if (templateData.error || daySlotData.error) {
        console.error('Fout bij het ophalen van tijdsloten:', templateData.error || daySlotData.error);
      } else {
        setTimeSlotTemplates(templateData.data);
        setDayTimeSlots(daySlotData.data);
      }
      setLoading(false);
    }

    fetchTimeSlots();
  }, []);

  const handleDeleteTemplate = async (id: number) => {
    const supabase = createClient();
    const { error } = await supabase.from('time_slot_templates').delete().eq('id', id);
    if (error) {
      console.error('Fout bij het verwijderen van tijdslot:', error);
    } else {
      setTimeSlotTemplates((prev) => prev.filter((slot) => slot.id !== id));
    }
  };

  const handleDeleteDayTimeSlot = async (dayId: number) => {
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tijdsloten</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feestdag</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody>
              {dayTimeSlots.reduce((groupedSlots: { day_id: number; day_date: string; is_holiday: boolean; slots: string[] }[], slot) => {
                const day = groupedSlots.find((d) => d.day_id === slot.day_id);
                if (day) {
                  day.slots.push(slot.time_slot_templates.slot_time);
                } else {
                  groupedSlots.push({
                    day_id: slot.day_id,
                    day_date: slot.days.day_date,
                    is_holiday: slot.days.is_holiday,
                    slots: [slot.time_slot_templates.slot_time],
                  });
                }
                return groupedSlots;
              }, []).map((daySlot) => (
                <tr key={daySlot.day_id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {format(new Date(daySlot.day_date), 'PPP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {daySlot.slots.join(', ')}
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
