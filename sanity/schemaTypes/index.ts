import { type SchemaTypeDefinition } from 'sanity'
import { productType } from './product'
import { productCategoryType } from './productCategory'
import { promotionType } from './promotion'
import { homepageBannerType } from './homepageBanner'
import { testimonialType } from './testimonial'
import { siteSettingsType } from './siteSettings'
import { themeSettingsType } from './themeSettings'
import { faqType } from './faq'
import { shippingSettingsType } from './shippingSettings'
import { orderType } from './order'
import { couponType } from './coupon'
import { userType } from './user'
import { customRequestType } from './customRequest'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Content
    productType,
    productCategoryType,
    promotionType,
    homepageBannerType,
    testimonialType,
    faqType,
    // Business operations (synced from PostgreSQL)
    orderType,
    couponType,
    userType,
    customRequestType,
    // Singletons
    siteSettingsType,
    themeSettingsType,
    shippingSettingsType,
  ],
}
