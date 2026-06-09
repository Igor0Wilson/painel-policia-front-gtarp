const fs = require('fs');
const stat = fs.statSync('public/logo.png');
process.stdout.write('Size bytes: ' + stat.size + '\n');
const buf = fs.readFileSync('public/logo.png');
process.stdout.write('PNG magic: ' + buf[0].toString(16) + ' ' + buf[1].toString(16) + ' ' + buf[2].toString(16) + '\n');
process.stdout.write('File valid PNG: ' + (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E) + '\n');
