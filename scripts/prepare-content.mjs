import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { projectRoot } from './load-env.mjs';

const require = createRequire(import.meta.url);
const publicDir = path.join(projectRoot, 'public');
const cesiumTarget = path.join(publicDir, 'cesium');
const versionFile = path.join(cesiumTarget, '.version');

fs.mkdirSync(publicDir, { recursive: true });

const cesiumPackagePath = require.resolve('cesium/package.json', { paths: [projectRoot] });
const cesiumPackage = JSON.parse(fs.readFileSync(cesiumPackagePath, 'utf8'));
const cesiumBuild = path.join(path.dirname(cesiumPackagePath), 'Build', 'Cesium');
const runtimeFolders = ['Workers', 'Assets', 'ThirdParty', 'Widgets'];

if (!fs.existsSync(cesiumBuild)) {
  throw new Error(`Cesium build directory not found: ${cesiumBuild}`);
}

const installedVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : '';
const complete = runtimeFolders.every((folder) => fs.existsSync(path.join(cesiumTarget, folder)));

if (installedVersion !== cesiumPackage.version || !complete) {
  fs.rmSync(cesiumTarget, { recursive: true, force: true });
  fs.mkdirSync(cesiumTarget, { recursive: true });
  for (const folder of runtimeFolders) {
    fs.cpSync(path.join(cesiumBuild, folder), path.join(cesiumTarget, folder), { recursive: true });
  }
  fs.writeFileSync(versionFile, `${cesiumPackage.version}\n`);
  console.log(`Prepared Cesium ${cesiumPackage.version} runtime assets in public/cesium.`);
} else {
  console.log(`Cesium ${cesiumPackage.version} runtime assets already prepared.`);
}

const texture = path.join(publicDir, 'textures', 'earth-blue-marble-2048.jpg');
if (!fs.existsSync(texture)) {
  throw new Error('Missing satellite texture: public/textures/earth-blue-marble-2048.jpg');
}
const textureBytes = fs.statSync(texture).size;
console.log(`Satellite texture: ${(textureBytes / 1024 / 1024).toFixed(2)} MiB.`);
