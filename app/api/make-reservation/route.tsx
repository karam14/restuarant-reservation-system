import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function POST(req: NextRequest) {
  const { date, block, name, phone, peopleCount, email } = await req.json();

  if (!date || !block || !name || !phone || !peopleCount || !email) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  // Combine the date and block time to create the reservation_time
  const reservationTime = new Date(`${date}T${block}:00`).toISOString();

  const supabase = createClient();

  // Create the reservation
  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .insert([
      {
        guest_name: name,
        guest_phone: phone,
        guest_email: email,
        reservation_time: reservationTime,
        status: 'pending',
      },
    ])
    .single();

  if (reservationError) {
    return NextResponse.json({ error: 'Error making reservation' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Reservation successfully made' });
}
