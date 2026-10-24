const { Buffer } = require('node:buffer');
const crypto = require('node:crypto');
const otplib = require('otplib');

function deriveKey(rawKey) {
  if (!rawKey) {
    throw new Error('TOTP_ENCRYPTION_KEY is required for TOTP operations.');
  }
  // Create 32-byte key using sha256 to guarantee correct AES-256 key length
  return crypto.createHash('sha256').update(rawKey).digest();
}

function encryptTotpSecret(secret, rawKey) {
  const key = deriveKey(rawKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptTotpSecret(encryptedPayload, rawKey) {
  const key = deriveKey(rawKey);
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted TOTP secret format.');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function generateTotpSecret(accountEmail, issuer = 'PixelStore') {
  const secret = otplib.generateSecret();
  const otpauthUrl = otplib.generateURI({
    issuer,
    label: accountEmail,
    secret
  });
  return { secret, otpauthUrl };
}

function verifyTotp(token, secret) {
  if (!token || !secret) {
    return false;
  }
  try {
    const result = otplib.verifySync({
      secret,
      token,
      window: 1
    });
    return Boolean(result && result.valid);
  } catch {
    return false;
  }
}

module.exports = {
  encryptTotpSecret,
  decryptTotpSecret,
  generateTotpSecret,
  verifyTotp
};
