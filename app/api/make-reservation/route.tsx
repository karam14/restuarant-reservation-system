import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';
import { zonedTimeToUtc } from 'date-fns-tz';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ReservationEmail from '@/emails/ReservationEmail';
import { nl } from 'date-fns/locale';
import { format } from 'date-fns';

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

  const { date, block, name, phone, peopleCount, email, 'g-recaptcha-response': recaptchaToken } = await req.json();

  if (!date || !block || !name || !phone || !peopleCount || !email || !recaptchaToken) {
    return new NextResponse(JSON.stringify({ error: 'All fields are required' }), {
      status: 400,
      headers,
    });
  }

  // Convert the time from Amsterdam timezone to UTC before saving
  const amsterdamTime = new Date(`${date}T${block}:00`);
  const formatted = format(new Date(amsterdamTime), 'PPPp', { locale: nl });
  const reservationTime = zonedTimeToUtc(amsterdamTime, 'Europe/Amsterdam').toISOString();

  const supabase = createClient();

  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .insert([
      {
        guest_name: name,
        guest_phone: phone,
        guest_email: email,
        reservation_time: reservationTime,
        guests_count: peopleCount,
        status: 'pending',
      },
    ])
    .single();

  if (reservationError) {
    return new NextResponse(JSON.stringify({ error: 'Error making reservation', reservationError }), {
      status: 500,
      headers,
    });
  }

  // Send a response immediately after the reservation is made
  const response = new NextResponse(JSON.stringify({ message: 'Reservation successfully made' }), {
    status: 200,
    headers,
  });

  // Send emails asynchronously
  (async () => {
    // Send confirmation email to the guest
    const emailHtml = await render(
      <ReservationEmail
        guestName={name}
        reservationTime={formatted}
        status="in afwachting"
        emailAddress="info@athenesolijf.nl"
      />
    );

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: true, // True for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const guestMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Uw reservering bij Athenes Olijf is ontvangen',
      html: emailHtml,
    };

    try {
      await transporter.sendMail(guestMailOptions);
    } catch (error) {
      console.error('Fout bij het verzenden van de bevestigingsmail:', error);
    }

    // Send notification email to the restaurant
    const restaurantMailOptions = {
      from: process.env.EMAIL_USER,
      to: 'info@athenesolijf.nl',
      subject: 'Nieuwe reservering ontvangen',
      text: `Beste,

Er is een nieuwe reservering gemaakt door ${name}. 

Details:
- Datum en tijd: ${formatted}
- Aantal personen: ${peopleCount}
- Telefoonnummer: ${phone}
- E-mailadres: ${email}

U kunt de reservering bevestigen via de volgende link: https://restuarant-reservation-system.vercel.app/admin/reservations

Met vriendelijke groet,
Het reserveringssysteem`,
    };

    try {
      await transporter.sendMail(restaurantMailOptions);
    } catch (error) {
      console.error('Fout bij het verzenden van de notificatiemail aan het restaurant:', error);
    }
  })();

  return response;
}
