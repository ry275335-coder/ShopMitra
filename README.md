# 🛍️ ShopMitra — Local Physical Shop Discovery & Multi-Store Price Comparison Engine

> **Live Counter Rates • Direct WhatsApp Orders • PostGIS Spatial Discovery • Zero Delivery Markups**  
> Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL + PostGIS)**.

---

## 📖 Overview

**ShopMitra** is a hyper-local physical shop discovery and live price comparison platform connecting neighborhood retailers with local consumers. Rather than operating as a delivery middleman with high commissions, ShopMitra empowers physical retail footfall by providing complete price transparency, real counter rates, stock freshness guarantees, and direct merchant communication channels.

---

## 🚀 Key Features

### 👤 Customer Experience
- **Multi-Store Price Comparison**: View competing neighborhood stores side-by-side for identical products with clear lowest price badges and MRP savings.
- **3-Tier Stock & Rate Freshness**:
  - 🟢 **Recently Updated (<48 hrs)**: Fresh counter rate guaranteed by shopkeeper.
  - 🟡 **Needs Update (48 hrs - 7 days)**: Moderate freshness; verification prompt.
  - 🔴 **Stale (>7 days)**: Warning badge with direct *"Call Store"* CTA before travelling.
- **Deterministic Smart Search NLP Parser**: Automatically extracts constraints from natural conversational input (e.g. *"iPhone 15 under 70000"*, *"Basmati Rice within 3km"*).
- **In-Store Barcode & Camera Scanner**: Point phone camera at any package barcode (EAN-13, UPC) to instantly check what competing neighborhood retailers are charging.
- **Interactive Leaflet Map**: Visualizes neighborhood retailers, user location, and radius boundary circle.
- **Price Drop Alerts & Saved Wishlist**: Set target price threshold alerts with phone & email notifications.
- **Zero-Friction In-Store Footfall**: 1-click WhatsApp order builder, direct phone dialer, and Google Maps turn-by-turn navigation deep links.

### 🏪 Merchant Operations Hub
- **Spreadsheet-Style Fast Rate Editor**: Inline price and stock updater with instantaneous timestamp refresh.
- **Bulk CSV Catalog Upload**: Upload hundreds of products with schema validation, error report downloader, and pre-flight approval.
- **1-Click Master Catalog Presets**: Add pre-configured products instantly or register custom items.
- **Multi-Branch Operations**: Seamlessly switch between branch locations.
- **Store Status Toggle**: Mark physical store as OPEN or CLOSED for the day.

### 🛡️ Admin Governance & Anti-Fraud Center
- **Merchant Onboarding Queue**: Audit business registrations, GSTIN numbers, and physical premises photos to award the *"Verified Partner"* badge.
- **Automated Anti-Fraud Anomaly Shield**: Automatically flags prices dipping >65% below MRP or sudden steep plunges to protect consumers against typos and counterfeit traps.
- **Grievance Resolution Desk**: Investigate consumer in-store price discrepancy reports and issue freshness warnings.

---

## 📁 Scalable Project Structure

