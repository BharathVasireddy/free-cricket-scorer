import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 192, 512];
const inputSvg = join(__dirname, '../public/cricket-icon.svg');
const outputDir = join(__dirname, '../public');

async function generateIcons() {
  try {
    // Ensure the output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Generate icons for each size
    for (const size of sizes) {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(join(outputDir, `cricket-icon-${size}.png`));
      
      console.log(`Generated ${size}x${size} icon`);
    }

    console.log('All PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons(); 