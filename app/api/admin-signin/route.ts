import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createAdminSchema } from '@/lib/validations/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input using Zod
    const validationResult = createAdminSchema.safeParse(body)
    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Invalid input',
          details: validationResult.error.errors 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const { email, password } = validationResult.data

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Sign in error:', error)
      return new NextResponse(
        JSON.stringify({ 
          error: 'Authentication failed',
          message: error.message 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!data?.user) {
      console.error('No user data returned from Supabase')
      return new NextResponse(
        JSON.stringify({ 
          error: 'Authentication failed',
          message: 'No user data returned' 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is an admin
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', data.user.id)
      .single()

    if (adminError || !adminData) {
      console.error('Admin check failed:', adminError)
      return new NextResponse(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Admin privileges required' 
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Don't send sensitive user data in the response
    return new NextResponse(
      JSON.stringify({ 
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Sign in error:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
} 