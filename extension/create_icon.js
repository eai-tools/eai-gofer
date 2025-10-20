const fs = require('fs');

// Create a minimal 128x128 PNG with the logo design
// Using a simple approach with Buffer to create PNG manually
function createIcon() {
  // For simplicity, let's create an SVG and note that VSCode accepts SVG icons too
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="128" height="128" fill="#E8E8E8" rx="16"/>
  
  <!-- Head (dark blue circle) -->
  <circle cx="64" cy="32" r="12" fill="#0F4C75"/>
  
  <!-- Body (dark blue upward arrow/pentagon) -->
  <path d="M 64 48 L 52 70 L 52 85 L 76 85 L 76 70 Z" fill="#0F4C75"/>
  
  <!-- Left arm (light blue ellipse) -->
  <ellipse cx="42" cy="62" rx="8" ry="14" fill="#7DD3FC" transform="rotate(-30 42 62)"/>
  
  <!-- Right arm (light blue ellipse) -->
  <ellipse cx="86" cy="62" rx="8" ry="14" fill="#7DD3FC" transform="rotate(30 86 62)"/>
</svg>`;

  fs.writeFileSync('icon.svg', svg);
  console.log('Created icon.svg');
}

createIcon();
