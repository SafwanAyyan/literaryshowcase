import { NextResponse } from 'next/server'

export async function GET() {
  // Redirect to UI page by default; compute base from request headers at runtime is unavailable here,
  // so use relative redirect which Next will resolve.
  return NextResponse.redirect('/authors/shakespeare/learn')
}


