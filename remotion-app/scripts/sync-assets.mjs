import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(path.join(process.cwd(), '..'));
const assetsDir = path.join(projectRoot, 'assets');
const sharedPublicDir = path.join(projectRoot, 'public');
const sharedAssetsLink = path.join(sharedPublicDir, 'assets');
const sharedInputDir = path.join(sharedPublicDir, 'input');
const appPublicDir = path.join(process.cwd(), 'public');

const linkType = process.platform === 'win32' ? 'junction' : 'dir';
const shouldAttemptSymlink =
  process.platform !== 'win32' || process.env.ALLOW_WINDOWS_SYMLINKS === 'true';

if (!existsSync(assetsDir)) {
  console.error(`[assets] Shared assets directory not found: ${assetsDir}`);
  process.exit(1);
}

const ensureDir = (dir) => {
  mkdirSync(dir, { recursive: true });
};

const removePath = (targetPath) => {
  if (!existsSync(targetPath)) {
    return;
  }

  const stats = lstatSync(targetPath);

  const removeRecursive = () =>
    rmSync(targetPath, { recursive: true, force: true, maxRetries: 5 });

  try {
    if (stats.isSymbolicLink()) {
      rmSync(targetPath, { force: true });
      return;
    }

    if (stats.isDirectory()) {
      removeRecursive();
      return;
    }

    rmSync(targetPath, { force: true });
  } catch (error) {
    if (
      error?.code === 'ERR_FS_EISDIR' ||
      error?.code === 'EISDIR' ||
      error?.code === 'EPERM' ||
      error?.code === 'EACCES'
    ) {
      removeRecursive();
      return;
    }

    throw error;
  }
};

const ensureLinkWithFallback = (source, destination, { label, fallbackCopy }) => {
  removePath(destination);

  if (!shouldAttemptSymlink) {
    if (!fallbackCopy) {
      console.warn(
        `[${label}] Symlinks disabled on Windows; set ALLOW_WINDOWS_SYMLINKS="true" to enable.`
      );
      return false;
    }

    cpSync(source, destination, { recursive: true });
    console.log(
      `[${label}] Copied contents into ${destination} (symlink disabled on Windows)`
    );
    return false;
  }

  try {
    symlinkSync(source, destination, linkType);
    console.log(`[${label}] Symlinked ${destination} -> ${source}`);
    return true;
  } catch (error) {
    console.warn(
      `[${label}] Failed to create symlink: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    if (!fallbackCopy) return false;

    cpSync(source, destination, { recursive: true });
    console.log(`[${label}] Copied contents into ${destination}`);
    return false;
  }
};

// Ensure shared directories exist
ensureDir(sharedPublicDir);
ensureDir(sharedInputDir);

// Create symlink or fallback copy
ensureLinkWithFallback(assetsDir, sharedAssetsLink, {
  label: 'assets',
  fallbackCopy: true,
});
const linkedPublic = ensureLinkWithFallback(sharedPublicDir, appPublicDir, {
  label: 'public',
  fallbackCopy: true,
});

if (!linkedPublic) {
  console.log(
    `[public] Using a copied public workspace. Keep in mind updates under ${sharedPublicDir} will not auto-sync.`
  );
}
