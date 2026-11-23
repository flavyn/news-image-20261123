// The Daily Signal, 23 November 2026. Hand-drawn raster graphics; no assets,
// fonts, network requests, clock reads, or third-party packages at runtime.
// Run: node main.ts [output.png] (Node 22.18+). Default: output.png.
// Editorial snapshot, checked 2026-11-23:
// https://korea.stream/en/world?src=Bloomberg (publisher-linked newswire)
// https://srihayavadhana.com/newsmriti/headlines/23-november-2026/ (sports)
// https://www.ndtv.com/education/school-assembly-news-headlines-november-23-top-national-international-news-12362644
// Labels are condensed summaries, not verbatim headlines. Allegations stay
// qualified. Illustrations are symbolic, not documentary photographs.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1024, H = 1024, SS = 2, SW = W * SS;
type Color = readonly [number, number, number];
const ink: Color = [25, 42, 45], paper: Color = [246, 242, 230];
const muted: Color = [91, 105, 102], rule: Color = [205, 207, 193];
const orange: Color = [221, 76, 41], teal: Color = [28, 117, 113];
const white: Color = [255, 252, 242];
const pixels = new Uint8Array(SW * H * SS * 3);

function rect(x: number, y: number, w: number, h: number, c: Color) {
  const x0 = Math.max(0, Math.round(x * SS)), x1 = Math.min(SW, Math.round((x + w) * SS));
  const y0 = Math.max(0, Math.round(y * SS)), y1 = Math.min(H * SS, Math.round((y + h) * SS));
  for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
    const p = (j * SW + i) * 3;
    pixels[p] = c[0]; pixels[p + 1] = c[1]; pixels[p + 2] = c[2];
  }
}
function circle(x: number, y: number, r: number, c: Color) {
  for (let j = Math.max(0, Math.floor((y - r) * SS)); j <= Math.min(H * SS - 1, Math.ceil((y + r) * SS)); j++) {
    const dy = (j + 0.5) / SS - y;
    if (Math.abs(dy) > r) continue;
    const dx = Math.sqrt(r * r - dy * dy);
    rect(x - dx, j / SS, dx * 2, 1 / SS, c);
  }
}
function line(x1: number, y1: number, x2: number, y2: number, width: number, c: Color) {
  const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * SS));
  for (let i = 0; i <= n; i++) circle(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, width / 2, c);
}
function poly(points: number[][], c: Color) {
  const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p[1])) * SS));
  const maxY = Math.min(H * SS - 1, Math.ceil(Math.max(...points.map(p => p[1])) * SS));
  for (let j = minY; j <= maxY; j++) {
    const y = (j + 0.5) / SS, hits: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
        hits.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) rect(hits[i], j / SS, hits[i + 1] - hits[i], 1 / SS, c);
  }
}

