import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ReservationEmail from '@/emails/ReservationEmail';
import { createClient } from '@/utils/supabase/client';

function createTransporter(tenant: any) {
  if (tenant?.smtp_host && tenant?.smtp_user && tenant?.smtp_pass) {
    return nodemailer.createTransport({
      host: tenant.smtp_host,
      port: tenant.smtp_port || 587,
      secure: tenant.smtp_secure ?? true,
      auth: {
        user: tenant.smtp_user,
        pass: tenant.smtp_pass,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { to, guestName, reservationTime, status, isConfirmation, tenantId } = await req.json();

    let tenant = null;
    if (tenantId) {
      const supabase = createClient();
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      tenant = data;
    }

    const restaurantName = tenant?.name || 'Athenes Olijf';
    const emailAddress = tenant?.email || 'info@athenesolijf.nl';

    const emailHtml = await render(
      <ReservationEmail
        guestName={guestName}
        reservationTime={reservationTime}
        status={status}
        emailAddress={emailAddress}
        isConfirmation={isConfirmation}
        restaurantName={restaurantName}
        logoUrl={tenant?.logo_url || undefined}
        brandColor={tenant?.brand_color || undefined}
      />
    );

    const subject = isConfirmation
      ? `Uw reservering bij ${restaurantName} is ${status}`
      : `We hebben uw reservering bij ${restaurantName} ontvangen`;

    const transporter = createTransporter(tenant);
    const fromAddress = tenant?.smtp_user || process.env.EMAIL_USER;

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html: emailHtml,
    });

    return NextResponse.json({ message: 'E-mail succesvol verzonden' }, { status: 200 });
  } catch (error) {
    console.error('Fout bij het verzenden van e-mail:', error);
    return NextResponse.json({ message: 'Het verzenden van de e-mail is mislukt' }, { status: 500 });
  }
}
