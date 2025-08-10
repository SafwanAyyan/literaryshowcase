import { NextResponse } from 'next/server'

export async function GET() {
  // Redirect to UI page by default
  return NextResponse.redirect(new URL('/authors/shakespeare/learn', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
}


