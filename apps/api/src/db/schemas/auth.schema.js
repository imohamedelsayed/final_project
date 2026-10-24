const { EntitySchema } = require('typeorm');

const UserSchema = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    name: {
      type: 'varchar',
      length: 150,
      nullable: false
    },
    email: {
      type: 'varchar',
      length: 254,
      nullable: false,
      unique: true
    },
    password_hash: {
      type: 'varchar',
      length: 255,
      nullable: false
    },
    role: {
      type: 'varchar',
      length: 20,
      nullable: false,
      default: 'customer'
    },
    email_verified_at: {
      type: 'timestamptz',
      nullable: true
    },
    is_active: {
      type: 'boolean',
      nullable: false,
      default: true
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    },
    updated_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    totp_credential: {
      target: 'AdminTotpCredential',
      type: 'one-to-one',
      inverseSide: 'user'
    },
    cart: {
      target: 'Cart',
      type: 'one-to-one',
      inverseSide: 'user'
    },
    sessions: {
      target: 'Session',
      type: 'one-to-many',
      inverseSide: 'user'
    },
    verification_challenges: {
      target: 'EmailVerificationChallenge',
      type: 'one-to-many',
      inverseSide: 'user'
    },
    orders: {
      target: 'Order',
      type: 'one-to-many',
      inverseSide: 'user'
    }
  }
});

const AdminTotpCredentialSchema = new EntitySchema({
  name: 'AdminTotpCredential',
  tableName: 'admin_totp_credentials',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    user_id: {
      type: 'uuid',
      nullable: false,
      unique: true
    },
    secret_encrypted: {
      type: 'text',
      nullable: false
    },
    enabled_at: {
      type: 'timestamptz',
      nullable: false
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    user: {
      target: 'User',
      type: 'one-to-one',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    }
  }
});

const EmailVerificationChallengeSchema = new EntitySchema({
  name: 'EmailVerificationChallenge',
  tableName: 'email_verification_challenges',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    user_id: {
      type: 'uuid',
      nullable: false
    },
    token_hash: {
      type: 'varchar',
      length: 255,
      nullable: false
    },
    expires_at: {
      type: 'timestamptz',
      nullable: false
    },
    consumed_at: {
      type: 'timestamptz',
      nullable: true
    },
    attempt_count: {
      type: 'integer',
      nullable: false,
      default: 0
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    user: {
      target: 'User',
      type: 'many-to-one',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    }
  }
});

const SessionSchema = new EntitySchema({
  name: 'Session',
  tableName: 'sessions',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid'
    },
    user_id: {
      type: 'uuid',
      nullable: false
    },
    session_token_hash: {
      type: 'varchar',
      length: 255,
      nullable: false,
      unique: true
    },
    last_activity_at: {
      type: 'timestamptz',
      nullable: false
    },
    expires_at: {
      type: 'timestamptz',
      nullable: false
    },
    revoked_at: {
      type: 'timestamptz',
      nullable: true
    },
    created_at: {
      type: 'timestamptz',
      nullable: false,
      default: () => 'CURRENT_TIMESTAMP'
    }
  },
  relations: {
    user: {
      target: 'User',
      type: 'many-to-one',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    }
  }
});

module.exports = {
  UserSchema,
  AdminTotpCredentialSchema,
  EmailVerificationChallengeSchema,
  SessionSchema
};