// Original compact 5x7 uppercase alphabet. Drawn in code for portability.
const glyphs: Record<string, string> = {
  A:'01110/11011/11011/11111/11011/11011/11011',
  B:'11110/11011/11011/11110/11011/11011/11110',
  C:'01111/11000/11000/11000/11000/11000/01111',
  D:'11110/11011/11011/11011/11011/11011/11110',
  E:'11111/11000/11000/11110/11000/11000/11111',
  F:'11111/11000/11000/11110/11000/11000/11000',
  G:'01111/11000/11000/11011/11011/11011/01110',
  H:'11011/11011/11011/11111/11011/11011/11011',
  I:'111/010/010/010/010/010/111',
  J:'00111/00011/00011/00011/11011/11011/01110',
  K:'11011/11011/11110/11100/11110/11011/11011',
  L:'11000/11000/11000/11000/11000/11000/11111',
  M:'10001/11011/11111/10101/10101/10101/10101',
  N:'10001/11001/11101/10111/10011/10001/10001',
  O:'01110/11011/11011/11011/11011/11011/01110',
  P:'11110/11011/11011/11110/11000/11000/11000',
  Q:'01110/11011/11011/11011/11111/01110/00011',
  R:'11110/11011/11011/11110/11100/11010/11011',
  S:'01111/11000/11000/01110/00011/00011/11110',
  T:'11111/00100/00100/00100/00100/00100/00100',
  U:'11011/11011/11011/11011/11011/11011/01110',
  V:'11011/11011/11011/11011/11011/01010/00100',
  W:'10001/10001/10101/10101/11111/11011/10001',
  X:'11011/11011/01010/00100/01010/11011/11011',
  Y:'11011/11011/01010/00100/00100/00100/00100',
  Z:'11111/00011/00110/01100/11000/11000/11111',
  '0':'01110/11011/11011/11011/11011/11011/01110',
  '1':'010/110/010/010/010/010/111',
  '2':'11110/00011/00011/01110/11000/11000/11111',
  '3':'11110/00011/00011/01110/00011/00011/11110',
  '4':'11011/11011/11011/11111/00011/00011/00011',
  '5':'11111/11000/11000/11110/00011/00011/11110',
  '6':'01110/11000/11000/11110/11011/11011/01110',
  '7':'11111/00011/00110/00100/01100/01100/01100',
  '8':'01110/11011/11011/01110/11011/11011/01110',
  '9':'01110/11011/11011/01111/00011/00011/01110',
  '.':'0/0/0/0/0/1/1', ',':'00/00/00/00/01/01/10',
  ':':'0/1/1/0/1/1/0', '-':'000/000/000/111/000/000/000',
  '/':'00001/00010/00010/00100/01000/01000/10000',
  '+':'00000/00100/00100/11111/00100/00100/00000',
  "'":'1/1/0/0/0/0/0', ' ':'000/000/000/000/000/000/000',
};
function textWidth(s: string, size: number) {
  return [...s].reduce((w, ch) => w + ((glyphs[ch]?.split('/')[0].length ?? 5) + 1) * size, -size);
}
function text(s: string, x: number, y: number, size: number, c: Color = ink) {
  for (const ch of s) {
    const g = glyphs[ch];
    if (!g) throw new Error(`Missing glyph: ${ch}`);
    const rows = g.split('/');
    rows.forEach((row, j) => [...row].forEach((v, i) => {
      if (v === '1') rect(x + i * size, y + j * size, size, size, c);
    }));
    x += (rows[0].length + 1) * size;
  }
}
function fit(s: string, x: number, y: number, max: number, size: number, c: Color = ink) {
  text(s, x, y, Math.min(size, max / textWidth(s, 1)), c);
}

type Story = { category: string; label: string[]; icon: string; bg: Color; source: string };
const stories: Story[] = [
  {category:'CLIMATE', label:['COP31','NO DEAL'], icon:'earth', bg:[213,229,211], source:'BBC / NYT'},
  {category:'LIBYA', label:['RUSSIAN','SHIP HIT'], icon:'ship', bg:[216,230,228], source:'REUTERS'},
  {category:'US POLITICS', label:['DEMOCRATS','TAKE HOUSE'], icon:'capitol', bg:[226,225,239], source:'BBC'},
  {category:'INDONESIA', label:['DEADLY','FACTORY FIRE'], icon:'fire', bg:[245,219,195], source:'BBC'},
  {category:'TECHNOLOGY', label:['MODI ON','AI AND JOBS'], icon:'chip', bg:[218,229,207], source:'NDTV'},
  {category:'EUROPE', label:['EU BIG','TECH TAX'], icon:'euro', bg:[224,225,241], source:'NDTV'},
  {category:'FOOTBALL', label:['LIVERPOOL','BEAT UNITED'], icon:'ball', bg:[237,214,205], source:'AL JAZEERA'},
  {category:'CRICKET', label:['PAKISTAN A','BEAT INDIA A'], icon:'bat', bg:[214,231,210], source:'NDTV SPORTS'},
  {category:'GULF', label:['HORMUZ','ON EDGE'], icon:'oil', bg:[241,226,191], source:'EURONEWS'},
  {category:'BRITAIN', label:['NHS FACES','HARD CUTS'], icon:'health', bg:[214,229,232], source:'GUARDIAN'},
];
// Twenty additional, distinct stories from the publisher-linked newswire.
const wire = [
  ['MUSIC','MELDRUM DIES'], ['US HEALTH','EL-SAYED PLAN'],
  ['AUSTRALIA','ONLINE SAFETY'], ['WEST BANK','ARSON ATTACKS'],
  ['TECH','HUANG AFFAIR'], ['AUSTRALIA','DATA LOBBYING'],
  ['UKRAINE','STRIKE SEARCH'], ['LEBANON','VILLAGERS BACK'],
  ['UK WELFARE','PIP OVERHAUL'], ['TAX','PARIS WEALTH PUSH'],
  ['US FILES','BIGFOOT RELEASE'], ['IOWA','EXPLOSIVES ROW'],
  ['DEFENCE','DRONE EXERCISE'], ['UK TAX','OFFSHORE FUNDS'],
  ['SOMALIA','UAE RIFT'], ['SUDAN','DRONE DEATHS'],
  ['TRAVEL','CHINA EXIT RISKS'], ['HEALTH','AMISH MEASLES'],
  ['CULTURE','COOPER CLAIMS'], ['KOREA','MINISTER QUITS'],
];