```
d:/ShopMitra/
├── public/
│   ├── manifest.json              # PWA Web App Manifest
│   ├── logo.svg                   # Vector brand identity
│   ├── sw.js                      # PWA Service Worker for offline shell caching
│   └── robots.txt / sitemap.xml   # Dynamic SEO discovery endpoints
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql # 26 normalized relational tables
│   │   ├── 002_postgis_and_indexes.sql # PostGIS GIST spatial indexes & RPCs
│   │   └── 003_rls_policies.sql   # Security policies for customer, merchant, admin
│   └── seed.sql                   # Multi-category realistic retail seed data
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with fonts, Leaflet styles & PWA meta
│   │   ├── page.tsx               # Server Component with SSR catalog queries
│   │   ├── globals.css            # Tailwind directives & custom design tokens
│   │   ├── robots.ts              # SEO crawler directives
│   │   └── sitemap.ts             # Dynamic search sitemap
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppContext.tsx     # Global Context: Role, Location, Radius, Search, Wishlist
│   │   │   ├── Header.tsx         # Universal navbar with role switcher & barcode button
│   │   │   ├── MobileBottomBar.tsx# Thumb-zone bottom navigation for mobile shoppers
│   │   │   ├── PwaInstallBanner.tsx # PWA install prompt banner
│   │   │   └── ShopMitraApp.tsx   # Top-level client shell orchestrator
│   │   ├── customer/
│   │   │   ├── CustomerHomeView.tsx   # Category selector, NLP chips, comparison cards
│   │   │   ├── PriceComparisonCard.tsx# Multi-store rate table, savings, WhatsApp CTA
│   │   │   ├── ProductDetailModal.tsx # Full product specs + sorted rate sheet
│   │   │   ├── BarcodeScannerModal.tsx# In-store camera / barcode scanner modal
│   │   │   ├── PriceAlertModal.tsx    # Target price notification form
│   │   │   ├── WishlistDrawer.tsx     # Saved products & shops drawer
│   │   │   ├── ShopCard.tsx           # Retailer card with badge & distance
│   │   │   ├── ShopProfileModal.tsx   # Full store catalog, deals & review submission
│   │   │   └── MapView.tsx            # Leaflet interactive map with custom pins
│   │   ├── merchant/
│   │   │   ├── MerchantDashboardView.tsx # Operations suite, open/closed toggle, KPIs
│   │   │   ├── PriceQuickEditor.tsx   # Spreadsheet-style fast price/stock updater
│   │   │   ├── BulkUploadModal.tsx    # CSV parser, validator & error downloader
│   │   │   ├── ProductCreateModal.tsx # 1-click catalog presets + custom item creator
│   │   │   └── MerchantOnboardingModal.tsx # 3-step merchant onboarding wizard
│   │   ├── admin/
│   │   │   └── AdminDashboardView.tsx # Governance, merchant verifications, anti-fraud
│   │   └── ui/
│   │       ├── Button.tsx         # 4-state button primitive (idle, loading, disabled)
│   │       ├── Badge.tsx          # Status, discount, and verification badges
│   │       ├── Modal.tsx          # Accessible modal dialog primitive
│   │       └── Toast.tsx          # Dynamic notification toast system
│   ├── lib/
│   │   ├── geo/index.ts           # Haversine distance, formatting, Google Maps deep link
│   │   ├── search/smartSearch.ts  # NLP query extractor (under ₹X, within X km)
│   │   ├── utils/index.ts         # Currency formatting, price freshness calculator
│   │   ├── validations/index.ts   # Zod validation schemas for all mutations
│   │   ├── supabase/              # Client, server, and service-role database clients
│   │   └── data/store.ts          # Relational memory store mirroring PostgreSQL schema
│   ├── server/
│   │   ├── queries/catalog.queries.ts  # Spatial distance queries & catalog loaders
│   │   └── actions/
│   │       ├── merchant.actions.ts     # Price update, product creation, CSV bulk import
│   │       └── customer.actions.ts     # Enquiries, price alerts, in-store reports
│   └── types/index.ts             # Domain interfaces, roles, inventory, rates
├── scripts/
│   └── test-suite.mjs             # Automated test suite covering all 15 Step 55 flows
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.mjs
```

---

## 🗄️ Database Schema & PostGIS Setup

The database schema is structured into **26 normalized tables** with PostGIS geographic coordinates:

### Database Migration Order
In your Supabase project dashboard, navigate to the **SQL Editor** and execute the migration files in this exact sequence:

