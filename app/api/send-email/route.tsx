import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ReservationEmail from '@/emails/ReservationEmail';

export async function POST(req: NextRequest) {
  try {
    const { to, guestName, reservationTime, status, isConfirmation } = await req.json();

    const emailHtml = await render(
      <ReservationEmail
        guestName={guestName}
        reservationTime={reservationTime}
        status={status}
        emailAddress="info@athenesolijf.nl"
        isConfirmation={isConfirmation} // Pass the flag to the component
      />
    );

    const subject = isConfirmation
      ? `Uw reservering bij Athenes Olijf is ${status}`
      : 'We hebben uw reservering bij Athenes Olijf ontvangen';

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: 'E-mail succesvol verzonden' }, { status: 200 });
  } catch (error) {
    console.error('Fout bij het verzenden van e-mail:', error);
    return NextResponse.json({ message: 'Het verzenden van de e-mail is mislukt' }, { status: 500 });
  }
}
