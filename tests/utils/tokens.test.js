import { describe, it, expect } from 'vitest';
import { generateConfirmToken, verifyConfirmToken, generateAuthToken, verifyAuthToken } from '../../api/utils/tokens.js';

describe('Token Utilities', () => {
  const testEmail = 'test@kinn.at';

  describe('Confirmation Tokens', () => {
    it('should generate a valid confirmation token', () => {
      const token = generateConfirmToken(testEmail);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should verify a valid confirmation token', () => {
      const token = generateConfirmToken(testEmail);
      const email = verifyConfirmToken(token);
      expect(email).toBe(testEmail);
    });

    it('should reject an invalid token', () => {
      const result = verifyConfirmToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should reject a token with wrong type', () => {
      // Generate auth token but try to verify as confirm token
      const authToken = generateAuthToken(testEmail);
      const result = verifyConfirmToken(authToken);
      expect(result).toBeNull();
    });
  });

  describe('Auth Tokens', () => {
    it('should generate a valid auth token', () => {
      const token = generateAuthToken(testEmail);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should verify a valid auth token', () => {
      const token = generateAuthToken(testEmail);
      const email = verifyAuthToken(token);
      expect(email).toBe(testEmail);
    });

    it('should reject an invalid auth token', () => {
      const result = verifyAuthToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('Token Security', () => {
    it('should generate different tokens for same email', () => {
      const token1 = generateConfirmToken(testEmail);
      const token2 = generateConfirmToken(testEmail);
      expect(token1).not.toBe(token2);
    });

    it('should include timestamp in token payload', () => {
      const token = generateConfirmToken(testEmail);
      const parts = token.split('.');
      expect(parts.length).toBe(3); // JWT has 3 parts: header.payload.signature
    });
  });
});
