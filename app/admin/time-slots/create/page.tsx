'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function CreateTimeSlot() {
  const [slotTime, setSlotTime] = useState('');
  const [maxReservations, setMaxReservations] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    const supabase = createClient();
    const { error } = await supabase.from('time_slot_templates').insert([
      {
        slot_time: slotTime,
        max_reservations: parseInt(maxReservations, 10),
      },
    ]);

    if (error) {
      console.error('Fout bij het aanmaken van tijdslot:', error);
    } else {
      router.push('/admin/time-slots');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8">Nieuw Tijdslot</h1>
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
          Tijdslot Aanmaken
        </button>
      </form>
    </div>
  );
}
