const argon2 = require('argon2');

async function hashPassword(plainTextPassword) {
  if (!plainTextPassword || typeof plainTextPassword !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }

  return argon2.hash(plainTextPassword, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1
  });
}

async function verifyPassword(hashedPassword, candidatePassword) {
  if (!hashedPassword || !candidatePassword) {
    return false;
  }

  try {
    return await argon2.verify(hashedPassword, candidatePassword);
  } catch {
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword
};
