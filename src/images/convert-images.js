import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputDir = path.resolve("src/images");
const outputDir = path.resolve("src/images/webp");

// create output folder if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(inputDir).filter(f =>
  /\.(jpg|jpeg|png)$/i.test(f)
);

(async () => {
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(
      outputDir,
      file.replace(/\.(jpg|jpeg|png)$/i, ".webp")
    );

    await sharp(inputPath)
      .webp({ quality: 80 })
      .toFile(outputPath);

    console.log(`✔ Converted: ${file}`);
  }
})();