function icon(kind: string, x: number, y: number, bg: Color) {
  // All coordinates below are local to a 160x110 illustration.
  const R = (a: number,b: number,w: number,h: number,c: Color=ink) => rect(x+a,y+b,w,h,c);
  const C = (a: number,b: number,r: number,c: Color=ink) => circle(x+a,y+b,r,c);
  const L = (a: number,b: number,d: number,e: number,w=4,c: Color=ink) => line(x+a,y+b,x+d,y+e,w,c);
  const P = (p: number[][], c: Color=ink) => poly(p.map(([a,b])=>[x+a,y+b]),c);
  C(80,55,49,white);
  if (kind === 'earth') {
    C(80,55,42,teal); C(80,55,36,bg);
    L(39,55,121,55,3,teal); L(80,14,80,96,3,teal);
    for (let i=-1;i<=1;i+=2) { L(48,55+i*21,112,55+i*21,3,teal); }
    P([[64,19],[53,40],[59,58],[54,73],[75,86],[82,68],[72,54],[87,42]],teal);
    P([[93,22],[108,39],[101,49],[111,69],[92,81],[87,62],[95,45]],teal);
    L(111,17,130,37,7,orange); L(130,17,111,37,7,orange);
  } else if (kind === 'ship' || kind === 'oil') {
    P([[25,64],[135,64],[120,85],[43,85]]);
    R(45,44,78,18,kind==='oil'?orange:teal); R(100,28,20,18); R(108,18,5,12);
    if(kind==='ship') { P([[52,43],[61,16],[70,35],[85,20],[81,44]],orange); R(52,48,31,10,bg); }
    else { for(let i=0;i<3;i++) C(56+i*18,49,9,orange); }
    for(let i=0;i<3;i++) L(25+i*39,93,51+i*39,93,3,teal);
  } else if (kind === 'capitol') {
    R(31,91,99,6); R(38,82,85,6); R(42,47,78,7);
    for(let i=0;i<5;i++) R(48+i*15,58,6,23);
    C(81,38,24,teal); R(52,39,59,7,bg); R(58,40,46,6,teal);
    L(81,5,81,17,3); R(82,5,19,9,orange);
    P([[34,50],[81,28],[128,50]],ink); P([[52,47],[81,34],[110,47]],white);
  } else if (kind === 'fire') {
    R(31,55,102,41); P([[31,55],[59,39],[59,55],[86,39],[86,55],[111,42],[111,55]]);
    R(116,27,12,30); R(44,70,12,14,bg); R(67,70,12,14,bg); R(91,70,12,14,bg);
    P([[63,66],[48,41],[63,15],[70,31],[86,5],[91,33],[109,46],[97,66]],orange);
    P([[72,63],[64,46],[77,32],[80,48],[89,40],[91,60]],[255,194,76]);
  } else if (kind === 'chip') {
    for(let i=0;i<4;i++) { const d=50+i*18; L(d,13,d,27); L(d,85,d,98); L(26,d-24,42,d-24); L(118,d-24,134,d-24); }
    R(41,26,78,60,teal); R(48,33,64,46,white); text('AI',x+60,y+42,4,ink);
    C(124,90,14,orange); L(118,90,123,95,3,white); L(123,95,132,84,3,white);
  } else if (kind === 'euro') {
    C(80,55,42,teal); C(80,55,30,white); R(83,30,40,50,bg);
    L(43,48,91,48,5,teal); L(43,62,91,62,5,teal);
    R(102,55,34,35,orange); R(110,47,18,8,orange); text('+',x+110,y+65,3,white);
    for(let i=0;i<8;i++) { const a=i*Math.PI/4; C(80+Math.cos(a)*48,55+Math.sin(a)*48,2,orange); }
  } else if (kind === 'ball') {
    C(80,55,43,ink); C(80,55,38,white);
    P([[80,33],[99,47],[91,69],[69,69],[61,47]]);
    [[80,33,80,18],[99,47,116,38],[91,69,104,86],[69,69,56,86],[61,47,44,38]].forEach(p=>L(p[0],p[1],p[2],p[3],3));
    R(119,14,13,24,orange); L(22,35,37,35,3,orange); L(17,50,32,50,3,orange);
  } else if (kind === 'bat') {
    L(49,87,49,47,4,teal); L(60,87,60,47,4,teal); L(71,87,71,47,4,teal); L(46,44,74,44,4,teal);
    P([[77,77],[97,89],[126,38],[109,29]],ink); L(118,34,130,15,7,orange);
    C(91,28,12,orange); L(84,24,94,33,2,white);
    L(39,92,134,92,3);
  } else if (kind === 'health') {
    R(49,28,62,69,teal); R(35,47,90,50,teal); R(68,70,23,27,white);
    R(74,35,12,27,white); R(66,43,28,11,white);
    L(107,19,135,47,7,orange); L(135,19,107,47,7,orange);
  } else throw new Error(`Unknown icon: ${kind}`);
}

