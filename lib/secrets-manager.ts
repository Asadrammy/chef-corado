import { logger } from './logger';

export interface SecretConfig {
  name: string;
  required: boolean;
  pattern?: RegExp;
  description: string;
}

class SecretsManager {
  private secrets: Map<string, string> = new Map();
  private configs: SecretConfig[] = [
    {
      name: 'DATABASE_URL',
      required: true,
      pattern: /^postgresql:\/\//,
      description: 'PostgreSQL database connection string',
    },
    {
      name: 'NEXTAUTH_SECRET',
      required: true,
      pattern: /^.{32,}$/,
      description: 'NextAuth secret (min 32 chars)',
    },
    {
      name: 'NEXTAUTH_URL',
      required: true,
      pattern: /^https?:\/\//,
      description: 'NextAuth URL',
    },
    {
      name: 'STRIPE_SECRET_KEY',
      required: true,
      pattern: /^sk_(live|test)_/,
      description: 'Stripe secret key',
    },
    {
      name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      required: true,
      pattern: /^pk_(live|test)_/,
      description: 'Stripe publishable key',
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      required: true,
      pattern: /^whsec_/,
      description: 'Stripe webhook secret',
    },
    {
      name: 'AWS_ACCESS_KEY_ID',
      required: false,
      description: 'AWS access key',
    },
    {
      name: 'AWS_SECRET_ACCESS_KEY',
      required: false,
      description: 'AWS secret key',
    },
    {
      name: 'NEXT_PUBLIC_SENTRY_DSN',
      required: false,
      pattern: /^https?:\/\/.*@sentry\.io/,
      description: 'Sentry DSN',
    },
  ];

  constructor() {
    this.loadSecrets();
  }

  private loadSecrets() {
    for (const config of this.configs) {
      const value = process.env[config.name];

      if (config.required && !value) {
        logger.error(`Missing required secret: ${config.name}`, new Error(`${config.name} is required`));
        throw new Error(`Missing required secret: ${config.name}`);
      }

      if (value && config.pattern && !config.pattern.test(value)) {
        logger.error(`Invalid secret format: ${config.name}`, new Error(`${config.name} has invalid format`));
        throw new Error(`Invalid secret format: ${config.name}`);
      }

      if (value) {
        this.secrets.set(config.name, value);
      }
    }

    logger.info('All secrets loaded and validated');
  }

  getSecret(name: string): string | undefined {
    return this.secrets.get(name);
  }

  validateSecrets(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const config of this.configs) {
      const value = process.env[config.name];

      if (config.required && !value) {
        errors.push(`Missing required secret: ${config.name}`);
      }

      if (value && config.pattern && !config.pattern.test(value)) {
        errors.push(`Invalid format for ${config.name}: ${config.description}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getSecretsList(): SecretConfig[] {
    return this.configs;
  }

  // Mask secrets for logging
  maskSecret(value: string, showChars: number = 4): string {
    if (value.length <= showChars) {
      return '*'.repeat(value.length);
    }
    return value.substring(0, showChars) + '*'.repeat(value.length - showChars);
  }
}

export const secretsManager = new SecretsManager();
