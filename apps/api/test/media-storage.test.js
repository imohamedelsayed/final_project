const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config/env');
const { createLogger } = require('../src/config/logger');
const { createEmailService } = require('../src/modules/auth/email-service');
const { hashPassword } = require('../src/modules/auth/password-service');
const { createSession } = require('../src/modules/auth/session-service');
const { LocalStorageAdapter } = require('../src/modules/media/storage-adapter');
const { getTestDataSource, closeTestDataSource, cleanDatabase } = require('./helpers/db-helper');

const VALID_JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
  Buffer.alloc(200, 0xaa),
  Buffer.from([0xff, 0xd9])
]);

const VALID_PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(200, 0xbb)
]);

const VALID_WEBP = Buffer.concat([
  Buffer.from([0x52, 0x49, 0x46, 0x46]),
  Buffer.from([0x00, 0x01, 0x00, 0x00]),
  Buffer.from([0x57, 0x45, 0x42, 0x50]),
  Buffer.alloc(200, 0xcc)
]);

function createMultipartBody(boundary, fields = {}, file = null) {
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      )
    );
  }

  if (file) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${file.fieldname || 'file'}"; filename="${file.filename}"\r\n` +
          `Content-Type: ${file.mimetype}\r\n\r\n`
      )
    );
    parts.push(file.buffer);
    parts.push(Buffer.from('\r\n'));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(parts);
}

