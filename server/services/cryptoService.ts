import crypto from 'node:crypto';

export class CryptoService {
  /**
   * Hashes a plaintext password using Scrypt with a random 16-byte salt
   */
  static hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  /**
   * Verifies a password against an existing hash and salt using timing-safe comparison
   */
  static verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
      const hashBuffer = Buffer.from(hash, 'hex');
      const derivedBuffer = Buffer.from(derivedHash, 'hex');
      if (hashBuffer.length !== derivedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(hashBuffer, derivedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Generates a secure, cryptographically random token (e.g. for sessions or invitations)
   */
  static generateSecureToken(byteLength: number = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  /**
   * Hashes a token using SHA-256 for secure database storage
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates a friendly short prefix of a token for preview/logging purposes without exposing the secret
   */
  static previewToken(token: string): string {
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }
}
