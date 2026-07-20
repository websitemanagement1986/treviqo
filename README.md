# Treviqo — Fashion & Apparel E-commerce

A **Myntra-inspired** fashion e-commerce website for garments and apparel. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- Fashion-focused storefront (Men, Women, Kids, Ethnic, Sportswear)
- Myntra-style pink theme with brand-first product cards
- Product search, filters, cart, and checkout (COD + Razorpay)
- INR pricing, top brands section, deals carousel
- JSON-driven config — easy to customize products and branding

## Quick Start

```bash
cd C:\Repositiries\treviqo
npm install
npm run dev
```

Open **http://localhost:3000**

> If npm is blocked on corporate network, `.npmrc` uses `registry.npmmirror.com` mirror.

## Customize

Edit files in `sites/treviqo/`:

| File | Purpose |
|------|---------|
| `site.json` | Store name, tagline, promo bar |
| `theme.json` | Colors (Myntra pink `#FF3F6C`) |
| `products.json` | Garment catalog with brands |
| `categories.json` | Fashion categories |
| `brands.json` | Top brands on homepage |
| `navigation.json` | Menu and footer links |

## Deploy

Use **server mode** (`next start`) on Hostinger so payment API routes work:

```bash
npm run build
npm start
```

Do **not** use `npm run build:hostinger` (static export) if you need Razorpay — API routes require a Node.js server.

Set environment variables on Hostinger (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `RAZORPAY_KEY_ID` | Razorpay live key |
| `RAZORPAY_KEY_SECRET` | Razorpay live secret |
| `RESEND_API_KEY` | Order confirmation emails (optional) |
| `FROM_EMAIL` | Sender email (e.g. orders@treviqo.co.in) |
| `ADMIN_EMAIL` | Admin order notifications |

### Payment gateway authorization URLs

| Field | URL |
|-------|-----|
| Website URL | `https://treviqo.co.in` |
| Callback / verification URL | `https://treviqo.co.in/api/verify-payment` |
| Success page | `https://treviqo.co.in/order-confirmation` |

Or deploy to [Vercel](https://vercel.com) by connecting this repo.

## Repository

https://github.com/websitemanagement1986/treviqo
