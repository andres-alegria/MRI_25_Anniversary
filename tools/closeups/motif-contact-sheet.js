// Renders a contact sheet of every motif in a group file.
//   node harness.js <group.js>        (THEME=dark for the night palette)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const file = path.resolve(process.argv[2]);
const PAL = {
  light: { paper:'#f2eddf', paperHigh:'#f7f4ea', ink:'#3d3a31', inkSoft:'#6b665a', shade:'#3d3a31',
           wash:'#e7e2cf', stone:'#b5ab93', sage:'#a4b18e', sageDeep:'#7f9878', ice:'#e9f1f2',
           iceLine:'#7fa3c0', water:'#4f83a8', waterPale:'#cfdfe6', moraine:'#8a7f68', red:'#a83e35', blue:'#0067B2' },
  dark:  { paper:'#0B1F2E', paperHigh:'#E6EFF5', ink:'#C3D3DD', inkSoft:'#8AA2B2', shade:'#000000',
           wash:'#14293A', stone:'#3C5266', sage:'#2E4A3C', sageDeep:'#6D9179', ice:'#A9C6DA',
           iceLine:'#7FACCA', water:'#5FA8D8', waterPale:'#2C4A63', moraine:'#8B94A0', red:'#E07A66', blue:'#4FA3D9' }
};
const S = PAL[process.env.THEME || 'light'];
const hex=c=>{const m=/^#([0-9a-f]{6})$/i.exec(String(c).trim());return m?[0,2,4].map(i=>parseInt(m[1].substr(i,2),16)):null;};
const toHex=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
const MIX=(a,b,t)=>{const ca=hex(a),cb=hex(b);return ca&&cb?toHex(ca.map((v,i)=>v+(cb[i]-v)*t)):a;};
let seed = 12345; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
global.window = global;
require(file);
const names = Object.keys(window.MRI_MOTIFS || {});
if (!names.length) { console.error('no motifs registered'); process.exit(1); }
const COLS = 4, CW = 190, CH = 150;
const rows = Math.ceil(names.length / COLS);
const W = COLS * CW, H = rows * CH;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W*2}" height="${H*2}">`;
svg += `<rect width="${W}" height="${H}" fill="${S.paper}"/>`;
names.forEach((n, i) => {
  const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH;
  svg += `<rect x="${cx+2}" y="${cy+2}" width="${CW-4}" height="${CH-4}" fill="none" stroke="${S.inkSoft}" stroke-width="0.4" opacity="0.4"/>`;
  svg += `<text x="${cx+8}" y="${cy+14}" font-family="monospace" font-size="8" fill="${S.inkSoft}">${n}</text>`;
  try {
    svg += window.MRI_MOTIFS[n]({S, rand, MIX}, cx + 52, cy + 108, 1, {});
    svg += window.MRI_MOTIFS[n]({S, rand, MIX}, cx + 135, cy + 130, 1.6, {flip: true});
  } catch (e) { svg += `<text x="${cx+8}" y="${cy+60}" font-size="8" fill="red">${String(e.message).slice(0,40)}</text>`; console.error(n, e.message); }
});
svg += `</svg>`;
const out = file.replace(/\.js$/, '') + (process.env.THEME === 'dark' ? '.dark' : '') + '.contact';
fs.writeFileSync(out + '.svg', svg);
const html = out + '.html';
fs.writeFileSync(html, `<!doctype html><style>body{margin:0}</style><img src="${path.basename(out)}.svg" style="width:${W*2}px;display:block">`);
cp.execSync(`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --window-size=${W*2},${H*2} --screenshot="${out}.png" "file://${html}" 2>/dev/null`);
cp.execSync(`python3 -c "from PIL import Image; im=Image.open('${out}.png'); im.convert('RGB').save('${out}.jpg', quality=80)"`);
console.log('motifs:', names.length, '->', out + '.jpg');
