// Generates a valid 1080x1080 solid-color PNG that passes Meta's image validator (>=320px minimum)
import zlib from 'node:zlib';
import fs   from 'node:fs';
import { Buffer } from 'node:buffer';

const W = 1080, H = 1080;

// Build IHDR chunk (13 bytes data)
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n, 0); return b; }
function chunk(type, data) {
  const len = u32(data.length);
  const typ = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  // CRC over type+data
  const crcVal = crc32(Buffer.concat([typ, data]));
  crc.writeUInt32BE(crcVal >>> 0, 0);
  return Buffer.concat([len, typ, data, crc]);
}

// Pure JS CRC32
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = (table[(crc ^ b) & 0xFF] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Signature
const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// IHDR: width=1080, height=1080, bit_depth=8, color_type=2 (RGB), compression=0, filter=0, interlace=0
const ihdr = Buffer.concat([
  u32(W), u32(H),
  Buffer.from([8, 2, 0, 0, 0]),
]);

// IDAT: for each row, 1-byte filter prefix (0 = None) + W*3 RGB bytes (red = 224, 23, 60 -- Propulsar red-ish)
const R = 224, G = 23, B = 60;
const row = Buffer.alloc(1 + W * 3);
row[0] = 0; // filter None
for (let x = 0; x < W; x++) { row[1 + x*3] = R; row[1 + x*3 + 1] = G; row[1 + x*3 + 2] = B; }
const raw = Buffer.alloc(H * row.length);
for (let y = 0; y < H; y++) row.copy(raw, y * row.length);
const idat = zlib.deflateSync(raw, { level: 9 });

const iend = Buffer.alloc(0);

const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', iend),
]);

const outPath = process.argv[2] || './valid-test.png';
fs.writeFileSync(outPath, png);
console.log(`wrote ${png.length} bytes (${W}x${H} PNG) to ${outPath}`);
