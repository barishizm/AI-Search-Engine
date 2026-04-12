const { createCanvas } = require(require("path").join(
  __dirname,
  "..",
  "frontend",
  "node_modules",
  "canvas",
));
const fs = require("fs");
const path = require("path");

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#8b5cf6";
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚡", size / 2, size / 2);

  const buffer = canvas.toBuffer("image/png");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
}

generateIcon(16, "frontend/public/icon-16x16.png");
generateIcon(32, "frontend/public/icon-32x32.png");
generateIcon(180, "frontend/public/apple-touch-icon.png");
generateIcon(192, "frontend/public/icon-192x192.png");
generateIcon(512, "frontend/public/icon-512x512.png");
generateIcon(32, "frontend/public/favicon.ico");

console.log("All icons generated!");
