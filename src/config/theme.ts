export const theme = {
  colors: {
    primary: {
      50: 'rgb(239 246 255)', // blue-50
      100: 'rgb(219 234 254)', // blue-100
      500: 'rgb(59 130 246)', // blue-500
      600: 'rgb(37 99 235)', // blue-600
      700: 'rgb(29 78 216)', // blue-700
    },
    secondary: {
      50: 'rgb(248 250 252)', // slate-50
      100: 'rgb(241 245 249)', // slate-100
      200: 'rgb(226 232 240)', // slate-200
      600: 'rgb(71 85 105)', // slate-600
      700: 'rgb(51 65 85)', // slate-700
      800: 'rgb(30 41 59)', // slate-800
    },
    success: {
      50: 'rgb(240 253 244)', // green-50
      100: 'rgb(220 252 231)', // green-100
      500: 'rgb(34 197 94)', // green-500
      600: 'rgb(22 163 74)', // green-600
    },
    warning: {
      50: 'rgb(255 251 235)', // amber-50
      100: 'rgb(254 243 199)', // amber-100
      500: 'rgb(245 158 11)', // amber-500
      600: 'rgb(217 119 6)', // amber-600
    },
    error: {
      50: 'rgb(254 242 242)', // red-50
      100: 'rgb(254 226 226)', // red-100
      500: 'rgb(239 68 68)', // red-500
      600: 'rgb(220 38 38)', // red-600
    },
    neutral: {
      50: 'rgb(250 250 250)', // gray-50
      100: 'rgb(245 245 245)', // gray-100
      200: 'rgb(229 229 229)', // gray-200
      300: 'rgb(212 212 212)', // gray-300
      600: 'rgb(75 85 99)', // gray-600
      700: 'rgb(55 65 81)', // gray-700
      800: 'rgb(31 41 55)', // gray-800
      900: 'rgb(17 24 39)', // gray-900
    }
  },
  gradients: {
    primary: 'from-blue-500 to-blue-600',
    secondary: 'from-slate-100 to-slate-200',
    success: 'from-green-400 to-green-500',
    warning: 'from-amber-400 to-amber-500',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  }
};

export const algorithmConfig = {
  'HS256': { type: 'HMAC', keyLabel: 'Secret', description: 'HMAC using SHA-256' },
  'HS384': { type: 'HMAC', keyLabel: 'Secret', description: 'HMAC using SHA-384' },
  'HS512': { type: 'HMAC', keyLabel: 'Secret', description: 'HMAC using SHA-512' },
  'RS256': { type: 'RSA', keyLabel: 'Private Key', description: 'RSA using SHA-256' },
  'RS384': { type: 'RSA', keyLabel: 'Private Key', description: 'RSA using SHA-384' },
  'RS512': { type: 'RSA', keyLabel: 'Private Key', description: 'RSA using SHA-512' },
  'PS256': { type: 'RSA-PSS', keyLabel: 'Private Key', description: 'RSA-PSS using SHA-256' },
  'ES256': { type: 'ECDSA', keyLabel: 'Private Key', description: 'ECDSA using P-256 and SHA-256' },
  'ES384': { type: 'ECDSA', keyLabel: 'Private Key', description: 'ECDSA using P-384 and SHA-384' },
  'ES512': { type: 'ECDSA', keyLabel: 'Private Key', description: 'ECDSA using P-521 and SHA-512' },
  'EdDSA': { type: 'EdDSA', keyLabel: 'Private Key', description: 'EdDSA signature algorithms' },
} as const;