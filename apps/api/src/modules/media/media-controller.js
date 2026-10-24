const { Readable } = require('node:stream');
const path = require('node:path');
const fs = require('node:fs');
const { BadRequestError, NotFoundError } = require('../../shared/errors');

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

async function parseMultipartFormData(req) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return { fields: req.body || {}, file: null };
  }

  const webStream = Readable.toWeb(req);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v) {
      headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    }
  }

  const response = new Response(webStream, { headers });
  const formData = await response.formData();
  const fields = {};
  let file = null;

  for (const [key, value] of formData.entries()) {
    if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
      if (!file) {
        const buffer = Buffer.from(await value.arrayBuffer());
        file = {
          buffer,
          originalname: value.name || 'upload.jpg',
          mimetype: value.type || '',
          size: buffer.length
        };
      }
    } else {
      fields[key] = value;
    }
  }

  return { fields, file };
}

class MediaController {
  constructor({ mediaService, storageAdapter, logger }) {
    this.mediaService = mediaService;
    this.storageAdapter = storageAdapter;
    this.logger = logger;
  }

  uploadStandalone = async (req, res, next) => {
    try {
      const { fields, file } = await parseMultipartFormData(req);

      if (!file) {
        throw new BadRequestError('No image file was uploaded.', { file: 'File is required' });
      }

      const subDir = fields.directory === 'banners' ? 'banners' : 'products';
      const result = await this.mediaService.saveImage({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        subDir
      });

      return res.status(201).json({
        data: {
          image_path: result.imagePath,
          filename: result.filename,
          size_bytes: result.sizeBytes,
          mime_type: result.mimeType
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  };

  serveImage = async (req, res, next) => {
    try {
      const { filename, subDir } = req.params;

      // Restrict filename strictly to alphanumeric + dash + uuid + valid image extension
      const safeFilenameRegex = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i;
      if (!safeFilenameRegex.test(filename)) {
        throw new BadRequestError('Invalid filename format.');
      }

      // If subDir is supplied, restrict strictly to known catalog directories
      if (subDir && !['products', 'banners'].includes(subDir)) {
        throw new BadRequestError('Invalid image directory.');
      }

      const relativePath = subDir ? `${subDir}/${filename}` : filename;
      const exists = await this.storageAdapter.fileExists(relativePath);
      if (!exists) {
        throw new NotFoundError('Image not found.');
      }

      const absolutePath = this.storageAdapter.getAbsolutePath(relativePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeType = EXT_TO_MIME[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

      const stream = fs.createReadStream(absolutePath);
      stream.on('error', (err) => next(err));
      stream.pipe(res);
    } catch (err) {
      return next(err);
    }
  };
}

function createMediaController({ mediaService, storageAdapter, logger }) {
  return new MediaController({ mediaService, storageAdapter, logger });
}

module.exports = {
  parseMultipartFormData,
  MediaController,
  createMediaController
};
