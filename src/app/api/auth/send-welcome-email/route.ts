import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const { email, name, password } = await request.json();

    const mailOptions = {
      from: process.env.MAILTRAP_FROM_EMAIL,
      to: email,
      subject: 'Welcome to Our Platform',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Your account has been created successfully.</p>
        <p>You can now log in using your email and the provided password.</p>
        <p>Email: ${email}</p>
        <p>Password: ${password}</p>
        <p>Please change your password after your first login.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
} 