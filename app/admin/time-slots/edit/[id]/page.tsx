'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function EditTimeSlot() {
  const [slotTime, setSlotTime] = useState('');
  const [maxReservations, setMaxReservations] = useState('');
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const supabase = createClient();

    async function fetchTimeSlot() {
      const { data, error } = await supabase
        .from('time_slot_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Fout bij het ophalen van tijdslot:', error);
      } else {
        setSlotTime(data.slot_time);
        setMaxReservations(data.max_reservations);
      }
    }

    fetchTimeSlot();
  }, [id]);

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    const supabase = createClient();
    const { error } = await supabase.from('time_slot_templates').update({
      slot_time: slotTime,
      max_reservations: parseInt(maxReservations, 10),
    }).eq('id', id);

    if (error) {
      console.error('Fout bij het bijwerken van tijdslot:', error);
    } else {
      router.push('/admin/time-slots');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8">Tijdslot Bewerken</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Tijdslot</label>
          <input
            type="time"
            value={slotTime}
            onChange={(e) => setSlotTime(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Maximaal Aantal Reserveringen</label>
          <input
            type="number"
            value={maxReservations}
            onChange={(e) => setMaxReservations(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition"
        >
          Tijdslot Bijwerken
        </button>
      </form>
    </div>
  );
}
