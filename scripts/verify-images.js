const fs = require("fs");
const path = require("path");

const productsPath = path.join(__dirname, "..", "sites", "treviqo", "products.json");
const publicDir = path.join(__dirname, "..", "public", "images");

const products = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
let missing = 0;
let picsum = 0;

for (const p of products) {
  const img = p.images[0];
  if (img.includes("picsum")) {
    console.log("PICSUM (bad):", p.slug, img);
    picsum++;
    continue;
  }
  if (img.startsWith("/images/")) {
    const file = path.join(__dirname, "..", "public", img.replace(/^\//, ""));
    if (!fs.existsSync(file)) {
      console.log("MISSING:", p.slug, file);
      missing++;
    }
  }
}

const count = fs.existsSync(publicDir)
  ? fs.readdirSync(path.join(publicDir, "products")).length
  : 0;

console.log(`\nProduct images in public/: ${count}`);
console.log(`Picsum URLs: ${picsum}`);
console.log(`Missing files: ${missing}`);

if (picsum > 0 || missing > 0) {
  process.exit(1);
}
console.log("All images OK.");
