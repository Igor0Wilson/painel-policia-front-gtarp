const fs = require('node:fs');

async function run() {
  const res = await fetch('https://burp.com.br/calculadora/');
  const html = await res.text();
  fs.writeFileSync('d:\\Painel Coop\\scratch\\calc_raw.html', html);
  console.log('Done!');
}
run();
