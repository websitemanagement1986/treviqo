/**
 * Download verified real product photos for Under-100 basics.
 * Run: node scripts/download-basics-images.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT = path.join(__dirname, "..", "public", "images", "products");

const px = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;

const IMAGES = {
  // Pexels — verified socks product photography
  m006: px(9594145), // 3 sock pairs in gift box
  w006: px(7692246), // women's white crew socks flat lay
  k003: px(15195384), // colorful patterned kids socks

  // Wikimedia Commons — verified product photos
  s004: "https://upload.wikimedia.org/wikipedia/commons/2/2d/Black_wrist_sweatband_on_hand.jpg",
  w007: "https://upload.wikimedia.org/wikipedia/commons/7/77/Scrunchie_%28386507650%29.jpg",
  m007: "https://upload.wikimedia.org/wikipedia/commons/6/60/Kunals_handkerchiefs_3.jpg",
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

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  for (const [id, url] of Object.entries(IMAGES)) {
    const dest = path.join(OUT, `${id}.jpg`);
    process.stdout.write(`Downloading ${id}.jpg ... `);
    await download(url, dest);
    const size = fs.statSync(dest).size;
    console.log(`OK (${size} bytes)`);
  }

  console.log("\nAll basics product images updated with real photographs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
