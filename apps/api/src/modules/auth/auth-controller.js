const crypto = require('node:crypto');
const {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  NotFoundError
} = require('../../shared/errors');
const { hashPassword, verifyPassword } = require('./password-service');
const { generateOtp, hashOtp, verifyOtp } = require('./token-service');
const { createSession, revokeSession, revokeAllUserSessions } = require('./session-service');
const {
  encryptTotpSecret,
  decryptTotpSecret,
  generateTotpSecret,
  verifyTotp
} = require('./totp-service');
const {
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  totpSetupVerifySchema,
  resetTotpSchema,
  createStaffUserSchema,
  updateStaffUserSchema
} = require('./auth-schemas');

function createAuthController({ dataSource, emailService, config, logger }) {
  const userRepo = dataSource.getRepository('User');
  const challengeRepo = dataSource.getRepository('EmailVerificationChallenge');
  const totpRepo = dataSource.getRepository('AdminTotpCredential');

  function setSessionCookies(res, token, role) {
    const isProd = config.NODE_ENV === 'production';
    const isStaff = role === 'admin' || role === 'super_admin';
    const maxAgeMs = isStaff ? 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

    // Session cookie
    res.cookie('pixel_store_session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: maxAgeMs,
      path: '/'
    });

    // CSRF token cookie (accessible by client for double-submit cookie protection)
    const csrfToken = crypto.randomBytes(24).toString('hex');
    res.cookie('pixel_store_csrf', csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: maxAgeMs,
      path: '/'
    });
  }

  function clearSessionCookies(res) {
    res.clearCookie('pixel_store_session', { path: '/' });
    res.clearCookie('pixel_store_csrf', { path: '/' });
  }

  async function register(req, res, next) {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError('Invalid registration data.', parsed.error.flatten().fieldErrors)
        );
      }

      const { name, email, password } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (existingUser) {
        return next(new ConflictError('Email address is unavailable.', 'EMAIL_UNAVAILABLE'));
      }

      const passwordHash = await hashPassword(password);
      const otp = generateOtp();
      const otpHash = hashOtp(otp);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      const savedUser = await dataSource.transaction(async (manager) => {
        const userRepoTx = manager.getRepository('User');
        const challengeRepoTx = manager.getRepository('EmailVerificationChallenge');

        const saved = await userRepoTx.save({
          name,
          email: normalizedEmail,
          password_hash: passwordHash,
          role: 'customer',
          email_verified_at: null,
          is_active: true,
          created_at: now,
          updated_at: now
        });

        await challengeRepoTx.save({
          user_id: saved.id,
          token_hash: otpHash,
          expires_at: expiresAt,
          attempt_count: 0,
          consumed_at: null,
          created_at: now
        });

        return saved;
      });

      // Deliver verification email
      try {
        await emailService.sendVerificationEmail({
          to: savedUser.email,
          name: savedUser.name,
          code: otp
        });
      } catch (mailErr) {
        if (logger) {
          logger.error(
            { err: mailErr },
            'Failed to deliver verification email during registration'
          );
        }
      }

      return res.status(201).json({
        data: {
          message: 'Registration successful. Please verify your email.',
          email: savedUser.email
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  async function verifyEmail(req, res, next) {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError('Invalid verification data.', parsed.error.flatten().fieldErrors)
        );
      }

      const { email, code } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (!user) {
        return next(
          new BadRequestError('Verification failed. Invalid or expired code.', {
            code: 'VERIFICATION_INVALID'
          })
        );
      }

      if (user.email_verified_at) {
        return res.status(200).json({
          data: { message: 'Email is already verified.' },
          meta: { requestId: req.id }
        });
      }

      // Query active challenge
      const activeChallenge = await challengeRepo
        .createQueryBuilder('challenge')
        .where('challenge.user_id = :userId', { userId: user.id })
        .andWhere('challenge.consumed_at IS NULL')
        .andWhere('challenge.expires_at > CURRENT_TIMESTAMP')
        .orderBy('challenge.created_at', 'DESC')
        .getOne();

      if (!activeChallenge || activeChallenge.attempt_count >= 5) {
        return next(
          new BadRequestError('Verification code has expired or maximum attempts reached.', {
            code: 'VERIFICATION_INVALID'
          })
        );
      }

      const isValid = verifyOtp(code, activeChallenge.token_hash);
      if (!isValid) {
        const nextAttemptCount = activeChallenge.attempt_count + 1;
        await challengeRepo.update(
          { id: activeChallenge.id },
          {
            attempt_count: nextAttemptCount,
            consumed_at: nextAttemptCount >= 5 ? new Date() : null
          }
        );

        return next(
          new BadRequestError('Invalid verification code.', { code: 'VERIFICATION_INVALID' })
        );
      }

      const now = new Date();
      await dataSource.transaction(async (manager) => {
        await manager
          .getRepository('EmailVerificationChallenge')
          .update({ id: activeChallenge.id }, { consumed_at: now });
        await manager
          .getRepository('User')
          .update({ id: user.id }, { email_verified_at: now, updated_at: now });
      });

      return res.status(200).json({
        data: { message: 'Email verified successfully.' },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  async function resendVerification(req, res, next) {
    try {
      const parsed = resendVerificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError('Invalid email address.', parsed.error.flatten().fieldErrors)
        );
      }

      const normalizedEmail = parsed.data.email.toLowerCase().trim();
      const user = await userRepo.findOne({ where: { email: normalizedEmail } });

      // Privacy-safe response: always return success envelope
      if (user && !user.email_verified_at && user.is_active) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
        const otp = generateOtp();
        const otpHash = hashOtp(otp);

        await dataSource.transaction(async (manager) => {
          const challengeRepoTx = manager.getRepository('EmailVerificationChallenge');

          // Invalidate existing active challenges
          await challengeRepoTx
            .createQueryBuilder()
            .update('EmailVerificationChallenge')
            .set({ consumed_at: now })
            .where('user_id = :userId AND consumed_at IS NULL', { userId: user.id })
            .execute();

          await challengeRepoTx.save({
            user_id: user.id,
            token_hash: otpHash,
            expires_at: expiresAt,
            attempt_count: 0,
            consumed_at: null,
            created_at: now
          });
        });

        try {
          await emailService.sendVerificationEmail({
            to: user.email,
            name: user.name,
            code: otp
          });
        } catch (mailErr) {
          if (logger) {
            logger.error({ err: mailErr }, 'Failed to resend verification email');
          }
        }
      }

      return res.status(200).json({
        data: {
          message:
            'If an unverified account exists for this email, a verification code has been dispatched.'
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  async function login(req, res, next) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError('Invalid login credentials.', parsed.error.flatten().fieldErrors)
        );
      }

      const { email, password, totpCode } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (!user) {
        return next(new UnauthorizedError('Invalid email or password.', 'AUTH_INVALID'));
      }

      const passwordValid = await verifyPassword(user.password_hash, password);
      if (!passwordValid || !user.is_active) {
        return next(new UnauthorizedError('Invalid email or password.', 'AUTH_INVALID'));
      }

      if (!user.email_verified_at) {
        return res.status(403).json({
          error: {
            code: 'EMAIL_UNVERIFIED',
            message: 'Please verify your email before logging in.',
            fields: {}
          },
          meta: { requestId: req.id }
        });
      }

      // Role-specific TOTP checks for staff (admin or super_admin)
      if (user.role === 'admin' || user.role === 'super_admin') {
        const totpCred = await totpRepo.findOne({ where: { user_id: user.id } });
        if (totpCred) {
          if (!totpCode) {
            return res.status(403).json({
              error: {
                code: 'TOTP_REQUIRED',
                message: 'Two-factor authentication code required.',
                fields: {}
              },
              meta: { requestId: req.id }
            });
          }

          const secret = decryptTotpSecret(totpCred.secret_encrypted, config.TOTP_ENCRYPTION_KEY);
          const isTotpValid = verifyTotp(totpCode, secret);
          if (!isTotpValid) {
            return next(
              new UnauthorizedError('Invalid two-factor authentication code.', 'AUTH_INVALID')
            );
          }
        }
      }

      // Create session
      const { token } = await createSession(dataSource, { userId: user.id, role: user.role });
      setSessionCookies(res, token, user.role);

      return res.status(200).json({
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerifiedAt: user.email_verified_at
          }
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  async function adminLogin(req, res, next) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError('Invalid login credentials.', parsed.error.flatten().fieldErrors)
        );
      }

      const { email, password, totpCode } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (!user) {
        return next(new UnauthorizedError('Invalid email or password.', 'AUTH_INVALID'));
      }

      const passwordValid = await verifyPassword(user.password_hash, password);
      if (!passwordValid || !user.is_active) {
        return next(new UnauthorizedError('Invalid email or password.', 'AUTH_INVALID'));
      }

      // Only allow admin and super_admin accounts to authenticate through admin login
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return next(new ForbiddenError('Access denied: Staff credentials required.', 'FORBIDDEN'));
      }

      if (!user.email_verified_at) {
        return res.status(403).json({
          error: {
            code: 'EMAIL_UNVERIFIED',
            message: 'Please verify your email before logging in.',
            fields: {}
          },
          meta: { requestId: req.id }
        });
      }

      // Role-specific TOTP checks for staff
      const totpCred = await totpRepo.findOne({ where: { user_id: user.id } });
      if (totpCred) {
        if (!totpCode) {
          return res.status(403).json({
            error: {
              code: 'TOTP_REQUIRED',
              message: 'Two-factor authentication code required.',
              fields: {}
            },
            meta: { requestId: req.id }
          });
        }

        const secret = decryptTotpSecret(totpCred.secret_encrypted, config.TOTP_ENCRYPTION_KEY);
        const isTotpValid = verifyTotp(totpCode, secret);
        if (!isTotpValid) {
          return next(
            new UnauthorizedError('Invalid two-factor authentication code.', 'AUTH_INVALID')
          );
        }
      }

      // Create session with staff timeout
      const { token } = await createSession(dataSource, { userId: user.id, role: user.role });
      setSessionCookies(res, token, user.role);

      return res.status(200).json({
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            emailVerifiedAt: user.email_verified_at
          }
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  async function logout(req, res, next) {
    try {
      if (req.sessionToken) {
        await revokeSession(dataSource, req.sessionToken);
      }
      clearSessionCookies(res);

      return res.status(200).json({
        data: { message: 'Logged out successfully.' },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  async function me(req, res, next) {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required.'));
      }

      return res.status(200).json({
        data: {
          user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            emailVerifiedAt: req.user.email_verified_at
          }
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  // Staff TOTP setup
  async function setupTotp(req, res, next) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return next(new ForbiddenError('Only staff members can configure TOTP.'));
      }

      const { secret, otpauthUrl } = generateTotpSecret(req.user.email);

      return res.status(200).json({
        data: {
          secret,
          otpauthUrl
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  // Staff TOTP verify & enroll
  async function verifyTotpEnrollment(req, res, next) {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
        return next(new ForbiddenError('Only staff members can configure TOTP.'));
      }

      const parsed = totpSetupVerifySchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError(
            'Invalid TOTP verification payload.',
            parsed.error.flatten().fieldErrors
          )
        );
      }

      const { code, setupSecret } = parsed.data;
      const isValid = verifyTotp(code, setupSecret);
      if (!isValid) {
        return next(
          new BadRequestError('Invalid TOTP code. Verification failed.', { code: 'TOTP_INVALID' })
        );
      }

      const encrypted = encryptTotpSecret(setupSecret, config.TOTP_ENCRYPTION_KEY);
      const now = new Date();

      const existingCred = await totpRepo.findOne({ where: { user_id: req.user.id } });
      if (existingCred) {
        await totpRepo.update(
          { id: existingCred.id },
          { secret_encrypted: encrypted, enabled_at: now }
        );
      } else {
        await totpRepo.save({
          user_id: req.user.id,
          secret_encrypted: encrypted,
          enabled_at: now,
          created_at: now
        });
      }

      return res.status(200).json({
        data: {
          enabled: true,
          message: 'Two-factor authentication successfully configured and enabled.'
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  // Super Admin TOTP Reset for Staff
  async function resetStaffTotp(req, res, next) {
    try {
      if (!req.user || req.user.role !== 'super_admin') {
        return next(new ForbiddenError('Only Super Admin can reset staff TOTP credentials.'));
      }

      const parsed = resetTotpSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError('Valid reset reason is required.', parsed.error.flatten().fieldErrors)
        );
      }

      const { reason } = parsed.data;
      const targetUserId = req.params.id;

      const targetUser = await userRepo.findOne({ where: { id: targetUserId } });
      if (!targetUser) {
        return next(new NotFoundError('Staff user not found.'));
      }

      if (targetUser.role !== 'admin' && targetUser.role !== 'super_admin') {
        return next(new BadRequestError('Target user is not a staff member.'));
      }

      // Delete TOTP credential and revoke all active sessions
      await totpRepo.delete({ user_id: targetUserId });
      await revokeAllUserSessions(dataSource, targetUserId);

      if (logger) {
        logger.warn(
          {
            superAdminId: req.user.id,
            targetUserId,
            reason,
            action: 'RESET_STAFF_TOTP'
          },
          'Super Admin reset staff TOTP credentials'
        );
      }

      return res.status(200).json({
        data: {
          message: 'Staff TOTP credential reset successfully. Staff member must re-enroll.'
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  // Super Admin: List Staff Users
  async function listStaffUsers(req, res, next) {
    try {
      if (!req.user || req.user.role !== 'super_admin') {
        return next(new ForbiddenError('Only Super Admin can view staff management data.'));
      }

      const users = await userRepo
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.totp_credential', 'totp')
        .where('u.role IN (:...roles)', { roles: ['admin', 'super_admin'] })
        .orderBy('u.created_at', 'ASC')
        .getMany();

      const safeUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: u.is_active,
        email_verified_at: u.email_verified_at,
        totp_enabled: Boolean(u.totp_credential),
        created_at: u.created_at,
        updated_at: u.updated_at
      }));

      return res.status(200).json({
        data: safeUsers,
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  // Super Admin: Create Staff User
  async function createStaffUser(req, res, next) {
    try {
      if (!req.user || req.user.role !== 'super_admin') {
        return next(new ForbiddenError('Only Super Admin can create staff accounts.'));
      }

      const parsed = createStaffUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError('Invalid staff user data.', parsed.error.flatten().fieldErrors)
        );
      }

      const { name, email, password, role } = parsed.data;
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (existingUser) {
        return next(new ConflictError('Email address is already in use.', 'EMAIL_UNAVAILABLE'));
      }

      const passwordHash = await hashPassword(password);
      const now = new Date();

      const savedUser = await userRepo.save({
        name,
        email: normalizedEmail,
        password_hash: passwordHash,
        role,
        email_verified_at: now,
        is_active: true,
        created_at: now,
        updated_at: now
      });

      return res.status(201).json({
        data: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
          is_active: savedUser.is_active,
          email_verified_at: savedUser.email_verified_at,
          totp_enabled: false,
          created_at: savedUser.created_at,
          updated_at: savedUser.updated_at
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  // Super Admin: Update Staff User
  async function updateStaffUser(req, res, next) {
    try {
      if (!req.user || req.user.role !== 'super_admin') {
        return next(new ForbiddenError('Only Super Admin can modify staff accounts.'));
      }

      const targetUserId = req.params.id;
      const targetUser = await userRepo.findOne({
        where: { id: targetUserId },
        relations: ['totp_credential']
      });

      if (!targetUser) {
        return next(new NotFoundError('Staff user not found.'));
      }

      if (targetUser.role !== 'admin' && targetUser.role !== 'super_admin') {
        return next(new BadRequestError('Target user is not a staff member.'));
      }

      const parsed = updateStaffUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          new BadRequestError('Invalid update data.', parsed.error.flatten().fieldErrors)
        );
      }

      const { name, role, is_active } = parsed.data;

      // Self-lockout prevention
      if (req.user.id === targetUserId) {
        if (is_active === false) {
          return next(new BadRequestError('You cannot deactivate your own Super Admin account.'));
        }
        if (role && role !== 'super_admin') {
          return next(new BadRequestError('You cannot demote your own Super Admin role.'));
        }
      }

      const updates = { updated_at: new Date() };
      if (name !== undefined) updates.name = name.trim();
      if (role !== undefined) updates.role = role;
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      await userRepo.update({ id: targetUserId }, updates);

      if (is_active === false) {
        await revokeAllUserSessions(dataSource, targetUserId);
      }

      const updatedUser = await userRepo.findOne({
        where: { id: targetUserId },
        relations: ['totp_credential']
      });

      return res.status(200).json({
        data: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          is_active: updatedUser.is_active,
          email_verified_at: updatedUser.email_verified_at,
          totp_enabled: Boolean(updatedUser.totp_credential),
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        },
        meta: { requestId: req.id }
      });
    } catch (err) {
      return next(err);
    }
  }

  return {
    register,
    verifyEmail,
    resendVerification,
    login,
    adminLogin,
    logout,
    me,
    setupTotp,
    verifyTotpEnrollment,
    resetStaffTotp,
    listStaffUsers,
    createStaffUser,
    updateStaffUser
  };
}

module.exports = { createAuthController };
