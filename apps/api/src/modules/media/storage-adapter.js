const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

/**
 * StorageAdapter interface contract:
 * - saveFile({ buffer, filename, directory }): Promise<string> (returns relative path/key)
 * - deleteFile(relativePath): Promise<boolean>
 * - fileExists(relativePath): Promise<boolean>
 * - getAbsolutePath(relativePath): string
 */
class LocalStorageAdapter {
  constructor({ baseDir }) {
    if (!baseDir) {
      throw new Error('LocalStorageAdapter requires baseDir.');
    }
    this.baseDir = path.resolve(baseDir);
    this.ensureBaseDir();
  }

  ensureBaseDir() {
    if (!fsSync.existsSync(this.baseDir)) {
      fsSync.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getAbsolutePath(relativePath) {
    if (!relativePath) {
      throw new Error('relativePath is required.');
    }
    // Prevent directory traversal attacks
    const safeRelative = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolute = path.resolve(this.baseDir, safeRelative);
    if (!absolute.startsWith(this.baseDir)) {
      throw new Error('Access denied: path traversal detected.');
    }
    return absolute;
  }

  async saveFile({ buffer, filename, subDir = '' }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('A valid Buffer is required to save a file.');
    }
    if (!filename) {
      throw new Error('filename is required.');
    }

    const targetDir = subDir ? path.resolve(this.baseDir, subDir) : this.baseDir;
    if (!targetDir.startsWith(this.baseDir)) {
      throw new Error('Access denied: directory traversal detected.');
    }

    await fs.mkdir(targetDir, { recursive: true });

    const safeFilename = path.basename(filename);
    const destination = path.join(targetDir, safeFilename);

    await fs.writeFile(destination, buffer);

    const relativePath = subDir
      ? path.join(subDir, safeFilename).replace(/\\/g, '/')
      : safeFilename;

    return relativePath;
  }

  async deleteFile(relativePath) {
    try {
      const absolutePath = this.getAbsolutePath(relativePath);
      await fs.unlink(absolutePath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  async fileExists(relativePath) {
    try {
      const absolutePath = this.getAbsolutePath(relativePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }
}

function createStorageAdapter(config) {
  return new LocalStorageAdapter({ baseDir: config.UPLOAD_DIR });
}

module.exports = {
  LocalStorageAdapter,
  createStorageAdapter
};