1. **Schema Definition**: [`supabase/migrations/001_initial_schema.sql`](file:///d:/ShopMitra/supabase/migrations/001_initial_schema.sql)
   - Creates `profiles`, `merchants`, `businesses`, `shops`, `shop_branches`, `categories`, `subcategories`, `products`, `product_variants`, `shop_products`, `price_history`, `inventory`, `offers`, `wishlists`, `price_alerts`, `reviews`, `reports`, `subscriptions`, and `analytics_events`.
2. **PostGIS Extensions & Indexes**: [`supabase/migrations/002_postgis_and_indexes.sql`](file:///d:/ShopMitra/supabase/migrations/002_postgis_and_indexes.sql)
   - Enables `postgis` and `pg_trgm` extensions.
   - Adds `GIST(location)` spatial index and trigram indexes on product and shop names.
   - Defines `get_nearby_rates_for_product` spatial RPC function.
3. **Row Level Security (RLS)**: [`supabase/migrations/003_rls_policies.sql`](file:///d:/ShopMitra/supabase/migrations/003_rls_policies.sql)
   - Defines fine-grained access rules separating Customer read-only access, Merchant shop-scoped mutations (`owns_shop()`), and Admin privileges (`is_admin()`).
4. **Seed Data**: [`supabase/seed.sql`](file:///d:/ShopMitra/supabase/seed.sql)
   - Populates realistic multi-vertical retail catalog (Smartphones, Groceries, IT Hardware, Electronics).

---

## ⚙️ Environment Variables

Create a `.env.local` file at the root using the template in [`.env.example`](file:///d:/ShopMitra/.env.example):

```env
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Default Spatial Coordinates (Baseline Central Market)
NEXT_PUBLIC_DEFAULT_LAT=19.0760
NEXT_PUBLIC_DEFAULT_LNG=72.8777
NEXT_PUBLIC_DEFAULT_RADIUS_KM=5
```

---

## 🔐 Authentication & Role Permissions

ShopMitra implements a 3-role authorization model:

| Role | Switcher Header Selection | Scoped Privileges |
| :--- | :--- | :--- |
| **Customer** | `Customer` | Discover nearby shops, compare rates, set price alerts, scan barcodes, submit verified store reviews, submit price inaccuracy reports. |
| **Merchant** | `Merchant` | Register store, update selling rates and stock counts via spreadsheet editor, upload bulk CSV catalog, manage store open/closed status. |
| **Admin** | `Admin` | Approve/reject merchant onboarding applications, review anti-fraud anomaly flags (>65% below MRP), resolve customer grievance disputes. |

---

## 🗺️ Map Configuration

ShopMitra utilizes Leaflet with OpenStreetMap tiles:
- **No paid API keys required**: Completely open-source and free of proprietary map usage quotas.
- **Custom Marker Pins**: Distinct visual markers for Verified Retailers (Green), Local Stores (Orange), and Customer Pinpoint Location (Blue).
- **Radius Circle Visualization**: Renders an accurate geographic radius circle around the customer's selected neighborhood.
- **Turn-by-Turn Navigation**: Deep links directly into native Google Maps (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`).

---

## 🧪 Automated Testing (Step 55)

The project includes an automated test runner validating all 15 required domain flows:

```bash
npm test
```

### Verified Test Cases:
- [x] **Authentication & Role Policies** (Customer, Merchant, Admin)
- [x] **Merchant Permissions** (`owns_shop()` isolation)
- [x] **Admin Permissions** (`is_admin()` governance access)
- [x] **Customer Permissions** (Strict separation from merchant controls)
- [x] **Product Creation Validation** (Selling price ≤ printed MRP ceiling)
- [x] **Stock Status Transitions** (`in_stock`, `low_stock`, `out_of_stock`)
- [x] **Anti-Fraud Anomaly Shield** (>65% discount below MRP flag)
- [x] **Smart Search NLP Tokenizer** (`under ₹70000`, `within 3km`)
- [x] **Multi-Store Price Comparison** (Minimum rate and maximum savings calculation)
- [x] **Haversine Spatial Distance Filtering** (0 km for identical points; strict radius cutoff)
- [x] **Price Drop Alert Validation** (Target price lower than MRP)
- [x] **In-Store Verified Review Submission** (1 to 5 star rating bounds)
- [x] **Customer Price Discrepancy Reporting** (Grievance submission)
- [x] **Bulk CSV Upload Row Parsing & Defect Detection**

---

## 🚀 Running the Project Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suite
```bash
npm test
```

### 3. Build & Run
```bash
# Production Build
npm run build

# Start Production Server
npm run start
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 Deployment Guidelines

### Deploying to Vercel
1. Connect your repository to [Vercel](https://vercel.com).
2. Set Environment Variables in Project Settings.
3. Deploy! Next.js 14 App Router will handle SSR and Edge Caching automatically.
