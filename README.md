# Treviqo — Fashion & Apparel E-commerce

A **Myntra-inspired** fashion e-commerce website for garments and apparel. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- Fashion-focused storefront (Men, Women, Kids, Ethnic, Sportswear)
- Myntra-style pink theme with brand-first product cards
- Product search, filters, cart, and mock checkout
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

```bash
npm run build
npm start
```

Or deploy to [Vercel](https://vercel.com) by connecting this repo.

## Repository

https://github.com/websitemanagement1986/treviqo
