import type { StructureResolver } from 'sanity/structure'

/**
 * Custom Sanity Studio structure.
 * Singletons (siteSettings, shippingSettings) appear as single documents
 * rather than list views. All other types are standard document lists.
 *
 * Business operations (Orders, Coupons) are synced from PostgreSQL.
 * Orders are read-only except for the status field.
 * Coupons are fully editable; changes sync back to PostgreSQL via webhook.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Halahello Studio')
    .items([
      // ── Catalogue ────────────────────────────────────────────
      S.listItem()
        .title('Products')
        .icon(() => '▦')
        .child(S.documentTypeList('product').title('Products')),

      S.listItem()
        .title('Promotions & Offers')
        .icon(() => '🏷️')
        .child(S.documentTypeList('promotion').title('Promotions')),

      S.divider(),

      // ── Business Operations ───────────────────────────────────
      S.listItem()
        .title('Orders')
        .icon(() => '📦')
        .child(
          S.documentTypeList('order')
            .title('Orders')
            .defaultOrdering([{ field: 'pgCreatedAt', direction: 'desc' }])
        ),

      S.listItem()
        .title('Coupons')
        .icon(() => '🎟️')
        .child(S.documentTypeList('coupon').title('Coupons')),

      S.listItem()
        .title('Custom Requests')
        .icon(() => '🎨')
        .child(
          S.documentTypeList('customRequest')
            .title('Custom Requests')
            .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
        ),

      S.listItem()
        .title('Users')
        .icon(() => '👥')
        .child(
          S.documentTypeList('user')
            .title('Users')
            .defaultOrdering([{ field: 'pgCreatedAt', direction: 'desc' }])
        ),

      S.divider(),

      // ── Homepage ─────────────────────────────────────────────
      S.listItem()
        .title('Homepage Banners')
        .icon(() => '🖼️')
        .child(S.documentTypeList('homepageBanner').title('Homepage Banners')),

      S.listItem()
        .title('Testimonials')
        .icon(() => '⭐')
        .child(S.documentTypeList('testimonial').title('Testimonials')),

      S.divider(),

      // ── Support Content ───────────────────────────────────────
      S.listItem()
        .title('FAQ')
        .icon(() => '❓')
        .child(S.documentTypeList('faq').title('FAQ')),

      S.divider(),

      // ── Singletons ────────────────────────────────────────────
      S.listItem()
        .title('Site Settings')
        .icon(() => '⚙️')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings')
        ),

      S.listItem()
        .title('Shipping Settings')
        .icon(() => '🚚')
        .child(
          S.document()
            .schemaType('shippingSettings')
            .documentId('shippingSettings')
            .title('Shipping Settings')
        ),
    ])
