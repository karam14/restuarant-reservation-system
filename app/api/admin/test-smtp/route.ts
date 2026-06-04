import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } =
    await req.json();

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json(
      { error: "SMTP-instellingen zijn verplicht" },
      { status: 400 }
    );
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || 587,
      secure: smtpSecure ?? true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.verify();
    return NextResponse.json({ message: "SMTP-verbinding succesvol" });
  } catch (err: any) {
    return NextResponse.json(
      { error: `SMTP-verbinding mislukt: ${err.message}` },
      { status: 400 }
    );
  }
}
