/**
 * Application configuration constants
 */

export const STORAGE_KEYS = {
  JWT_DEV_TOOL_CONFIG: "jencoder-config",
} as const;

export interface JWTConfig {
  algorithm: string;
  payload: string;
  secret: string;
  publicKey: string;
  addIat: boolean;
  addExp: boolean;
  expOffset: number;
  customExpMinutes: number;
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
  publicKey: "",
  addIat: true,
  addExp: false,
  expOffset: 3600,
  customExpMinutes: 60,
};
