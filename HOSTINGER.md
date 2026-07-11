# Deploying Treviqo on Hostinger

## Why you see old/random images

Hostinger is serving an **old deployment** that either:
- Does not include the `public/images/` folder (36 real photos)
- Has `SITE=macys` instead of `SITE=treviqo`
- Used a cached build from before the image fix

**Latest code on GitHub:** https://github.com/websitemanagement1986/treviqo (branch: `main`)

---

## Option A — Hostinger Node.js Web App (recommended)

Use this if your Hostinger plan supports **Node.js Web Applications**.

### 1. Connect GitHub repo
- Hostinger Panel → **Websites** → your site → **Node.js Web App**
- Connect repo: `websitemanagement1986/treviqo`
- Branch: **`main`**

### 2. Build settings
| Setting | Value |
|---------|-------|
| Node.js version | **18** or **20** |
| Install command | `npm install` |
| Build command | `npm run build` |
| Start command | `npm start` |
| Root directory | `/` (leave empty) |

### 3. Environment variables (IMPORTANT)
Add in Hostinger → Environment Variables:

```
SITE=treviqo
```

### 4. Redeploy
- Click **Redeploy** or **Clear cache & redeploy**
- Wait for build to finish successfully

### 5. Verify images on live site
Open in browser:
```
https://yourdomain.com/images/products/m001.jpg
```
You should see a **shirt photo**. If you get 404, `public/images` was not deployed.

---

## Option B — Static upload to public_html

Use this for **shared hosting** (upload files to `public_html`).

### On your PC:

```cmd
cd C:\Repositiries\treviqo
git pull
npm install
npm run build:hostinger
```

This creates an **`out`** folder with the full static site + images.

### Upload to Hostinger:
1. Hostinger File Manager → `public_html`
2. **Delete all old files** in `public_html` (backup first if needed)
3. Upload **everything inside** the `out` folder (not the `out` folder itself)
4. Ensure `public_html/images/products/` contains `.jpg` files

### Verify:
```
https://yourdomain.com/images/products/m001.jpg
```

---

## Checklist before going live

- [ ] Latest code pulled from GitHub (`main` branch)
- [ ] `SITE=treviqo` set in environment (Node.js) or `.env` before build
- [ ] `public/images/products/` has 27 `.jpg` files
- [ ] `sites/treviqo/products.json` uses `/images/products/...` paths (NOT picsum)
- [ ] Cleared Hostinger cache / old `public_html` files
- [ ] Test URL `/images/products/m001.jpg` shows shirt photo

---

## Quick verify on your PC

```cmd
cd C:\Repositiries\treviqo
npm run verify-images
npm run build
npm start
```

Open http://localhost:3000 — all images should be real fashion photos.

---

## Still seeing old images?

1. **Hard refresh** live site: Ctrl+Shift+R
2. **Clear Hostinger CDN/cache** in hPanel
3. Confirm deploy log shows commit `5cab4bb` or newer (local images fix)
4. Check you are NOT deploying from `C:\jijajiWebsite` old copy — use GitHub repo only
