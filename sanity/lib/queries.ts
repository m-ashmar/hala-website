import { client } from './client'
import { urlFor } from './image'

// ── Types ─────────────────────────────────────────────────────────────────

export interface SanityProduct {
  _id: string
  title: string
  titleAr?: string
  sanityId: string // slug for DB sync
  category: 'hijab' | 'plexi'
  image: any
  imageUrl: string
  gallery?: any[]
  galleryUrls?: string[]
  description?: string
  descriptionAr?: string
  deliveryInfo?: string
  deliveryInfoAr?: string
  returnPolicy?: string
  returnPolicyAr?: string
  price: number
  discountPrice?: number
  isActive: boolean
  isFeatured: boolean
  isBestSeller: boolean
  isNew: boolean
  specifications?: { key: string; keyAr?: string; value: string; valueAr?: string }[]
  variants?: {
    type: 'SIZE' | 'COLOR' | 'MATERIAL' | 'STYLE'
    options: { label: string; labelAr?: string; value: string; hexColor?: string; inStock: boolean }[]
  }[]
  customizationFields?: {
    fieldType: 'TEXT' | 'COLOR' | 'SIZE' | 'FILE' | 'NOTE'
    label: string
    labelAr?: string
    placeholder?: string
    placeholderAr?: string
    required: boolean
  }[]
  relatedProducts?: SanityProduct[]
  metaTitle?: string
  metaDescription?: string
}

export interface SanityPromotion {
  _id: string
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
  discountType: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y'
  discountValue: number
  buyQuantity?: number
  getQuantity?: number
  couponCode?: string
  startDate: string
  endDate: string
  isActive: boolean
  isFeatured: boolean
  isFlashSale: boolean
  bannerImage?: any
  bannerImageUrl?: string
  linkedProducts?: { sanityId: string; title?: string; imageUrl?: string }[]
  linkedCategories?: string[]
}

export interface SanityHomepageBanner {
  _id: string
  title: string
  titleAr?: string
  subtitle?: string
  subtitleAr?: string
  ctaLabel?: string
  ctaLabelAr?: string
  ctaLink?: string
  ctaLabel2?: string
  ctaLabelAr2?: string
  ctaLink2?: string
  backgroundImage: any
  backgroundImageUrl: string
  mobileImage?: any
  mobileImageUrl?: string
  isActive: boolean
  order: number
}

export interface SanityTestimonial {
  _id: string
  quote: string
  quoteAr?: string
  author: string
  authorAr?: string
  avatarImage?: any
  avatarImageUrl?: string
  rating: number
  isActive: boolean
  order: number
}

export interface SanityFAQ {
  _id: string
  question: string
  questionAr?: string
  answer: string
  answerAr?: string
  category: string
  order: number
  isActive: boolean
}

export interface SanityHeroStat {
  value: string
  valueAr?: string
  label: string
  labelAr?: string
}

export interface SanitySiteSettings {
  _id: string
  siteName: string
  tagline?: string
  taglineAr?: string
  logo?: any
  logoUrl?: string
  whatsappNumber?: string
  instagramUrl?: string
  facebookUrl?: string
  tiktokUrl?: string
  supportEmail?: string
  footerText?: string
  footerTextAr?: string
  announcementBar?: string
  announcementBarAr?: string
  announcementBarActive: boolean
  heroStats?: SanityHeroStat[]
}

export interface SanityShippingSettings {
  _id: string
  freeShippingThreshold: number
  standardShippingFee: number
  expressShippingFee: number
  estimatedDeliveryDays: string
  estimatedDeliveryDaysAr?: string
  deliveryNotes?: string
  deliveryNotesAr?: string
  supportedCities?: { name: string; nameAr?: string; shippingFee?: number }[]
}

// ── Product Queries ───────────────────────────────────────────────────────

const PRODUCT_FIELDS = `
  _id,
  title,
  titleAr,
  "sanityId": sanityId.current,
  category,
  image,
  gallery,
  description,
  descriptionAr,
  deliveryInfo,
  deliveryInfoAr,
  returnPolicy,
  returnPolicyAr,
  price,
  discountPrice,
  isActive,
  isFeatured,
  isBestSeller,
  isNew,
  specifications,
  variants,
  customizationFields,
  metaTitle,
  metaDescription
`

function enrichProduct(p: any): SanityProduct {
  return {
    ...p,
    imageUrl: p.image?.asset ? urlFor(p.image).width(1200).auto('format').url() : '',
    galleryUrls: p.gallery
      ?.filter((img: any) => img?.asset)
      .map((img: any) => urlFor(img).width(1200).auto('format').url()) || [],
  }
}

export async function getAllProducts(): Promise<SanityProduct[]> {
  const query = `*[_type == "product" && isActive != false] { ${PRODUCT_FIELDS} } | order(category asc, _createdAt desc)`
  const raw = await client.fetch(query)
  return raw.map(enrichProduct)
}

export async function getProductsByCategory(category: 'hijab' | 'plexi'): Promise<SanityProduct[]> {
  const query = `*[_type == "product" && category == $category && isActive != false] { ${PRODUCT_FIELDS} } | order(_createdAt desc)`
  const raw = await client.fetch(query, { category })
  return raw.map(enrichProduct)
}

export async function getFeaturedProducts(): Promise<SanityProduct[]> {
  const query = `*[_type == "product" && isFeatured == true && isActive != false] { ${PRODUCT_FIELDS} } | order(_createdAt desc)`
  const raw = await client.fetch(query)
  return raw.map(enrichProduct)
}

