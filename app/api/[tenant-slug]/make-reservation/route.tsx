import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/client';
import { zonedTimeToUtc } from 'date-fns-tz';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ReservationEmail from '@/emails/ReservationEmail';

async function resolveTenant(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

function corsHeaders(domain: string | null) {
  const origin = domain ? `https://${domain}` : '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS(
  req: NextRequest,
  { params }: { params: Promise<{ 'tenant-slug': string }> }
) {
  const { 'tenant-slug': tenantSlug } = await params;
  const tenant = await resolveTenant(tenantSlug);
  const headers = new Headers(corsHeaders(tenant?.domain ?? null));
  return new NextResponse(null, { headers, status: 204 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ 'tenant-slug': string }> }
) {
  const { 'tenant-slug': tenantSlug } = await params;
  const tenant = await resolveTenant(tenantSlug);

  if (!tenant) {
    return new NextResponse(JSON.stringify({ error: 'Tenant not found' }), {
      status: 404,
    });
  }

  const headers = new Headers(corsHeaders(tenant.domain));

  const { date, block, name, phone, peopleCount, email, 'g-recaptcha-response': recaptchaToken } = await req.json();

  if (!date || !block || !name || !phone || !peopleCount || !email || !recaptchaToken) {
    return new NextResponse(JSON.stringify({ error: 'All fields are required' }), {
      status: 400,
      headers,
    });
  }

  const supabase = createClient();

  // VALIDATE DAY/TIME AVAILABILITY BEFORE ACCEPTING RESERVATION
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();

  // Check if this specific day exists and is disabled
  const { data: dayData, error: dayError } = await supabase
    .from('days')
    .select('id, is_enabled')
    .eq('day_date', date)
    .eq('tenant_id', tenant.id)
    .single();

  if (dayError && dayError.code !== 'PGRST116') {
    return new NextResponse(JSON.stringify({ error: 'Error checking day availability' }), {
      status: 500,
      headers,
    });
  }

  // If specific day exists and is explicitly disabled
  if (dayData && dayData.is_enabled === false) {
    return new NextResponse(JSON.stringify({ error: 'Deze dag is niet beschikbaar voor reserveringen' }), {
      status: 400,
      headers,
    });
  }

  // If no specific day override, check weekly schedule
  if (!dayData || dayData.is_enabled === null) {
    const { data: weeklySchedule, error: weeklyScheduleError } = await supabase
      .from('weekly_schedule')
      .select('id, is_enabled')
      .eq('day_of_week', dayOfWeek)
      .eq('tenant_id', tenant.id)
      .single();

    if (weeklyScheduleError && weeklyScheduleError.code !== 'PGRST116') {
      return new NextResponse(JSON.stringify({ error: 'Error checking weekly schedule' }), {
        status: 500,
        headers,
      });
    }

    // If weekly schedule exists and day is disabled
    if (weeklySchedule && !weeklySchedule.is_enabled) {
      return new NextResponse(JSON.stringify({ error: 'Deze dag is niet beschikbaar voor reserveringen' }), {
        status: 400,
        headers,
      });
    }
  }

  // Validate that the requested time slot is available for this day
  let availableTimeSlots: string[] = [];

  if (dayData) {
    const { data: customSlots, error: customSlotsError } = await supabase
      .from('day_time_slots')
      .select('time_slot_templates(slot_time)')
      .eq('day_id', dayData.id);

    if (!customSlotsError && customSlots && customSlots.length > 0) {
      availableTimeSlots = customSlots.map((slot: any) => slot.time_slot_templates.slot_time);
    }
  }

  // If no custom slots and day is enabled, check weekly schedule
  if (availableTimeSlots.length === 0 && (!dayData || dayData.is_enabled !== false)) {
    const { data: weeklySchedule } = await supabase
      .from('weekly_schedule')
      .select('id, is_enabled')
      .eq('day_of_week', dayOfWeek)
      .eq('tenant_id', tenant.id)
      .single();

    if (weeklySchedule && weeklySchedule.is_enabled) {
      const { data: weeklySlots } = await supabase
        .from('weekly_schedule_time_slots')
        .select('time_slot_templates(slot_time)')
        .eq('weekly_schedule_id', weeklySchedule.id);

      if (weeklySlots && weeklySlots.length > 0) {
        availableTimeSlots = weeklySlots.map((slot: any) => slot.time_slot_templates.slot_time);
      }
    }
  }

  // If still no slots, get all standard slots (backward compatibility)
  if (availableTimeSlots.length === 0) {
    const { data: standardSlots } = await supabase
      .from('time_slot_templates')
      .select('slot_time');

    if (standardSlots) {
      availableTimeSlots = standardSlots.map((slot: any) => slot.slot_time);
    }
  }

  // Validate the requested time slot is in the available list
  const normalizeTime = (time: string) => time.substring(0, 5);
  const normalizedBlock = normalizeTime(block);
  const normalizedAvailableSlots = availableTimeSlots.map(slot => normalizeTime(slot));

  if (availableTimeSlots.length > 0 && !normalizedAvailableSlots.includes(normalizedBlock)) {
    return new NextResponse(JSON.stringify({ error: 'Dit tijdslot is niet beschikbaar voor de geselecteerde datum' }), {
      status: 400,
      headers,
    });
  }

  // Convert the time from Amsterdam timezone to UTC before saving
  const amsterdamTime = new Date(`${date}T${block}:00`);
  const formatted = format(new Date(amsterdamTime), 'PPPp', { locale: nl });
  const reservationTime = zonedTimeToUtc(amsterdamTime, 'Europe/Amsterdam').toISOString();

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
        tenant_id: tenant.id,
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
    const emailHtml = await render(
      <ReservationEmail
        guestName={name}
        reservationTime={formatted}
        status="in afwachting"
        emailAddress={tenant.email || ''}
      />
    );

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const guestMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Uw reservering bij ${tenant.name} is ontvangen`,
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
      to: tenant.email,
      subject: 'Nieuwe reservering ontvangen',
      text: `Beste,

Er is een nieuwe reservering gemaakt door ${name}.

Details:
- Datum en tijd: ${formatted}
- Aantal personen: ${peopleCount}
- Telefoonnummer: ${phone}
- E-mailadres: ${email}

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
