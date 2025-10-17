'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function CreateDayTimeSlot() {
  const [dayDate, setDayDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  interface TimeSlotTemplate {
    id: string;
    slot_time: string;
    max_reservations: number;
  }

  const [timeSlotTemplates, setTimeSlotTemplates] = useState<TimeSlotTemplate[]>([]);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    async function fetchTimeSlotTemplates() {
      const { data, error } = await supabase.from('time_slot_templates').select('*').order('slot_time', { ascending: true });
      if (error) {
        console.error('Fout bij het ophalen van tijdslot-sjablonen:', error);
      } else {
        setTimeSlotTemplates(data);
      }
    }

    fetchTimeSlotTemplates();
  }, []);

  const handleSlotChange = (e: ChangeEvent<HTMLInputElement>, slotId: string) => {
    if (e.target.checked) {
      setSelectedSlots((prev) => [...prev, slotId]);
    } else {
      setSelectedSlots((prev) => prev.filter((id) => id !== slotId));
    }
  };

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    const supabase = createClient();

    // Create or fetch the specific day with is_enabled status
    const { data: dayData, error: dayError } = await supabase
      .from('days')
      .upsert({ day_date: dayDate, is_enabled: isEnabled }, { onConflict: 'day_date' })
      .select()
      .single();

    if (dayError) {
      console.error('Fout bij het aanmaken van dag:', dayError);
      return;
    }

    // Only insert time slots if the day is enabled and slots are selected
    if (isEnabled && selectedSlots.length > 0) {
      const slotsData = selectedSlots.map((slotId) => ({
        day_id: dayData.id,
        time_slot_template_id: slotId,
      }));

      const { error } = await supabase.from('day_time_slots').insert(slotsData);

      if (error) {
        console.error('Fout bij het aanmaken van dagtijdsloten:', error);
        return;
      }
    }

    router.push('/admin/time-slots');
  };

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8">Afwijkende Dag Aanmaken</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Datum</label>
          <input
            type="date"
            value={dayDate}
            onChange={(e) => setDayDate(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Dag ingeschakeld</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Uitschakelen om deze specifieke dag volledig te sluiten (geen reserveringen mogelijk)
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Tijdsloten</label>
          <p className="mt-1 mb-2 text-xs text-gray-500">
            Laat leeg voor alle standaard tijdsloten, of selecteer specifieke tijdsloten
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {timeSlotTemplates.map((template) => (
              <div key={template.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`slot-${template.id}`}
                  checked={selectedSlots.includes(template.id)}
                  onChange={(e) => handleSlotChange(e, template.id)}
                  disabled={!isEnabled}
                  className="mr-2"
                />
                <label 
                  htmlFor={`slot-${template.id}`} 
                  className={`text-sm ${!isEnabled ? 'text-gray-400' : 'text-gray-700'}`}
                >
                  {template.slot_time} - Max: {template.max_reservations} Reserveringen
                </label>
              </div>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition"
        >
          Afwijkende Dag Aanmaken
        </button>
      </form>
    </div>
  );
}
