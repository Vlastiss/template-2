import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

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
    if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
      console.error('Mailtrap credentials not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const { email, verificationLink } = await request.json();

    if (!email || !verificationLink) {
      return NextResponse.json(
        { error: 'Email and verification link are required' },
        { status: 400 }
      );
    }

    const mailOptions = {
      from: process.env.MAILTRAP_FROM_EMAIL || 'noreply@yourdomain.com',
      to: email,
      subject: 'Welcome! Please Verify Your Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            .header {
              background-color: #4F46E5;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 20px;
              border-radius: 0 0 5px 5px;
              border: 1px solid #e5e7eb;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Platform!</h1>
            </div>
            <div class="content">
              <p>Thank you for signing up. To complete your registration and verify your email address, please click the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>
              <p>If you did not create an account, you can safely ignore this email.</p>
              <p>Best regards,<br>Your Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Verify transporter connection
    await transporter.verify();

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);

    return NextResponse.json({ 
      success: true,
      messageId: info.messageId
    });
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email', details: error.message },
      { status: 500 }
    );
  }
} 