import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { projectRoot } from './load-env.mjs';

const coreDir = path.join(projectRoot, 'packages', 'core');
const outputDir = path.join(projectRoot, 'core-dist');
const corePackage = JSON.parse(fs.readFileSync(path.join(coreDir, 'package.json'), 'utf8'));

fs.mkdirSync(outputDir, { recursive: true });
const expected = `${corePackage.name.replace('@', '').replace('/', '-')}-${corePackage.version}.tgz`;
const output = path.join(outputDir, expected);
fs.rmSync(output, { force: true });

execFileSync('pnpm', ['pack', '--pack-destination', outputDir], {
  cwd: coreDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (!fs.existsSync(output)) {
  throw new Error(`Expected pack output was not created: ${output}`);
}
const sha256 = createHash('sha256').update(fs.readFileSync(output)).digest('hex');
fs.writeFileSync(`${output}.sha256`, `${sha256}  ${expected}\n`);
const lock = {
  name: corePackage.name,
  version: corePackage.version,
  artifact: expected,
  sha256,
  packedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(outputDir, 'core.lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Packed ${corePackage.name}@${corePackage.version}: ${output}`);
console.log(`SHA-256 ${sha256}`);
