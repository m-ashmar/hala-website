import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/sanity/lib/queries'

// Cache for 5 minutes — settings don't change frequently
export const revalidate = 300

export async function GET() {
  try {
    const settings = await getSiteSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[/api/sanity/settings] Failed to fetch site settings:', error)
    return NextResponse.json({ settings: null }, { status: 500 })
  }
}
