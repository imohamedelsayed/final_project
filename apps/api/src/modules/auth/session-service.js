const { generateSessionToken, hashSessionToken } = require('./token-service');

const CUSTOMER_IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const STAFF_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
const ACTIVITY_UPDATE_THROTTLE_MS = 60 * 1000; // 1 minute throttle for DB writes

function getInactivityLimitMs(role) {
  if (role === 'admin' || role === 'super_admin') {
    return STAFF_IDLE_TIMEOUT_MS;
  }
  return CUSTOMER_IDLE_TIMEOUT_MS;
}

async function createSession(dataSource, userOrParams) {
  const userId = userOrParams.userId || userOrParams.id;
  const role = userOrParams.role;
  const sessionRepo = dataSource.getRepository('Session');
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);

  const now = new Date();
  const idleMs = getInactivityLimitMs(role);
  const expiresAt = new Date(now.getTime() + idleMs);

  const session = await sessionRepo.save({
    user_id: userId,
    session_token_hash: tokenHash,
    last_activity_at: now,
    expires_at: expiresAt,
    revoked_at: null,
    created_at: now
  });

  return { token, session };
}

async function validateSession(dataSource, rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);
  const sessionRepo = dataSource.getRepository('Session');
  const userRepo = dataSource.getRepository('User');

  const session = await sessionRepo.findOne({
    where: { session_token_hash: tokenHash }
  });

  if (!session) {
    return null;
  }

  // Check if explicitly revoked
  if (session.revoked_at) {
    return null;
  }

  const now = new Date();

  // Load user
  const user = await userRepo.findOne({
    where: { id: session.user_id }
  });

  if (!user || !user.is_active) {
    return null;
  }

  const idleLimitMs = getInactivityLimitMs(user.role);
  const lastActiveTime = new Date(session.last_activity_at).getTime();
  const timeSinceLastActive = now.getTime() - lastActiveTime;

  // Check inactivity limit or absolute expiry
  if (timeSinceLastActive > idleLimitMs || now.getTime() > new Date(session.expires_at).getTime()) {
    // Inactivity timeout exceeded - revoke session
    await sessionRepo.update({ id: session.id }, { revoked_at: now });
    return null;
  }

  // Throttle updates to last_activity_at
  if (timeSinceLastActive > ACTIVITY_UPDATE_THROTTLE_MS) {
    const newExpiresAt = new Date(now.getTime() + idleLimitMs);
    await sessionRepo.update(
      { id: session.id },
      {
        last_activity_at: now,
        expires_at: newExpiresAt
      }
    );
    session.last_activity_at = now;
    session.expires_at = newExpiresAt;
  }

  return { session, user };
}

async function revokeSession(dataSource, rawToken) {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  const sessionRepo = dataSource.getRepository('Session');
  await sessionRepo.update({ session_token_hash: tokenHash }, { revoked_at: new Date() });
}

async function revokeAllUserSessions(dataSource, userId) {
  if (!userId) return;
  const sessionRepo = dataSource.getRepository('Session');
  await sessionRepo.update({ user_id: userId }, { revoked_at: new Date() });
}

module.exports = {
  CUSTOMER_IDLE_TIMEOUT_MS,
  STAFF_IDLE_TIMEOUT_MS,
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions
};
