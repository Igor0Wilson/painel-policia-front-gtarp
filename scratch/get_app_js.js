const fs = require('node:fs');

async function run() {
  const res = await fetch('https://burp.com.br/calculadora/assets/js/app.js');
  const js = await res.text();
  fs.writeFileSync('d:\\Painel Coop\\scratch\\app_js.js', js);
  console.log('Done!');
}
run();
