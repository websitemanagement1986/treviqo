/**
 * Download correct unique product images (ethnic wear + under-100 basics).
 * Run: node scripts/fix-product-images.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT = path.join(__dirname, "..", "public", "images", "products");
const CATEGORIES = path.join(__dirname, "..", "public", "images", "categories");
const HERO = path.join(__dirname, "..", "public", "images", "hero");

const U = (id) =>
  `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

const IMAGES = {
  // Ethnic wear — each product gets a matching unique photo
  e001: U("photo-1759840278326-73f26ae8c5c7"), // Cotton straight kurta
  e002: U("photo-1771507056578-f9675a2a8f8a"), // Silk saree
  e003: U("photo-1774625237733-5be7cb71ac9a"), // Lehenga choli
  e004: U("photo-1717586756136-d9a3eeb1fa6f"), // Dupatta stole
  w004: U("photo-1756483509254-3cc48a5a15b2"), // Anarkali kurta set

  // Under ₹100 basics — run npm run download-basics-images
};

const CATEGORY_IMAGES = {
  ethnic: U("photo-1756483509254-3cc48a5a15b2"),
};

const HERO_IMAGES = {
  ethnic: U("photo-1774625237733-5be7cb71ac9a"),
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
          return reject(new Error(`${url} => HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(dest)));
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function downloadSet(entries, outDir, ext = "jpg") {
  for (const [id, url] of Object.entries(entries)) {
    const dest = path.join(outDir, `${id}.${ext}`);
    process.stdout.write(`Downloading ${path.basename(dest)} ... `);
    await download(url, dest);
    const size = fs.statSync(dest).size;
    console.log(`OK (${size} bytes)`);
  }
}

async function main() {
  for (const dir of [OUT, CATEGORIES, HERO]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  await downloadSet(IMAGES, OUT);
  await downloadSet(CATEGORY_IMAGES, CATEGORIES);
  await downloadSet(HERO_IMAGES, HERO);

  const crypto = require("crypto");
  const hashes = {};
  for (const id of Object.keys(IMAGES)) {
    const file = path.join(OUT, `${id}.jpg`);
    const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    if (hashes[hash]) {
      console.error(`DUPLICATE: ${id}.jpg same as ${hashes[hash]}.jpg`);
      process.exitCode = 1;
    }
    hashes[hash] = id;
  }

  if (!process.exitCode) console.log("\nAll product images updated with unique files.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
