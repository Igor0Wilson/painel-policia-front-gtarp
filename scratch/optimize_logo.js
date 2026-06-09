const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeLogo() {
  const input = path.join(__dirname, '../public/logo.png');
  
  const info = await sharp(input).metadata();
  process.stdout.write('Original: ' + fs.statSync(input).size + ' bytes | ' + info.width + 'x' + info.height + '\n');
  
  // Optimized PNG — 512x512 max, high compression
  await sharp(input)
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toFile(path.join(__dirname, '../public/logo_final.png'));
  
  const finalPng = fs.statSync(path.join(__dirname, '../public/logo_final.png')).size;
  process.stdout.write('Optimized PNG (512px): ' + finalPng + ' bytes (' + Math.round(finalPng/1024) + 'KB)\n');
  
  // Also copy to src/assets for Vite import
  fs.copyFileSync(
    path.join(__dirname, '../public/logo_final.png'),
    path.join(__dirname, '../src/assets/logo.png')
  );
  process.stdout.write('Copied to src/assets/logo.png\n');
  
  // Replace original
  fs.copyFileSync(
    path.join(__dirname, '../public/logo_final.png'),
    input
  );
  fs.unlinkSync(path.join(__dirname, '../public/logo_final.png'));
  if (fs.existsSync(path.join(__dirname, '../public/logo_optimized.png'))) {
    fs.unlinkSync(path.join(__dirname, '../public/logo_optimized.png'));
  }
  
  process.stdout.write('Done! public/logo.png replaced with optimized version\n');
}

optimizeLogo().catch(e => process.stdout.write('Error: ' + e.message + '\n'));
