import { loadContent, defaultContentRoots } from '../packages/core/src/content/load.ts';

const content = loadContent({ roots: defaultContentRoots(), allowUnreviewed: false });
const routes = content.visible('route');
if (routes.length === 0) {
  console.error('Production content guard failed: no published route is available.');
  process.exit(1);
}
console.log(
  `Production content guard passed: route=${routes.length}, knowledge=${content.visible('knowledge').length}, tool=${content.visible('tool').length}.`,
);