export async function getProductBySlug(slug: string): Promise<SanityProduct | null> {
  const query = `*[_type == "product" && sanityId.current == $slug][0] {
    ${PRODUCT_FIELDS},
    relatedProducts[]->{ ${PRODUCT_FIELDS} }
  }`
  const raw = await client.fetch(query, { slug })
  if (!raw) return null

  const product = enrichProduct(raw)
  if (raw.relatedProducts) {
    product.relatedProducts = raw.relatedProducts.map(enrichProduct)
  }
  return product
}

export async function getRelatedProducts(sanityId: string, category: string): Promise<SanityProduct[]> {
  const query = `*[_type == "product" && category == $category && sanityId.current != $sanityId && isActive != false][0...4] { ${PRODUCT_FIELDS} }`
  const raw = await client.fetch(query, { sanityId, category })
  return raw.map(enrichProduct)
}

// ── Promotion Queries ─────────────────────────────────────────────────────

const PROMOTION_FIELDS = `
  _id, title, titleAr, description, descriptionAr,
  discountType, discountValue, buyQuantity, getQuantity, couponCode,
  startDate, endDate, isActive, isFeatured, isFlashSale,
  bannerImage,
  "linkedProducts": linkedProducts[]->{
    "sanityId": sanityId.current,
    title,
    image
  },
  linkedCategories
`

function enrichPromotion(p: any): SanityPromotion {
  return {
    ...p,
    bannerImageUrl: p.bannerImage ? urlFor(p.bannerImage).width(1600).auto('format').url() : undefined,
    linkedProducts: p.linkedProducts?.map((lp: any) => ({
      sanityId: lp.sanityId,
      title: lp.title,
      imageUrl: lp.image ? urlFor(lp.image).width(120).height(120).auto('format').url() : undefined,
    })) ?? undefined,
  }
}

export async function getActivePromotions(): Promise<SanityPromotion[]> {
  const now = new Date()
  const today = now.toISOString()
  // Compare endDate against start-of-today (midnight UTC), so a promotion with
  // endDate = "2026-07-20T00:00:00Z" stays active through all of July 20th.
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const query = `*[_type == "promotion" && isActive == true && startDate <= $now && endDate >= $startOfDay] { ${PROMOTION_FIELDS} } | order(endDate asc)`
  const raw = await client.fetch(query, { now: today, startOfDay })
  return raw.map(enrichPromotion)
}

export async function getFeaturedPromotions(): Promise<SanityPromotion[]> {
  const now = new Date()
  const today = now.toISOString()
  // Compare endDate against start-of-today so promotions set to end "today" stay active all day
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const query = `*[_type == "promotion" && isActive == true && isFeatured == true && startDate <= $now && endDate >= $startOfDay] { ${PROMOTION_FIELDS} } | order(endDate asc)`
  const raw = await client.fetch(query, { now: today, startOfDay })
  return raw.map(enrichPromotion)
}

/**
 * Returns a single active promotion by its coupon code.
 * Used by the validate-coupon API to determine product/category scope.
 */
export async function getPromotionByCouponCode(code: string): Promise<SanityPromotion | null> {
  const now = new Date()
  const today = now.toISOString()
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const query = `*[_type == "promotion" && isActive == true && couponCode == $code && startDate <= $now && endDate >= $startOfDay][0] { ${PROMOTION_FIELDS} }`
  const raw = await client.fetch(query, { code: code.trim().toUpperCase(), now: today, startOfDay })
  if (!raw) return null
  return enrichPromotion(raw)
}

// ── Homepage & Content Queries ────────────────────────────────────────────

export async function getHomepageBanners(): Promise<SanityHomepageBanner[]> {
  const query = `*[_type == "homepageBanner" && isActive == true] | order(order asc) {
    _id, title, titleAr, subtitle, subtitleAr, ctaLabel, ctaLabelAr, ctaLink, ctaLabel2, ctaLabelAr2, ctaLink2,
    backgroundImage, mobileImage, isActive, order
  }`
  const raw = await client.fetch(query)
  return raw.map((b: any) => ({
    ...b,
    backgroundImageUrl: b.backgroundImage ? urlFor(b.backgroundImage).width(1920).auto('format').url() : '',
    mobileImageUrl: b.mobileImage ? urlFor(b.mobileImage).width(800).auto('format').url() : undefined,
  }))
}

export async function getTestimonials(): Promise<SanityTestimonial[]> {
  const query = `*[_type == "testimonial" && isActive == true] | order(order asc, _createdAt desc) {
    _id, quote, quoteAr, author, authorAr, avatarImage, rating, isActive, order
  }`
  const raw = await client.fetch(query)
  return raw.map((t: any) => ({
    ...t,
    avatarImageUrl: t.avatarImage ? urlFor(t.avatarImage).width(200).height(200).auto('format').url() : undefined,
  }))
}

export async function getFAQs(): Promise<SanityFAQ[]> {
  const query = `*[_type == "faq" && isActive == true] | order(category asc, order asc) {
    _id, question, questionAr, answer, answerAr, category, order, isActive
  }`
  return client.fetch(query)
}

// ── Singleton Queries ─────────────────────────────────────────────────────

export async function getSiteSettings(): Promise<SanitySiteSettings | null> {
  const query = `*[_type == "siteSettings"][0] {
    _id, siteName, tagline, taglineAr, logo, whatsappNumber,
    instagramUrl, facebookUrl, tiktokUrl, supportEmail,
    footerText, footerTextAr, announcementBar, announcementBarAr, announcementBarActive,
    heroStats
  }`
  const raw = await client.fetch(query)
  if (!raw) return null
  return {
    ...raw,
    logoUrl: raw.logo ? urlFor(raw.logo).width(400).auto('format').url() : undefined,
  }
}

export async function getShippingSettings(): Promise<SanityShippingSettings | null> {
  const query = `*[_type == "shippingSettings"][0]`
  return client.fetch(query)
}
