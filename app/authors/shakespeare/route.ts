import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const base = `${url.protocol}//${url.host}`
  return NextResponse.redirect(`${base}/authors/shakespeare/learn`)
}


