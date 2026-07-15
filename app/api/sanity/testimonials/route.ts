import { NextResponse } from 'next/server'
import { getTestimonials } from '@/sanity/lib/queries'

// Revalidate every 10 minutes
export const revalidate = 600

export async function GET() {
  try {
    const testimonials = await getTestimonials()
    return NextResponse.json({ testimonials })
  } catch (error) {
    console.error('[/api/sanity/testimonials] Failed to fetch testimonials:', error)
    return NextResponse.json({ testimonials: [] }, { status: 500 })
  }
}
