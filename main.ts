import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const MAX_BYTES = 1048576;
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

function requireValid(condition: boolean): asserts condition {
  if (!condition) throw new Error('Invalid image');
}

function dimensions(width: number, height: number): void {
  requireValid(width >= 1 && width <= 1024 && height >= 1 && height <= 1024);
}

// PNG uses the reflected IEEE CRC32 polynomial, with an initial/final XOR.
const crcTable = new Uint32Array(256);
for (let i = 0; i < crcTable.length; i++) {
  let value = i;
  for (let bit = 0; bit < 8; bit++) {
    value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  crcTable[i] = value >>> 0;
}

function crc32(bytes: Buffer, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 255];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validatePng(bytes: Buffer): void {
  let offset = 8;
  let sawHeader = false;
  let sawData = false;
  while (offset < bytes.length) {
    requireValid(bytes.length - offset >= 12);
    const length = bytes.readUInt32BE(offset);
    requireValid(length <= bytes.length - offset - 12);
    const data = offset + 8;
    const end = data + length;
    // Chunk names are four ASCII letters; the reserved third letter is uppercase.
    for (let i = offset + 4; i < data; i++) {
      const letter = bytes[i];
      requireValid((letter >= 65 && letter <= 90) || (letter >= 97 && letter <= 122));
    }
    requireValid((bytes[offset + 6] & 32) === 0);
    const type = bytes.toString('ascii', offset + 4, data);
    requireValid(crc32(bytes, offset + 4, end) === bytes.readUInt32BE(end));
    if (!sawHeader) requireValid(type === 'IHDR');
    if (type === 'IHDR') {
      requireValid(!sawHeader && length === 13);
      dimensions(bytes.readUInt32BE(data), bytes.readUInt32BE(data + 4));
      const depths: Record<number, number[]> = {
        0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16],
      };
      requireValid(depths[bytes[data + 9]]?.includes(bytes[data + 8]) === true);
      requireValid(bytes[data + 10] === 0 && bytes[data + 11] === 0 && bytes[data + 12] <= 1);
      sawHeader = true;
    }
    if (type === 'IDAT') sawData = true;
    offset = end + 4;
    if (type === 'IEND') {
      requireValid(length === 0 && sawHeader && sawData && offset === bytes.length);
      return;
    }
  }
  requireValid(false); // A complete PNG must end with IEND.
}

function validateJpeg(bytes: Buffer): void {
  let offset = 2;
  let sawFrame = false;
  let sawScan = false;
  let inScan = false;
  while (offset < bytes.length) {
    if (inScan) {
      // Entropy bytes continue until the next marker prefix.
      while (offset < bytes.length && bytes[offset] !== 0xff) offset++;
    }
    requireValid(offset < bytes.length && bytes[offset++] === 0xff);
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    requireValid(offset < bytes.length);
    const marker = bytes[offset++];
    // Stuffed FF bytes and restart markers belong to entropy-coded scans.
    if (inScan && (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7))) {
      continue;
    }
    if (marker === 0xd9) {
      requireValid(sawFrame && sawScan && offset === bytes.length);
      return;
    }
    requireValid(marker !== 0x00 && marker !== 0xd8);
    requireValid(marker < 0xd0 || marker > 0xd7);
    inScan = false;
    if (marker === 0x01) continue; // TEM is the other standalone marker.
    requireValid(bytes.length - offset >= 2);
    const length = bytes.readUInt16BE(offset);
    requireValid(length >= 2 && length <= bytes.length - offset);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      requireValid(!sawFrame && length >= 8);
      const components = bytes[offset + 7];
      requireValid(components > 0 && length === 8 + 3 * components);
      dimensions(bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3));
      sawFrame = true;
    } else if (marker >= 0xc0 && marker <= 0xcf &&
               marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      requireValid(false); // Only SOF0, SOF1 and SOF2 are supported.
    }
    if (marker === 0xda) {
      requireValid(sawFrame && length >= 6);
      const components = bytes[offset + 2];
      requireValid(components > 0 && length === 6 + 2 * components);
      sawScan = true;
      inScan = true;
    }
    offset += length;
  }
  requireValid(false); // Truncated JPEG or missing EOI.
}

try {
  const directory = dirname(fileURLToPath(import.meta.url));
  const bytes = readFileSync(join(directory, 'entry.png'));
  requireValid(bytes.length >= 1 && bytes.length <= MAX_BYTES);
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    validatePng(bytes);
  } else {
    requireValid(bytes.length >= 3 && bytes[0] === 0xff &&
                 bytes[1] === 0xd8 && bytes[2] === 0xff);
    validateJpeg(bytes);
  }
  const output = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  mkdirSync(output, { recursive: true });
  writeFileSync(join(output, 'entry.png'), bytes);
  process.stdout.write('entry ok\n');
} catch {
  process.stderr.write('entry error\n');
  process.exitCode = 1;
}
