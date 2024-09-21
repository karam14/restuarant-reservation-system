import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function OPTIONS(req: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', 'https://athenesolijf.nl');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return new NextResponse(null, { headers, status: 204 });
}

export async function POST(req: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', 'https://athenesolijf.nl');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  const { date, block, name, phone, peopleCount, email } = await req.json();

  if (!date || !block || !name || !phone || !peopleCount || !email) {
    return new NextResponse(JSON.stringify({ error: 'All fields are required' }), {
      status: 400,
      headers,
    });
  }

  const reservationTime = new Date(`${date}T${block}:00`).toISOString();

  const supabase = createClient();

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
      headers,
    });
  }

  return new NextResponse(JSON.stringify({ message: 'Reservation successfully made' }), {
    status: 200,
    headers,
  });
}
