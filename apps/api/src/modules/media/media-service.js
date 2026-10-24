const crypto = require('node:crypto');
const { ValidationError, BadRequestError } = require('../../shared/errors');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // JPEG: Starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: Starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // WebP: Starts with RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  return null;
}

class MediaService {
  constructor({ storageAdapter, dataSource, config, logger }) {
    this.storageAdapter = storageAdapter;
    this.dataSource = dataSource;
    this.config = config;
    this.logger = logger;
    this.maxUploadSizeBytes = (config && config.MAX_UPLOAD_SIZE_BYTES) || 5 * 1024 * 1024;
  }

  validateImage({ buffer, mimetype }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new BadRequestError('No image file payload provided.', { file: 'File is required' });
    }

    if (buffer.length === 0) {
      throw new ValidationError('Uploaded file is empty.', { file: 'File cannot be empty' });
    }

    if (buffer.length > this.maxUploadSizeBytes) {
      const maxMb = (this.maxUploadSizeBytes / (1024 * 1024)).toFixed(1);
      throw new ValidationError(`File exceeds maximum upload size of ${maxMb}MB.`, {
        file: `File size must be <= ${maxMb}MB`
      });
    }

    const detected = detectImageFormat(buffer);
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new ValidationError(
        'Invalid image content. Only JPEG, PNG, and WebP formats are allowed.',
        { file: 'Invalid image format or corrupted file' }
      );
    }

    // Reject mismatch between client-claimed mimetype and actual magic bytes
    if (mimetype && mimetype !== detected.mime) {
      // Allow minor standard alias image/jpg vs image/jpeg
      const isAlias =
        (mimetype === 'image/jpg' && detected.mime === 'image/jpeg') ||
        (mimetype === 'image/jpeg' && detected.mime === 'image/jpg');
      if (!isAlias) {
        throw new ValidationError('File extension/MIME type does not match actual image content.', {
          file: 'MIME type mismatch'
        });
      }
    }

    return detected;
  }

  async saveImage({ buffer, originalname, mimetype, subDir = 'products' }) {
    const detected = this.validateImage({ buffer, originalname, mimetype });

    // Generate non-guessable, path-traversal-proof server-side filename
    const safeFilename = `${crypto.randomUUID()}.${detected.ext}`;

    const relativePath = await this.storageAdapter.saveFile({
      buffer,
      filename: safeFilename,
      subDir
    });

    return {
      imagePath: relativePath,
      filename: safeFilename,
      sizeBytes: buffer.length,
      mimeType: detected.mime
    };
  }

  /**
   * Safe deletion: only removes physical file from storage if no other records
   * in product_images or banners reference this imagePath.
   */
  async safeDeleteImageFile(imagePath) {
    if (!imagePath) return false;

    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        const result = await this.dataSource.query(
          `SELECT 
            (SELECT COUNT(*) FROM product_images WHERE image_path = $1) +
            (SELECT COUNT(*) FROM banners WHERE image_path = $1) AS ref_count`,
          [imagePath]
        );

        const refCount = parseInt(result[0]?.ref_count || '0', 10);
        if (refCount > 0) {
          if (this.logger) {
            this.logger.info(
              { imagePath, refCount },
              'Image file still referenced by catalog/banners; physical deletion skipped.'
            );
          }
          return false;
        }
      } catch (err) {
        if (this.logger) {
          this.logger.error({ err, imagePath }, 'Failed to check image file reference count');
        }
        // Do not delete physical file if reference query fails
        return false;
      }
    }

    return this.storageAdapter.deleteFile(imagePath);
  }
}

function createMediaService({ storageAdapter, dataSource, config, logger }) {
  return new MediaService({ storageAdapter, dataSource, config, logger });
}

module.exports = {
  detectImageFormat,
  MediaService,
  createMediaService
};
