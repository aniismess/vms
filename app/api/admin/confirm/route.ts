import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { confirmAdminSchema } from '@/lib/validations/admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    // Validate input using Zod
    const validationResult = confirmAdminSchema.safeParse({ email, token })
    if (!validationResult.success) {
      return new Response(
        `
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invalid Request</title>
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
              <h1 style="color: #FF6B00;">Invalid Request</h1>
              <p style="color: #666;">Missing required parameters.</p>
              <a href="https://ssssovms.vercel.app/login" style="display: inline-block; background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px;">Go to Login</a>
            </div>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }

    // Get the pending admin
    const { data: pendingAdmin, error: pendingError } = await supabase
      .from('pending_admin_users')
      .select('*')
      .eq('email', email)
      .eq('confirmation_token', token)
      .single()

    if (pendingError || !pendingAdmin) {
      return new Response(
        `
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invalid or Expired Link</title>
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
              <h1 style="color: #FF6B00;">Invalid or Expired Link</h1>
              <p style="color: #666;">The confirmation link is invalid or has expired.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px;">Go to Login</a>
            </div>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(pendingAdmin.expires_at)
    if (now > expiresAt) {
      // Delete the expired pending admin
      await supabase
        .from('pending_admin_users')
        .delete()
        .eq('email', email)

      return new Response(
        `
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link Expired</title>
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
              <h1 style="color: #FF6B00;">Link Expired</h1>
              <p style="color: #666;">The confirmation link has expired. Please request a new admin invitation.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px;">Go to Login</a>
            </div>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }

    // Create the user in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: pendingAdmin.password,
      email_confirm: true,
      user_metadata: {
        is_admin: true,
      },
    })

    if (authError) {
      throw authError
    }

    // Add the user to admin_users table
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert([
        {
          id: authUser.user.id,
          email: email,
          created_by: pendingAdmin.created_by,
        },
      ])

    if (adminError) {
      // Clean up: delete the auth user if admin creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw adminError
    }

    // Delete the pending admin
    await supabase
      .from('pending_admin_users')
      .delete()
      .eq('email', email)

    return new Response(
      `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admin Account Confirmed</title>
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://ssssompcg.org/assets/images/sd5-464x464.jpg" alt="Sri Sathya Sai Logo" style="width: 100px; height: 100px; border-radius: 50%;">
            </div>
            <h1 style="color: #FF6B00;">Admin Account Confirmed!</h1>
            <p style="color: #666; margin-bottom: 20px;">Your admin account has been successfully created. You can now log in to the system.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Go to Login</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  } catch (error) {
    console.error('Admin confirmation error:', error)
    return new Response(
      `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center;">
            <h1 style="color: #FF6B00;">Error</h1>
            <p style="color: #666;">An error occurred while confirming your admin account. Please try again or contact support.</p>
            <a href="https://ssssovms.vercel.app/login" style="display: inline-block; background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px;">Go to Login</a>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  }
} 