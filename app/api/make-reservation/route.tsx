import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function POST(req: NextRequest) {
  const { date, block, name, phone, peopleCount, email } = await req.json();

  if (!date || !block || !name || !phone || !peopleCount || !email) {
    return new NextResponse(JSON.stringify({ error: 'All fields are required' }), {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
      },
    });
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
    return new NextResponse(JSON.stringify({ error: 'Error making reservation' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
      },
    });
  }

  return new NextResponse(JSON.stringify({ message: 'Reservation successfully made' }), {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://athenesolijf.nl',
    },
  });
}
