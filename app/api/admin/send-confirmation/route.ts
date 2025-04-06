import { NextResponse } from 'next/server'
import { createTransport } from 'nodemailer'
import { supabase } from '@/lib/supabase'

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function POST(request: Request) {
  try {
    const { email, token, adminEmail } = await request.json()

    if (!email || !token || !adminEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate confirmation URL using the environment variable
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/confirm?token=${token}&email=${encodeURIComponent(email)}`

    // Send email to current admin
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: adminEmail,
      subject: 'Sri Sathya Sai VMS - Confirm New Admin Creation',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm New Admin Creation</title>
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://ssssompcg.org/assets/images/sd5-464x464.jpg" alt="Sri Sathya Sai Logo" style="width: 100px; height: 100px; border-radius: 50%;">
              </div>
              <h1 style="color: #FF6B00; text-align: center; margin-bottom: 20px;">Confirm New Admin Creation</h1>
              <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">A new admin account is being created for: <strong>${email}</strong></p>
              <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">Click the button below to confirm this action:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmUrl}" style="
                  display: inline-block;
                  background-color: #FF6B00;
                  color: white;
                  padding: 12px 24px;
                  text-decoration: none;
                  border-radius: 4px;
                  font-weight: 500;
                ">Confirm Admin Creation</a>
              </div>
              <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">This link will expire in 24 hours.</p>
              <p style="color: #666; line-height: 1.6;">If you did not request this action, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 14px; text-align: center;">Sri Sathya Sai Seva Organisations</p>
            </div>
          </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    return NextResponse.json(
      { error: 'Failed to send confirmation email' },
      { status: 500 }
    )
  }
} 