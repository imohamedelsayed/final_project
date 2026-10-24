class CreateExtensionsAndAuthTables1730000001000 {
  async up(queryRunner) {
    // Enable pgcrypto if needed for gen_random_uuid() on older PostgreSQL versions
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        email VARCHAR(254) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'customer',
        email_verified_at TIMESTAMPTZ NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_users_role CHECK (role IN ('customer', 'admin', 'super_admin'))
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_users_normalized_email ON users (LOWER(TRIM(email)))'
    );
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)');

    // Admin TOTP credentials table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admin_totp_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        secret_encrypted TEXT NOT NULL,
        enabled_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_totp_user_id ON admin_totp_credentials (user_id)'
    );

    // Email verification challenges table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_verification_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_email_challenges_attempt_count CHECK (attempt_count >= 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_email_challenges_user_created ON email_verification_challenges (user_id, created_at DESC)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_email_challenges_expires ON email_verification_challenges (expires_at)'
    );

    // Sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token_hash VARCHAR(255) NOT NULL UNIQUE,
        last_activity_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_token_hash ON sessions (session_token_hash)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_revoked ON sessions (user_id, revoked_at)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at)'
    );

    // Store settings table (singleton row id = 1)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id SMALLINT PRIMARY KEY,
        whatsapp_number VARCHAR(30) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_store_settings_singleton CHECK (id = 1)
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query('DROP TABLE IF EXISTS store_settings CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS sessions CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS email_verification_challenges CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS admin_totp_credentials CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS users CASCADE');
  }
}

module.exports = { CreateExtensionsAndAuthTables1730000001000 };
