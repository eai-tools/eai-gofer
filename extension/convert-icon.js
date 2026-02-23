const sharp = require('sharp');
const fs = require('fs');

async function convertSvgToPng() {
  try {
    const svgBuffer = fs.readFileSync('icon.svg');

    await sharp(svgBuffer)
      .resize(128, 128)
      .png()
      .toFile('icon.png');

  } catch (error) {
    console.error('❌ Error converting SVG to PNG:', error);
    process.exit(1);
  }
}

convertSvgToPng();
