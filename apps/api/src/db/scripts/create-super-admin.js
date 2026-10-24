const { loadConfig } = require('../../config/env');
const { createLogger } = require('../../config/logger');
const { createDataSource } = require('../data-source');
const { hashPassword } = require('../../modules/auth/password-service');

function parseCliArgs(args) {
  const parsed = {};
  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      parsed.email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      parsed.password = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      parsed.name = arg.split('=')[1];
    }
  }
  return parsed;
}

async function createSuperAdmin(dataSource, { name, email, password }, logger) {
  if (!email || !password) {
    throw new Error(
      'Email and password are required. Set INITIAL_SUPER_ADMIN_EMAIL and INITIAL_SUPER_ADMIN_PASSWORD, or pass --email and --password.'
    );
  }

  if (password.length < 8) {
    throw new Error('Super admin password must be at least 8 characters.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const repo = dataSource.getRepository('User');

  const existing = await repo.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    if (existing.role === 'super_admin') {
      logger.info(
        { email: normalizedEmail },
        'Super admin account already exists. No action taken.'
      );
      return existing;
    }
    throw new Error(
      `A user with email ${normalizedEmail} already exists with role ${existing.role}.`
    );
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const superAdmin = await repo.save({
    name: (name || 'Super Admin').trim(),
    email: normalizedEmail,
    password_hash: passwordHash,
    role: 'super_admin',
    email_verified_at: now,
    is_active: true,
    created_at: now,
    updated_at: now
  });

  logger.info(
    { id: superAdmin.id, email: superAdmin.email },
    'Initial Super Admin created successfully.'
  );
  return superAdmin;
}

async function main() {
  const config = loadConfig(process.env);
  const logger = createLogger(config.LOG_LEVEL);

  if (!config.DATABASE_URL) {
    logger.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const cliArgs = parseCliArgs(process.argv.slice(2));
  const email = cliArgs.email || process.env.INITIAL_SUPER_ADMIN_EMAIL;
  const password = cliArgs.password || process.env.INITIAL_SUPER_ADMIN_PASSWORD;
  const name = cliArgs.name || process.env.INITIAL_SUPER_ADMIN_NAME || 'Super Admin';

  const dataSource = createDataSource(config);
  await dataSource.initialize();

  try {
    await createSuperAdmin(dataSource, { name, email, password }, logger);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to create Super Admin.');
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createSuperAdmin, main };
