'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface TimeSlotTemplate {
  id: string;
  slot_time: string;
  max_reservations: number;
}

interface WeeklySchedule {
  id: string;
  day_of_week: number;
  is_enabled: boolean;
}

interface WeeklyScheduleWithSlots extends WeeklySchedule {
  slots: string[];
  slot_ids: string[];
}

export default function WeeklySchedule() {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleWithSlots[]>([]);
  const [timeSlotTemplates, setTimeSlotTemplates] = useState<TimeSlotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [dayEnabled, setDayEnabled] = useState(true);
  const router = useRouter();

  const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();

    // Fetch time slot templates
    const { data: templates, error: templatesError } = await supabase
      .from('time_slot_templates')
      .select('*')
      .order('slot_time', { ascending: true });

    if (templatesError) {
      console.error('Error fetching time slot templates:', templatesError);
      setLoading(false);
      return;
    }

    setTimeSlotTemplates(templates || []);

    // Fetch weekly schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('weekly_schedule')
      .select('*')
      .order('day_of_week', { ascending: true });

    if (schedulesError) {
      console.error('Error fetching weekly schedules:', schedulesError);
      setLoading(false);
      return;
    }

    // Fetch time slots for each schedule
    const schedulesWithSlots = await Promise.all(
      (schedules || []).map(async (schedule) => {
        const { data: slots, error: slotsError } = await supabase
          .from('weekly_schedule_time_slots')
          .select('time_slot_template_id, time_slot_templates(slot_time)')
          .eq('weekly_schedule_id', schedule.id);

        if (slotsError) {
          console.error('Error fetching time slots for schedule:', slotsError);
          return {
            ...schedule,
            slots: [],
            slot_ids: [],
          };
        }

        return {
          ...schedule,
          slots: slots?.map((s: any) => s.time_slot_templates.slot_time) || [],
          slot_ids: slots?.map((s: any) => s.time_slot_template_id) || [],
        };
      })
    );

    setWeeklySchedules(schedulesWithSlots);
    setLoading(false);
  }

  const handleEdit = (schedule: WeeklyScheduleWithSlots) => {
    setEditingDay(schedule.day_of_week);
    setSelectedSlots(schedule.slot_ids);
    setDayEnabled(schedule.is_enabled);
  };

  const handleSave = async (dayOfWeek: number) => {
    const supabase = createClient();

    // Find the schedule
    const schedule = weeklySchedules.find(s => s.day_of_week === dayOfWeek);
    if (!schedule) return;

    // Update is_enabled status
    const { error: updateError } = await supabase
      .from('weekly_schedule')
      .update({ is_enabled: dayEnabled })
      .eq('id', schedule.id);

    if (updateError) {
      console.error('Error updating weekly schedule:', updateError);
      return;
    }

    // Delete existing time slots
    const { error: deleteError } = await supabase
      .from('weekly_schedule_time_slots')
      .delete()
      .eq('weekly_schedule_id', schedule.id);

    if (deleteError) {
      console.error('Error deleting old time slots:', deleteError);
      return;
    }

    // Insert new time slots (only if enabled and slots selected)
    if (dayEnabled && selectedSlots.length > 0) {
      const slotsData = selectedSlots.map(slotId => ({
        weekly_schedule_id: schedule.id,
        time_slot_template_id: slotId,
      }));

      const { error: insertError } = await supabase
        .from('weekly_schedule_time_slots')
        .insert(slotsData);

      if (insertError) {
        console.error('Error inserting new time slots:', insertError);
        return;
      }
    }

    setEditingDay(null);
    setSelectedSlots([]);
    fetchData(); // Refresh data
  };

  const handleCancel = () => {
    setEditingDay(null);
    setSelectedSlots([]);
    setDayEnabled(true);
  };

  const handleSlotToggle = (slotId: string) => {
    setSelectedSlots(prev =>
      prev.includes(slotId)
        ? prev.filter(id => id !== slotId)
        : [...prev, slotId]
    );
  };

  if (loading) {
    return <div className="p-8">Laden...</div>;
  }

  return (
    <div className="max-w-full mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Standaard Weekschema</h1>
      <p className="mb-6 text-gray-600">
        Beheer de standaard openingstijden per dag van de week. Deze worden gebruikt tenzij er een afwijkende dag is ingesteld.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dag</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tijdsloten</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
            </tr>
          </thead>
          <tbody>
            {weeklySchedules.map((schedule) => (
              <tr key={schedule.day_of_week} className="hover:bg-gray-50 transition border-t">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {dayNames[schedule.day_of_week]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingDay === schedule.day_of_week ? (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={dayEnabled}
                        onChange={(e) => setDayEnabled(e.target.checked)}
                        className="mr-2"
                      />
                      <span>{dayEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</span>
                    </label>
                  ) : (
                    <span className={schedule.is_enabled ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {schedule.is_enabled ? 'Ingeschakeld' : 'Uitgeschakeld'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {editingDay === schedule.day_of_week ? (
                    <div className="grid grid-cols-2 gap-2 max-w-md">
                      {timeSlotTemplates.map((template) => (
                        <div key={template.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`slot-${schedule.day_of_week}-${template.id}`}
                            checked={selectedSlots.includes(template.id)}
                            onChange={() => handleSlotToggle(template.id)}
                            disabled={!dayEnabled}
                            className="mr-2"
                          />
                          <label
                            htmlFor={`slot-${schedule.day_of_week}-${template.id}`}
                            className={`text-sm ${!dayEnabled ? 'text-gray-400' : 'text-gray-700'}`}
                          >
                            {template.slot_time}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>
                      {schedule.is_enabled 
                        ? (schedule.slots.length > 0 
                            ? schedule.slots.join(', ') 
                            : 'Alle tijdsloten')
                        : '-'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingDay === schedule.day_of_week ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleSave(schedule.day_of_week)}
                        className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 transition"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600 transition"
                      >
                        Annuleren
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 transition"
                    >
                      Bewerken
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Hoe werkt het?</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Schakel een dag uit om deze standaard gesloten te houden</li>
          <li>Selecteer specifieke tijdsloten of laat leeg voor alle tijdsloten</li>
          <li>Afwijkende dagen (hieronder) overschrijven altijd het weekschema</li>
          <li>Een uitgeschakelde dag kan tijdelijk worden ingeschakeld met een afwijkende dag</li>
        </ul>
      </div>
    </div>
  );
}

