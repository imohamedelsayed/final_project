const { Buffer } = require('node:buffer');
const crypto = require('node:crypto');

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashSessionToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a string.');
  }
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
  if (!otp || typeof otp !== 'string') {
    throw new Error('OTP must be a string.');
  }
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function verifyOtp(candidateOtp, storedHash) {
  if (!candidateOtp || !storedHash) {
    return false;
  }
  const candidateHash = hashOtp(candidateOtp);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  generateSessionToken,
  hashSessionToken,
  generateOtp,
  hashOtp,
  verifyOtp
};
