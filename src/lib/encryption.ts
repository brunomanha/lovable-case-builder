// Client-side encryption utilities for sensitive data
// Uses Web Crypto API for secure encryption/decryption

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Generate a key from user's session ID for consistent encryption
async function deriveKey(sessionId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(sessionId.padEnd(32, '0').slice(0, 32)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('iara-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(apiKey: string, sessionId: string): Promise<string> {
  try {
    const key = await deriveKey(sessionId);
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Combine iv and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt API key');
  }
}

export async function decryptApiKey(encryptedData: string, sessionId: string): Promise<string> {
  try {
    const key = await deriveKey(sessionId);
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt API key');
  }
}

// Check if a string appears to be encrypted (base64 with proper length)
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 24) return false;
  try {
    const decoded = atob(value);
    return decoded.length >= 12; // At least IV length
  } catch {
    return false;
  }
}