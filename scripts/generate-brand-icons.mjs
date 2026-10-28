import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = import.meta.dirname;

function loadSharp() {
  try {
    return require('sharp');
  } catch {
    const store = path.join(here, '..', 'node_modules', '.pnpm');
    const candidates = fs.readdirSync(store).filter((name) => name.startsWith('sharp@')).sort();
    if (candidates.length === 0) throw new Error('sharp is not installed');
    return require(path.join(store, candidates.at(-1), 'node_modules', 'sharp'));
  }
}

const sharp = loadSharp();

const bean = `
<path d="M48 13C67 13 81 28 80 47c-1 21-15 35-33 34C29 80 16 66 17 47 18 28 31 13 48 13Z" fill="url(#bean)" stroke="#074C44" stroke-width="2.8"/>
<path d="M22 46C33 33 41 39 48 30C53 24 60 26 66 21" fill="none" stroke="#F8FFFC" stroke-width="5.2" stroke-linecap="round"/>
<circle cx="22" cy="46" r="3.6" fill="#F56765" stroke="#F8FFFC" stroke-width="1.4"/>
<circle cx="39" cy="56" r="3.1" fill="#074C44"/>
<circle cx="58" cy="56" r="3.1" fill="#074C44"/>
<path d="M43 65c3 2.4 7 2.4 10 0" fill="none" stroke="#074C44" stroke-width="2.2" stroke-linecap="round"/>`;

const defs = `
<defs>
<linearGradient id="bean" x1="18" y1="16" x2="78" y2="82" gradientUnits="userSpaceOnUse">
<stop stop-color="#45E0BF"/><stop offset=".55" stop-color="#08B89D"/><stop offset="1" stop-color="#1761A8"/>
</linearGradient>
</defs>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="跑起来 RUNUP">
${defs}
<circle cx="48" cy="48" r="44" fill="#E8FAF4"/>${bean}
</svg>
`;

const anyIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96">
${defs}
<circle cx="48" cy="48" r="44" fill="#E8FAF4"/>${bean}
</svg>
`;

const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 96 96">
${defs}
<rect width="96" height="96" fill="#08B89D"/>
<circle cx="48" cy="48" r="34" fill="#E8FAF4"/>
<g transform="translate(48 48) scale(.66) translate(-48 -48)">${bean}</g>
</svg>
`;

const apple = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 96 96">
${defs}
<rect width="96" height="96" fill="#E8FAF4"/>
<g transform="translate(48 48) scale(.78) translate(-48 -48)">${bean}</g>
</svg>
`;

const targets = ['site-www', 'site-knowledge', 'site-tools'].map((site) =>
  path.join(here, '..', '..', site, 'public'),
);

function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const directory = Buffer.alloc(images.length * 16);
  let offset = header.length + directory.length;
  images.forEach(({ size, png }, index) => {
    const entry = index * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, entry);
    directory.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    directory.writeUInt8(0, entry + 2);
    directory.writeUInt8(0, entry + 3);
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, directory, ...images.map((image) => image.png)]);
}

for (const dir of targets) {
  fs.writeFileSync(path.join(dir, 'favicon.svg'), favicon);
  await sharp(Buffer.from(anyIcon(192))).png().toFile(path.join(dir, 'icon-192.png'));
  await sharp(Buffer.from(anyIcon(512))).png().toFile(path.join(dir, 'icon-512.png'));
  await sharp(Buffer.from(maskable)).png().toFile(path.join(dir, 'icon-maskable-512.png'));
  await sharp(Buffer.from(apple)).png().toFile(path.join(dir, 'apple-touch-icon.png'));
  const png16 = await sharp(Buffer.from(anyIcon(16))).png().toBuffer();
  const png32 = await sharp(Buffer.from(anyIcon(32))).png().toBuffer();
  const png48 = await sharp(Buffer.from(anyIcon(48))).png().toBuffer();
  fs.writeFileSync(path.join(dir, 'favicon-16x16.png'), png16);
  fs.writeFileSync(path.join(dir, 'favicon-32x32.png'), png32);
  fs.writeFileSync(
    path.join(dir, 'favicon.ico'),
    buildIco([
      { size: 16, png: png16 },
      { size: 32, png: png32 },
      { size: 48, png: png48 },
    ]),
  );
}

console.log('brand icons written to', targets.join(', '));
