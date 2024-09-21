'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
export default function CreateReservation() {
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [reservationTime, setReservationTime] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
  
    const handleSubmit = async (e: { preventDefault: () => void; }) => {
      e.preventDefault();
      setLoading(true);
  
      const supabase = createClient();
  
      const { data, error } = await supabase.from('reservations').insert([
        {
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          reservation_time: reservationTime,
          status: 'pending',
        },
      ]);
  
      setLoading(false);
  
      if (error) {
        console.error('Fout bij het maken van reservering:', error);
      } else {
        router.push('/admin/reservations');
      }
    };
  
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Nieuwe Reservering Maken</h1>
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
              onChange={(e) => setReservationTime(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
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