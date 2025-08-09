import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * Derives a key from a passphrase using PBKDF2
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts data using AES-256-GCM with a passphrase
 */
export function encryptWithPassphrase(data: string, passphrase: string): EncryptedData {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(passphrase, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from('localdrivehub'));
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    salt: salt.toString('hex')
  };
}

/**
 * Decrypts data using AES-256-GCM with a passphrase
 */
export function decryptWithPassphrase(encryptedData: EncryptedData, passphrase: string): string {
  try {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const key = deriveKey(passphrase, salt);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from('localdrivehub'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt data. Invalid passphrase or corrupted data.');
  }
}

/**
 * Hashes a passphrase for storage/verification
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(passphrase, saltRounds);
}

/**
 * Verifies a passphrase against a hash
 */
export async function verifyPassphrase(passphrase: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passphrase, hash);
}

/**
 * Encrypts a refresh token with passphrase
 */
export function encryptRefreshToken(refreshToken: string, passphrase: string): string {
  const encrypted = encryptWithPassphrase(refreshToken, passphrase);
  return JSON.stringify(encrypted);
}

/**
 * Decrypts a refresh token with passphrase
 */
export function decryptRefreshToken(encryptedToken: string, passphrase: string): string {
  try {
    const encryptedData: EncryptedData = JSON.parse(encryptedToken);
    return decryptWithPassphrase(encryptedData, passphrase);
  } catch (error) {
    throw new Error('Failed to decrypt refresh token. Invalid passphrase or corrupted data.');
  }
}

/**
 * Generates a secure random string for IDs
 */
export function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Validates passphrase strength
 */
export function validatePassphrase(passphrase: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (passphrase.length < 8) {
    errors.push('Passphrase must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(passphrase)) {
    errors.push('Passphrase must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(passphrase)) {
    errors.push('Passphrase must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(passphrase)) {
    errors.push('Passphrase must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase)) {
    errors.push('Passphrase must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
