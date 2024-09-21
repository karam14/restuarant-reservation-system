import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';
import { zonedTimeToUtc } from 'date-fns-tz';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ReservationEmail from '@/emails/ReservationEmail';

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

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

  // Verify reCAPTCHA token
  const recaptchaResponse = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
  });

  const recaptchaData = await recaptchaResponse.json();

  if (!recaptchaData.success || recaptchaData.score < 0.5) {
    return new NextResponse(JSON.stringify({ error: 'CAPTCHA verification failed' }), {
      status: 400,
      headers,
    });
  }

  // Convert the time from Amsterdam timezone to UTC before saving
  const amsterdamTime = new Date(`${date}T${block}:00`);
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

  // Send confirmation email to the guest
  const emailHtml = await render(
    <ReservationEmail
      guestName={name}
      reservationTime={reservationTime}
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

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Uw reservering bij Athenes Olijf is ontvangen',
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Fout bij het verzenden van de bevestigingsmail:', error);
  }

  return new NextResponse(JSON.stringify({ message: 'Reservation successfully made and confirmation email sent' }), {
    status: 200,
    headers,
  });
}