test('Media Storage & Image Security Integration Tests', async (t) => {
  const dataSource = await getTestDataSource();
  const testUploadDir = path.resolve(__dirname, 'temp-uploads-media');
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: dataSource.options.url,
    CORS_ORIGIN: 'http://localhost:3000',
    UPLOAD_DIR: testUploadDir,
    MAX_UPLOAD_SIZE_BYTES: 1024 * 1024, // 1MB limit for tests
    SESSION_SECRET: 'test-session-secret-at-least-32-chars-long-value',
    TOTP_ENCRYPTION_KEY: 'test-totp-encryption-key-32-bytes!'
  });
  const logger = createLogger('silent');
  const emailService = createEmailService({ config, logger });
  const storageAdapter = new LocalStorageAdapter({ baseDir: testUploadDir });
  const app = createApp({ config, logger, dataSource, emailService, storageAdapter });

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let adminUser;
  let adminToken;

  t.beforeEach(async () => {
    await cleanDatabase(dataSource);

    const userRepo = dataSource.getRepository('User');
    const now = new Date();
    const pwHash = await hashPassword('AdminPass123!');

    adminUser = await userRepo.save({
      name: 'Media Admin',
      email: 'media@pixelstore.com',
      password_hash: pwHash,
      role: 'admin',
      email_verified_at: now,
      is_active: true
    });

    const session = await createSession(dataSource, adminUser);
    adminToken = session.token;
  });

  t.after(async () => {
    server.close();
    await cleanDatabase(dataSource);
    await closeTestDataSource();
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // 1. Content validation & format checks
  await t.test('Accepts valid images and rejects invalid/executable/spoofed files', async () => {
    const boundary = '----TestBoundary123';

    // Valid PNG upload
    const validPngBody = createMultipartBody(
      boundary,
      {},
      {
        filename: 'graphic.png',
        mimetype: 'image/png',
        buffer: VALID_PNG
      }
    );

    const resPng = await fetch(`${baseUrl}/api/v1/admin/media/upload`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: validPngBody
    });
    assert.equal(resPng.status, 201);
    const pngData = (await resPng.json()).data;
    assert.match(pngData.filename, /^[a-f0-9-]+\.png$/);
    assert.equal(pngData.mime_type, 'image/png');

    // Valid WebP upload
    const validWebpBody = createMultipartBody(
      boundary,
      {},
      {
        filename: 'modern.webp',
        mimetype: 'image/webp',
        buffer: VALID_WEBP
      }
    );
    const resWebp = await fetch(`${baseUrl}/api/v1/admin/media/upload`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: validWebpBody
    });
    assert.equal(resWebp.status, 201);
    assert.match((await resWebp.json()).data.filename, /^[a-f0-9-]+\.webp$/);

    // Reject executable / script disguised as image
    const fakeImgBody = createMultipartBody(
      boundary,
      {},
      {
        filename: 'exploit.php.png',
        mimetype: 'image/png',
        buffer: Buffer.from('<?php echo "evil payload"; ?>')
      }
    );
    const resFake = await fetch(`${baseUrl}/api/v1/admin/media/upload`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: fakeImgBody
    });
    assert.equal(resFake.status, 422);
    const fakeErr = await resFake.json();
    assert.equal(fakeErr.error.code, 'VALIDATION_ERROR');

    // Reject empty file
    const emptyBody = createMultipartBody(
      boundary,
      {},
      {
        filename: 'empty.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.alloc(0)
      }
    );
    const resEmpty = await fetch(`${baseUrl}/api/v1/admin/media/upload`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: emptyBody
    });
    assert.equal(resEmpty.status, 422);

    // Reject file exceeding max size (1MB limit in test config)
    const largeBody = createMultipartBody(
      boundary,
      {},
      {
        filename: 'huge.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.concat([VALID_JPEG, Buffer.alloc(1.5 * 1024 * 1024, 0xee)])
      }
    );
    const resLarge = await fetch(`${baseUrl}/api/v1/admin/media/upload`, {
      method: 'POST',
      headers: {
        'x-session-token': adminToken,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: largeBody
    });
    assert.equal(resLarge.status, 422);
    assert.ok((await resLarge.json()).error.message.includes('exceeds maximum upload size'));
  });

  // 2. Safe image serving & path traversal protection
  await t.test(
    'Safe image serving: sets headers, blocks path traversal, returns 404 for missing',
    async () => {
      // First upload an image
      const boundary = '----BoundaryServingTest';
      const uploadBody = createMultipartBody(
        boundary,
        {},
        {
          filename: 'photo.jpg',
          mimetype: 'image/jpeg',
          buffer: VALID_JPEG
        }
      );

      const uploadRes = await fetch(`${baseUrl}/api/v1/admin/media/upload`, {
        method: 'POST',
        headers: {
          'x-session-token': adminToken,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: uploadBody
      });
      const fileData = (await uploadRes.json()).data;

      // Public serving of uploaded image
      const serveRes = await fetch(`${baseUrl}/api/v1/media/products/${fileData.filename}`);
      assert.equal(serveRes.status, 200);
      assert.equal(serveRes.headers.get('content-type'), 'image/jpeg');
      assert.equal(serveRes.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(serveRes.headers.get('cache-control').includes('public'));

      const servedBuffer = Buffer.from(await serveRes.arrayBuffer());
      assert.equal(servedBuffer.length, VALID_JPEG.length);

      // Path traversal attempt: blocked by validation
      const traversalRes = await fetch(`${baseUrl}/api/v1/media/..%2f..%2fpackage.json`);
      assert.ok([400, 404].includes(traversalRes.status));

      // Non-existent image: returns 404
      const notFoundRes = await fetch(
        `${baseUrl}/api/v1/media/products/00000000-0000-0000-0000-000000000000.jpg`
      );
      assert.equal(notFoundRes.status, 404);
    }
  );

  // 3. Product image multipart upload, primary image management, and reference-safe deletion
  await t.test(
    'Product image upload, primary selection, ordering, and reference-safe physical deletion',
    async () => {
      // Create category & product
      const cat = (
        await (
          await fetch(`${baseUrl}/api/v1/admin/categories`, {
            method: 'POST',
            headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Cameras' })
          })
        ).json()
      ).data;

      const prod = (
        await (
          await fetch(`${baseUrl}/api/v1/admin/products`, {
            method: 'POST',
            headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Sony A7 IV',
              category_id: cat.id,
              condition: 'new',
              default_variant: {
                sku: 'SONY-A7IV-BODY',
                variant_label: 'Body Only',
                price: '78000.00',
                stock_quantity: 4
              }
            })
          })
        ).json()
      ).data;

      const boundary = '----BoundaryProductImage';

      // 1. Upload first image (should automatically become primary)
      const img1Body = createMultipartBody(
        boundary,
        { alt_text: 'Front view of camera' },
        { filename: 'front.jpg', mimetype: 'image/jpeg', buffer: VALID_JPEG }
      );

      const img1Res = await fetch(`${baseUrl}/api/v1/admin/products/${prod.id}/images`, {
        method: 'POST',
        headers: {
          'x-session-token': adminToken,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: img1Body
      });
      assert.equal(img1Res.status, 201);
      const img1 = (await img1Res.json()).data;
      assert.equal(img1.is_primary, true);
      assert.equal(img1.alt_text, 'Front view of camera');

      // 2. Upload second image marked as primary (should atomically demote first image)
      const img2Body = createMultipartBody(
        boundary,
        { alt_text: 'Back view of camera', is_primary: 'true', sort_order: '1' },
        { filename: 'back.png', mimetype: 'image/png', buffer: VALID_PNG }
      );

      const img2Res = await fetch(`${baseUrl}/api/v1/admin/products/${prod.id}/images`, {
        method: 'POST',
        headers: {
          'x-session-token': adminToken,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: img2Body
      });
      assert.equal(img2Res.status, 201);
      const img2 = (await img2Res.json()).data;
      assert.equal(img2.is_primary, true);

      // Verify list images: img2 is primary, img1 is not primary
      const listImages = (
        await (
          await fetch(`${baseUrl}/api/v1/admin/products/${prod.id}/images`, {
            headers: { 'x-session-token': adminToken }
          })
        ).json()
      ).data;

      assert.equal(listImages.length, 2);
      const checkImg1 = listImages.find((i) => i.id === img1.id);
      const checkImg2 = listImages.find((i) => i.id === img2.id);
      assert.equal(checkImg1.is_primary, false);
      assert.equal(checkImg2.is_primary, true);

      // 3. Multi-reference retention test:
      // Create a banner referencing the same physical file as img1
      const banner = (
        await (
          await fetch(`${baseUrl}/api/v1/admin/banners`, {
            method: 'POST',
            headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_path: img1.image_path,
              link_url: 'https://pixelstore.eg'
            })
          })
        ).json()
      ).data;

      // Verify file exists on disk
      let existsOnDisk = await storageAdapter.fileExists(img1.image_path);
      assert.equal(existsOnDisk, true);

      // Delete image from product: since banner still references it, physical file MUST NOT be deleted
      const delImg1 = await fetch(`${baseUrl}/api/v1/admin/products/${prod.id}/images/${img1.id}`, {
        method: 'DELETE',
        headers: { 'x-session-token': adminToken }
      });
      assert.equal(delImg1.status, 200);

      existsOnDisk = await storageAdapter.fileExists(img1.image_path);
      assert.equal(
        existsOnDisk,
        true,
        'File must be retained on disk because banner still references it'
      );

      // Now delete the banner: last reference is gone, physical file MUST be unlinked
      const delBanner = await fetch(`${baseUrl}/api/v1/admin/banners/${banner.id}`, {
        method: 'DELETE',
        headers: { 'x-session-token': adminToken }
      });
      assert.equal(delBanner.status, 200);

      existsOnDisk = await storageAdapter.fileExists(img1.image_path);
      assert.equal(
        existsOnDisk,
        false,
        'File must be deleted from disk now that all references are gone'
      );
    }
  );
});