rect(0,0,W,H,paper);
rect(0,0,W,10,ink);
text('THE',32,31,2.2,teal);
text('DAILY SIGNAL',31,57,11.3);
text('23 NOV',827,36,3.7,orange);
text('2026',866,74,4.5);
rect(32,151,960,3,ink);
text('MONDAY / WORLD EDITION',32,165,1.8,muted);
const strap = '30 STORIES. ONE WORLD.';
text(strap,992-textWidth(strap,1.8),165,1.8,muted);
rect(32,196,26,5,orange);
text('THE BIG TEN',70,192,2.3);
text('YOUR DAY, AT A GLANCE',665,195,1.8,muted);

stories.forEach((story,i)=> {
  const x=32+(i%5)*194, y=225+Math.floor(i/5)*232;
  rect(x,y,184,218,story.bg);
  text(String(i+1).padStart(2,'0'),x+10,y+10,1.6,teal);
  fit(story.category,x+44,y+11,132,1.4,muted);
  icon(story.icon,x+12,y+30,story.bg);
  story.label.forEach((s,j)=>fit(s,x+10,y+150+j*25,164,3));
  fit(story.source,x+10,y+201,160,1.2,muted);
});

rect(32,701,960,3,ink);
text('THE NEWSWIRE',32,716,2.4);
text('20 MORE DEVELOPMENTS',673,720,1.8,muted);
wire.forEach(([category,label],i)=> {
  const x=32+(i%5)*194, y=752+Math.floor(i/5)*54;
  rect(x,y,184,1,rule);
  text(String(i+11),x,y+12,1.5,orange);
  fit(category,x+29,y+9,153,1.25,muted);
  fit(label,x+29,y+27,153,1.65);
});
rect(32,980,960,2,ink);
text('THE DAILY SIGNAL / MAKE.FUN',32,994,1.4,muted);
const foot='23.11.2026 / END OF EDITION';
text(foot,992-textWidth(foot,1.4),994,1.4,muted);

// Box-filter supersampling, then encode standard RGB PNG with filter 0.
const raw=Buffer.alloc((W*3+1)*H);
for(let y=0;y<H;y++) for(let x=0;x<W;x++) for(let c=0;c<3;c++) {
  let value=0;
  for(let dy=0;dy<SS;dy++) for(let dx=0;dx<SS;dx++)
    value+=pixels[((y*SS+dy)*SW+x*SS+dx)*3+c];
  raw[y*(W*3+1)+1+x*3+c]=Math.round(value/(SS*SS));
}
function crc32(data: Uint8Array) {
  let crc=0xffffffff;
  for(const byte of data) {
    crc^=byte;
    for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function chunk(type: string, data: Buffer) {
  const tag=Buffer.from(type,'ascii'), body=Buffer.concat([tag,data]);
  const len=Buffer.alloc(4), crc=Buffer.alloc(4);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len,body,crc]);
}
const header=Buffer.alloc(13);
header.writeUInt32BE(W,0); header.writeUInt32BE(H,4);
header[8]=8; header[9]=2;
const png=Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',header),
  chunk('IDAT',deflateSync(raw,{level:9})), chunk('IEND',Buffer.alloc(0)),
]);
const output=process.argv[2]??'output.png';
writeFileSync(output,png);
console.log(`Rendered ${W}x${H}: ${output} (${png.length} bytes)`);
