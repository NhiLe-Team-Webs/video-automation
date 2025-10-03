import {cpSync, existsSync, lstatSync, mkdirSync, rmSync, symlinkSync} from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(path.join(process.cwd(), '..'));
const assetsDir = path.join(projectRoot, 'assets');
const publicDir = path.join(process.cwd(), 'public');
const target = path.join(publicDir, 'assets');

if (!existsSync(assetsDir)) {
  console.error(`[assets] Shared assets directory not found: ${assetsDir}`);
  process.exit(1);
}

mkdirSync(publicDir, {recursive: true});

const ensureRemoved = () => {
  if (!existsSync(target)) {
    return;
  }
  const stats = lstatSync(target);
  if (stats.isSymbolicLink() || stats.isDirectory()) {
    rmSync(target, {recursive: true, force: true});
  } else {
    rmSync(target, {force: true});
  }
};

const createSymlink = () => {
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  try {
    symlinkSync(assetsDir, target, linkType);
    console.log(`[assets] Symlinked ${target} -> ${assetsDir}`);
    return true;
  } catch (error) {
    console.warn(`[assets] Failed to create symlink: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

const copyFallback = () => {
  cpSync(assetsDir, target, {recursive: true});
  console.log(`[assets] Copied assets into ${target}`);
};

ensureRemoved();
if (!createSymlink()) {
  copyFallback();
}
