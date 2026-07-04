# Architecture Decision Report (ADR): Halahello Platform

## Phase 1: Project Analysis

### Project Overview
**Purpose:** Halahello is a premium boutique platform serving two distinct verticals: "Hijab by Halahello" (elegant modest fashion) and "Plexi by Halahello" (custom bespoke acrylic creations for gifts, weddings, and decor). The application must transition from a static prototype to a full-fledged e-commerce and custom-order platform.
**Target Users:** Modern women seeking high-quality hijabs, and individuals/event planners seeking bespoke customized gifts and decor. The audience spans English and Arabic speakers.

### Feature & Flow Analysis
- **Existing Screens:** Single-page prototype containing Hero, Brand Story, Collections overview, static Product Grids (Hijab/Plexi), Custom Order form (static), Instagram feed mock, Testimonials, and Contact form.
- **Missing/Required Screens:** Product Listing Pages (PLP), Product Detail Pages (PDP), Cart, Checkout, Order Confirmation, User Account Dashboard, Admin Dashboard.
- **User Flows:**
  - *Standard E-commerce:* Browse -> Add to Cart -> Checkout -> Payment -> Order Tracking.
  - *Custom Order Flow:* Fill detailed request (uploading inspiration images) -> Admin Review -> Quote Generation -> Customer Approval & Payment -> Production -> Shipping.
- **Business Logic & Data Flow:** Needs robust handling of real-time inventory (for physical hijabs), complex state machines for Custom Orders (Pending -> Quoted -> Paid -> In Production -> Shipped), and secure payment processing.
- **Admin Requirements:** Order fulfillment, Custom request pipeline management (Kanban style), customer communication, and content updates.
- **Content Management:** Non-technical owners need to frequently update the Hero text, Brand Story, Testimonials, and add new products/images without developer intervention. Expected update frequency: Weekly.
- **Scalability, Performance & Security:** Must support high-traffic spikes during product drops. Requires CSRF protection, secure payment webhooks, and PII protection for user data.

---

## Phase 2: Categorize All Data

| Data Category | Examples | Justification |
| :--- | :--- | :--- |
| **Static Content** | Navigation structure, Footer links, UI Labels (e.g., "Add to Cart"), Brand Logos. | Rarely changes. Hardcoding or using simple i18n JSON files provides maximum performance. |
| **CMS Content** | Hero Text, Brand Story, Testimonials, FAQs, Blog/Journal (future), Product Descriptions & Marketing Images. | High frequency of updates by non-technical marketing/business owners. Needs a visual editor. |
| **Dynamic Business Data** | Inventory levels, Pricing, Custom Order Status, Standard Orders, Shipping Rates, Taxes. | Highly transactional, changes constantly based on user actions. Requires strict ACID compliance and validation. |
| **User Data** | Customer Accounts, Authentication Credentials, Order History, Saved Addresses. | Highly sensitive. Requires strict security, encryption, and relational integrity. |
| **System Config** | Payment API Keys, Shipping Zone Rules, Email Provider Credentials. | Security critical. Belongs in environment variables and secure backend configs. |
| **Analytics Data** | Page views, Conversion rates, Cart abandonment rates. | Event-driven, write-heavy data suited for external tools (Google Analytics, Mixpanel). |

---

## Phase 3: Determine the Best Architecture

**Option A (Sanity Only):** ❌ Inadequate. Sanity cannot securely handle user authentication, payment processing, or complex, multi-step relational business logic (like a custom order quoting system).
**Option B (Backend Only):** ❌ Suboptimal. Building a custom CMS for rich text, image cropping, and dynamic marketing pages is reinventing the wheel, wasting development time, and yielding an inferior editor experience for the business owners.
**Option C (Hybrid - Sanity + Custom Backend):** ✅ **Recommended.** This provides the "best of both worlds". Sanity empowers the business to manage marketing and product catalogs effortlessly, while a custom PostgreSQL backend ensures secure, transactional, and scalable e-commerce and user management operations.

---

## Phase 4: Produce Architecture Decision Report

### 1. Executive Summary
The Halahello platform will utilize a **Hybrid Architecture** combining a **Headless CMS (Sanity)** for content management and a **Custom Backend (Next.js API + PostgreSQL)** for business logic. This architecture separates marketing concerns from transactional concerns, providing an exceptional authoring experience for the business owners while maintaining military-grade security and transactional integrity for orders and user data.

### 2. Technology Decision: Both Sanity and Custom Backend
- **Sanity** will act as the source of truth for *what the customer sees* (marketing copy, product descriptions, images, testimonials).
- **Custom Backend (PostgreSQL)** will act as the source of truth for *what the business processes* (users, sessions, payments, inventory counts, order pipelines).

### 3. Responsibility Matrix

| Feature | Sanity (CMS) | Custom Backend | Reason |
| :--- | :--- | :--- | :--- |
| **Hero & Story Sections** | ✅ | ❌ | Purely marketing content; needs visual editing. |
| **Testimonials & FAQs** | ✅ | ❌ | Frequent updates by non-technical staff. |
| **Product Catalog (Text/Images)** | ✅ | ❌ | Rich media and descriptions belong in a CMS. |
| **Product Inventory & Pricing** | ❌ | ✅ | Transactional data; requires strict locking and validation to prevent overselling. |
| **User Authentication** | ❌ | ✅ | Security and PII protection requires a dedicated DB. |
| **Shopping Cart & Checkout** | ❌ | ✅ | Business logic, discounts, and payment gateways. |
| **Standard Orders** | ❌ | ✅ | Relational data tying Users, Products, and Payments. |
| **Custom Orders** | ❌ | ✅ | Complex workflow states, user uploads, and quotes. |
| **Contact Form Submissions** | ❌ | ✅ | Requires server-side email dispatching and spam filtering. |

