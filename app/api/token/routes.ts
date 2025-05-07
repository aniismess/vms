// app/api/token/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return new Response(JSON.stringify({ token: 'static-token' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
