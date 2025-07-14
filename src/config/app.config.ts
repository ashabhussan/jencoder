/**
 * Application configuration constants
 */

export const STORAGE_KEYS = {
  JWT_DEV_TOOL_CONFIG: "jencoder-config",
  THEME: "jencoder-theme",
} as const;

export interface JWTConfig {
  algorithm: string;
  payload: string;
  secret: string;
  privateKey: string;
  publicKey: string;
  addIat: boolean;
  addExp: boolean;
  expOffset: number;
  customExpMinutes: number;
  includeBearer: boolean;
}

export const DEFAULT_CONFIG: JWTConfig = {
  algorithm: "HS256",
  payload: JSON.stringify(
    {
      sub: "1234567890",
      name: "John Doe",
      iat: 1516239022,
    },
    null,
    2
  ),
  secret: "your-256-bit-secret",
  privateKey: "your-2048-bit-pkcs8-private-key",
  publicKey: "your-public-key",
  addIat: false,
  addExp: false,
  expOffset: 0,
  customExpMinutes: 60,
  includeBearer: true,
};