### 4. Content Management Analysis
The following must live in **Sanity**:
- **Homepage Content (Hero, Story):** To allow seasonal updates (e.g., Ramadan collections).
- **Testimonials:** To easily curate and feature customer feedback.
- **Product Marketing:** Titles, rich-text descriptions, and high-res image galleries. Sanity's real-time image transformation pipeline is superior for delivering optimized assets across devices.

### 5. Backend Analysis
The following must live in the **Custom Backend**:
- **Authentication & Authorization:** Securely managing customer and admin sessions using NextAuth/Auth.js.
- **Database Operations (PostgreSQL):** ACID-compliant transactions for order placement.
- **Payments:** Securely integrating with Stripe or regional gateways (Paymob/Tap). Webhooks must hit the backend to update order statuses.
- **Custom Order Workflows:** A state machine managing custom Plexi requests (Submission -> Quoted -> Paid -> Shipped).
- **File Uploads:** Storing inspiration images uploaded by customers for custom orders securely (via AWS S3).
- **Notifications:** Triggering transactional emails (Resend/SendGrid) for order confirmations and shipping updates.

### 6. Database Design (PostgreSQL / Prisma)
Recommended Core Entities:
- `User`: id, email, password_hash, role (ADMIN/CUSTOMER), created_at.
- `Product_Sync`: id, sanity_id (foreign key to CMS), price, stock_quantity. *(Bridges CMS and Backend)*
- `Order`: id, user_id, status, total_amount, payment_intent_id, created_at.
- `OrderItem`: id, order_id, product_sanity_id, quantity, price_at_purchase.
- `CustomRequest`: id, user_id (optional), name, email, details, status, quote_price, image_urls[].

### 7. API Design
- `POST /api/auth/*`: Handle login, registration, and sessions.
- `POST /api/checkout/session`: Initialize payment intent and lock inventory.
- `POST /api/webhooks/payment`: Listen for successful payment events to finalize orders.
- `POST /api/webhooks/sanity`: Listen for CMS publishes to invalidate Next.js frontend cache (ISR).
- `POST /api/custom-requests`: Submit new custom Plexi orders with file uploads.
- `GET/PUT /api/admin/orders/*`: Admin endpoints for order fulfillment.

### 8. Admin Experience
**A Custom Admin Dashboard IS needed, alongside Sanity Studio.**
- **Sanity Studio:** Will be used exclusively by the marketing team to write descriptions, upload product photos, and change website text.
- **Custom Admin Dashboard (built in Next.js):** Will be used by operations/fulfillment.
  - *Modules needed:* Order Fulfillment Table, Custom Request Kanban Board, Customer Support view, Inventory Management (updating stock counts).
  - *Why not just Sanity?* Sanity is a document store, not a relational operations tool. Managing a Kanban board of custom orders and processing refunds is vastly superior in a custom relational dashboard.

### 9. Scalability
This hybrid architecture is built for immense scale.
- **Content:** Sanity delivers content globally via its CDN. Next.js statically generates (SSG/ISR) these pages, meaning marketing pages can handle infinite traffic with zero database load.
- **Backend:** The PostgreSQL database is only hit for transactional operations (Checkout, Auth). Connection pooling (via PgBouncer or Prisma Accelerate) ensures database stability.
- **Future Growth:** The decoupled nature allows seamless integration of future mobile apps (querying the same Sanity GraphQL and Custom REST APIs). Multi-language is handled gracefully by Sanity's field-level translation capabilities paired with Next.js i18n routing.

### 10. Cost Analysis
- **Development Time:** Higher initial investment to setup two systems and bridge them (e.g., syncing Product IDs).
- **Maintenance:** Extremely low. Content editors do not need developers to change the website.
- **Hosting:** Low to Moderate. Vercel for frontend/APIs, Supabase for PostgreSQL database, Sanity (Generous free tier).
- **Trade-offs:** The primary trade-off is complexity. The development team must manage two sources of truth (CMS for content, DB for transactions) and keep them synchronized.

### 11. Final Recommendation
**Implement Option C: Hybrid Architecture (Sanity + Custom PostgreSQL Backend).**

**Technical Justification:**
Halahello is not just a blog (where Option A would suffice), nor is it a pure SaaS application (where Option B would suffice). It is a heavily brand-driven e-commerce platform with a complex custom-order pipeline. 

Attempting to build a CMS from scratch in the custom backend will result in a clunky, rigid editor that frustrates the business owners. Conversely, attempting to force user accounts, secure payment gateways, and inventory logic into Sanity will result in security vulnerabilities and relational data nightmares.

**Clear Boundary of Responsibilities:**
To avoid overlap, the golden rule of this architecture is: **Sanity owns the "Display", the Backend owns the "Transaction".**
When a product is created, it is created in Sanity (Title, Images, Description). Sanity triggers a webhook to the Backend, which creates a lightweight `Product_Sync` record containing only the `sanity_id`, `price`, and `stock`. When a user browses, they see Sanity data. When they click "Checkout", the backend takes over, verifying the price and stock against its own secure database before charging the card.
