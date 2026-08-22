#!/bin/zsh
# Render the 25 story close-ups in one printing: ./tools/closeups/render.sh light|dark
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
THEME=${1:-light}
OUT="$ROOT/closeups"; mkdir -p "$OUT"
TMP="$(mktemp -d)"
cat "$HERE"/{figures,built,instruments,ice,land}.js "$HERE/compositions.js" "$HERE/composer.js" > "$TMP/vignettes.js"
cat > "$TMP/stub.js" <<JS
const hex=c=>{const m=/^#([0-9a-f]{6})$/i.exec(String(c).trim());return m?[0,2,4].map(i=>parseInt(m[1].substr(i,2),16)):null;};
const toHex=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
global.gsap={utils:{interpolate:(a,b,t)=>{const ca=hex(a),cb=hex(b);return ca&&cb?toHex(ca.map((v,i)=>v+(cb[i]-v)*t)):a+(b-a)*t;},clamp:(lo,hi,v)=>Math.max(lo,Math.min(hi,v))}};
global.window=global; global.addEventListener=()=>{}; global.MutationObserver=class{observe(){}};
global.innerWidth=1400; global.MRI_THEME=process.env.THEME||'light';
global.MRI_PLATE_STYLE='survey'; global.MRI_SURVEY_DECOR=true;
global.MRI_SURVEY_FOCUS=Number(process.env.FOCUS);
global.document={querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({set innerHTML(v){},get firstElementChild(){return null;}}),createElementNS:()=>({setAttribute(){},appendChild(){}})};
require('$ROOT/stories-data.js'); require('$TMP/vignettes.js'); require('$ROOT/plate.js');
process.stdout.write(window.MRI_PLATE.svg);
JS
cat > "$TMP/frame.html" <<'HTML'
<!doctype html><meta charset=utf-8><style>body{margin:0;background:#000}</style><img id=i style="width:1800px;display:block"><script>document.getElementById('i').src=location.search.slice(1);</script>
HTML
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for n in $(seq 1 25); do
  NN=$(printf "%02d" $n)
  THEME=$THEME FOCUS=$n node "$TMP/stub.js" > "$OUT/story-$NN-$THEME.svg"
  cp "$OUT/story-$NN-$THEME.svg" "$TMP/cur.svg"
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1800,1200 --screenshot="$OUT/story-$NN-$THEME.png" "file://$TMP/frame.html?cur.svg" 2>/dev/null
  echo "  story $NN ($THEME)"
done
rm -rf "$TMP"
echo "done: $OUT"
