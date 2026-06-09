// Optimize PNG using native Node.js zlib - recompress PNG chunks
const fs = require('fs');
const zlib = require('zlib');

const input = 'public/logo.png';
const output = 'public/logo_opt.png';

const buf = fs.readFileSync(input);
const originalSize = buf.length;

// Parse PNG structure and recompress IDAT chunks
function parsePNG(buf) {
  const signature = buf.slice(0, 8);
  let offset = 8;
  const chunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.slice(offset + 4, offset + 8).toString('ascii');
    const data = buf.slice(offset + 8, offset + 8 + length);
    const crc = buf.slice(offset + 8 + length, offset + 12 + length);
    chunks.push({ type, data, crc, length });
    offset += 12 + length;
  }

  return { signature, chunks };
}

function writePNG(signature, chunks) {
  const parts = [signature];
  for (const chunk of chunks) {
    const lenBuf = Buffer.allocUnsafe(4);
    lenBuf.writeUInt32BE(chunk.data.length, 0);
    parts.push(lenBuf);
    parts.push(Buffer.from(chunk.type));
    parts.push(chunk.data);
    parts.push(chunk.crc); // Keep original CRC (data unchanged)
  }
  return Buffer.concat(parts);
}

try {
  const { signature, chunks } = parsePNG(buf);
  
  // Collect all IDAT data
  const idatChunks = chunks.filter(c => c.type === 'IDAT');
  const combined = Buffer.concat(idatChunks.map(c => c.data));
  
  // Decompress
  const rawData = zlib.inflateSync(combined);
  
  // Recompress with max compression
  const recompressed = zlib.deflateSync(rawData, { level: 9 });
  
  // Rebuild: merge all IDAT into one chunk with new CRC
  const crypto = require('crypto');
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  
  const typeBytes = Buffer.from('IDAT');
  const crcVal = crc32(Buffer.concat([typeBytes, recompressed]));
  const newCrc = Buffer.allocUnsafe(4);
  newCrc.writeUInt32BE(crcVal, 0);
  
  const newChunks = chunks.filter(c => c.type !== 'IDAT');
  const iendIdx = newChunks.findIndex(c => c.type === 'IEND');
  newChunks.splice(iendIdx, 0, { type: 'IDAT', data: recompressed, crc: newCrc });
  
  const outBuf = writePNG(signature, newChunks);
  fs.writeFileSync(output, outBuf);
  
  process.stdout.write('Original: ' + originalSize + ' bytes (' + Math.round(originalSize/1024) + 'KB)\n');
  process.stdout.write('Optimized: ' + outBuf.length + ' bytes (' + Math.round(outBuf.length/1024) + 'KB)\n');
  process.stdout.write('Reduction: ' + Math.round((1 - outBuf.length/originalSize)*100) + '%\n');
} catch(e) {
  process.stdout.write('Error: ' + e.message + '\n');
}
