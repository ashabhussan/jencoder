import React, { useState, useEffect, useCallback } from "react";
import { SignJWT, importPKCS8, importSPKI } from "jose";
import { jsonrepair } from "jsonrepair";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  Code2,
  HelpCircle,
  CogIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { algorithmConfig } from "@/config/theme";
import { STORAGE_KEYS, DEFAULT_CONFIG } from "@/config/app.config";

// Re-export JWTConfig from config
import type { JWTConfig } from "@/config/app.config";

const ALGORITHMS = [
  "HS256",
  "HS384",
  "HS512",
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "ES256",
  "ES384",
  "ES512",
  "EdDSA",
];

const EXP_OFFSETS = [
  { label: "5 minutes", value: 300 },
  { label: "15 minutes", value: 900 },
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "1 day", value: 86400 },
  { label: "Custom", value: -1 },
];

const DEFAULT_PAYLOAD = JSON.stringify(
  {
    sub: "1234567890",
    name: "John Doe",
    role: "admin",
  },
  null,
  2
);

const DEFAULT_RSA_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wko6piHwbI2BKzXHHJgJ7tBRTCLJG7lX0g8WYzIXXVXK+7o5kIDaOqzEwZK7s8Ux
5Qx8xVXh1z6sD5GqKqGt1iQ+3AeKJ5n5RqXZq9Z7cYbPJZ0Lg4aq6bNnq7tE8KaZ
KeA3B8KwzwCvNM0DqCW8+aq4A7+NZo8a7dBR2ZqK7bxW8z8cPg+tGQZO3aA4KQ==
-----END RSA PRIVATE KEY-----`;

// Helper function to normalize key format with proper line breaks
const normalizePrivateKey = (key: string): string => {
  const trimmedKey = key.trim();

  // Add line breaks if missing
  let normalizedKey = trimmedKey;
  if (!normalizedKey.includes("\n")) {
    if (normalizedKey.includes("-----BEGIN PRIVATE KEY-----")) {
      normalizedKey = normalizedKey
        .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
        .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
    } else if (normalizedKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
      normalizedKey = normalizedKey
        .replace(
          "-----BEGIN RSA PRIVATE KEY-----",
          "-----BEGIN RSA PRIVATE KEY-----\n"
        )
        .replace(
          "-----END RSA PRIVATE KEY-----",
          "\n-----END RSA PRIVATE KEY-----"
        );
    } else if (normalizedKey.includes("-----BEGIN EC PRIVATE KEY-----")) {
      normalizedKey = normalizedKey
        .replace(
          "-----BEGIN EC PRIVATE KEY-----",
          "-----BEGIN EC PRIVATE KEY-----\n"
        )
        .replace(
          "-----END EC PRIVATE KEY-----",
          "\n-----END EC PRIVATE KEY-----"
        );
    }
  }

  return normalizedKey;
};

// Helper function to import private key based on algorithm requirements
const importPrivateKeyForAlgorithm = async (key: string, algorithm: string) => {
  const normalizedKey = normalizePrivateKey(key);

  try {
    if (algorithm.startsWith("RS") || algorithm.startsWith("PS")) {
      // RSA algorithms - try PKCS#1 first (preferred format), then PKCS#8
      if (normalizedKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
        // PKCS#1 format - this is the preferred format for RSA
        return await importPKCS8(normalizedKey, algorithm);
      } else if (normalizedKey.includes("-----BEGIN PRIVATE KEY-----")) {
        // PKCS#8 format
        return await importPKCS8(normalizedKey, algorithm);
      } else {
        throw new Error(
          "RSA private key must be in PKCS#1 (-----BEGIN RSA PRIVATE KEY-----) or PKCS#8 (-----BEGIN PRIVATE KEY-----) format"
        );
      }
    } else if (algorithm.startsWith("ES")) {
      // ECDSA algorithms - try EC format first, then PKCS#8
      if (normalizedKey.includes("-----BEGIN EC PRIVATE KEY-----")) {
        // EC private key format - preferred for ECDSA
        return await importPKCS8(normalizedKey, algorithm);
      } else if (normalizedKey.includes("-----BEGIN PRIVATE KEY-----")) {
        // PKCS#8 format
        return await importPKCS8(normalizedKey, algorithm);
      } else {
        throw new Error(
          "ECDSA private key must be in EC (-----BEGIN EC PRIVATE KEY-----) or PKCS#8 (-----BEGIN PRIVATE KEY-----) format"
        );
      }
    } else if (algorithm === "EdDSA") {
      // EdDSA algorithm - requires PKCS#8 format
      if (normalizedKey.includes("-----BEGIN PRIVATE KEY-----")) {
        return await importPKCS8(normalizedKey, algorithm);
      } else {
        throw new Error(
          "EdDSA private key must be in PKCS#8 (-----BEGIN PRIVATE KEY-----) format"
        );
      }
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  } catch (error) {
    console.error("Key import error:", error);
    throw new Error(getKeyFormatError(algorithm, normalizedKey, error));
  }
};

// Helper function to provide specific error messages based on algorithm
const getKeyFormatError = (
  algorithm: string,
  key: string,
  originalError: any
): string => {
  const errorMessage = originalError?.message || "";

  if (algorithm.startsWith("RS") || algorithm.startsWith("PS")) {
    if (key.includes("-----BEGIN RSA PRIVATE KEY-----")) {
      return `RSA ${algorithm}: PKCS#1 format detected but validation failed. Please ensure your RSA private key is valid. Error: ${errorMessage}`;
    } else if (key.includes("-----BEGIN PRIVATE KEY-----")) {
      return `RSA ${algorithm}: PKCS#8 format detected but validation failed. Please ensure your RSA private key is valid. Error: ${errorMessage}`;
    } else {
      return `RSA ${algorithm} requires a private key in PKCS#1 format (-----BEGIN RSA PRIVATE KEY-----) or PKCS#8 format (-----BEGIN PRIVATE KEY-----).`;
    }
  } else if (algorithm.startsWith("ES")) {
    if (key.includes("-----BEGIN EC PRIVATE KEY-----")) {
      return `ECDSA ${algorithm}: EC format detected but validation failed. Please ensure your EC private key is valid. Error: ${errorMessage}`;
    } else if (key.includes("-----BEGIN PRIVATE KEY-----")) {
      return `ECDSA ${algorithm}: PKCS#8 format detected but validation failed. Please ensure your EC private key is valid. Error: ${errorMessage}`;
    } else {
      return `ECDSA ${algorithm} requires a private key in EC format (-----BEGIN EC PRIVATE KEY-----) or PKCS#8 format (-----BEGIN PRIVATE KEY-----).`;
    }
  } else if (algorithm === "EdDSA") {
    if (key.includes("-----BEGIN PRIVATE KEY-----")) {
      return `EdDSA: PKCS#8 format detected but validation failed. Please ensure your EdDSA private key is valid. Error: ${errorMessage}`;
    } else {
      return `EdDSA requires a private key in PKCS#8 format (-----BEGIN PRIVATE KEY-----).`;
    }
  }

  return `Unsupported algorithm or invalid key format for ${algorithm}. Error: ${errorMessage}`;
};

const Index = () => {
  const [config, setConfig] = useState<JWTConfig>({
    algorithm: DEFAULT_CONFIG.algorithm,
    payload: DEFAULT_CONFIG.payload,
    secret: DEFAULT_CONFIG.secret,
    publicKey: DEFAULT_CONFIG.publicKey,
    addIat: DEFAULT_CONFIG.addIat,
    addExp: DEFAULT_CONFIG.addExp,
    expOffset: DEFAULT_CONFIG.expOffset,
    customExpMinutes: DEFAULT_CONFIG.customExpMinutes,
  });

  const [jwt, setJwt] = useState("");
  const [decodedHeader, setDecodedHeader] = useState("");
  const [decodedPayload, setDecodedPayload] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [payloadError, setPayloadError] = useState("");

  // Load config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEYS.JWT_DEV_TOOL_CONFIG);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...config, ...parsed });
      } catch (error) {
        console.error("Failed to parse saved config:", error);
      }
    }
  }, []);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.JWT_DEV_TOOL_CONFIG, JSON.stringify(config));
  }, [config]);

  // Validate JSON payload
  const validatePayload = useCallback((payload: string) => {
    try {
      JSON.parse(payload);
      setPayloadError("");
      return true;
    } catch (error) {
      setPayloadError("Invalid JSON format");
      return false;
    }
  }, []);

  // Generate JWT token
  const generateJWT = useCallback(async () => {
    if (!validatePayload(config.payload)) {
      toast({
        title: "Invalid Payload",
        description: "Please fix the JSON payload format",
        variant: "destructive",
      });
      return;
    }

    try {
      let parsedPayload = JSON.parse(config.payload);

      // Add iat if enabled
      if (config.addIat) {
        parsedPayload.iat = Math.floor(Date.now() / 1000);
      }

      // Add exp if enabled
      if (config.addExp) {
        const expiration =
          config.expOffset === -1
            ? (config.customExpMinutes || 60) * 60
            : config.expOffset;
        parsedPayload.exp = Math.floor(Date.now() / 1000) + expiration;
      }

      let token: string;

      if (config.algorithm.startsWith("HS")) {
        // HMAC algorithms
        const secret = new TextEncoder().encode(config.secret);
        const jwt = new SignJWT(parsedPayload)
          .setProtectedHeader({ alg: config.algorithm as any })
          .sign(secret);
        token = await jwt;
      } else if (
        config.algorithm.startsWith("RS") ||
        config.algorithm.startsWith("PS") ||
        config.algorithm.startsWith("ES") ||
        config.algorithm === "EdDSA"
      ) {
        // Asymmetric algorithms with improved key handling
        try {
          const privateKey = await importPrivateKeyForAlgorithm(
            config.secret,
            config.algorithm
          );

          const jwt = new SignJWT(parsedPayload)
            .setProtectedHeader({ alg: config.algorithm as any })
            .sign(privateKey);
          token = await jwt;
        } catch (keyError) {
          console.error("Key import error:", keyError);
          throw keyError;
        }
      } else {
        throw new Error(`Unsupported algorithm: ${config.algorithm}`);
      }

      setJwt(token);

      // Decode for display
      const parts = token.split(".");
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      setDecodedHeader(JSON.stringify(header, null, 2));
      setDecodedPayload(JSON.stringify(payload, null, 2));

      toast({
        title: "JWT Generated Successfully",
        description: "Your JWT token has been generated and is ready to use",
      });
    } catch (error) {
      console.error("JWT generation error:", error);
      toast({
        title: "Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate JWT token",
        variant: "destructive",
      });
    }
  }, [config, validatePayload]);

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: "JWT token copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Export configuration
  const exportConfig = () => {
    const configBlob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(configBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jwt-config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Config Exported",
      description: "Configuration has been exported successfully",
    });
  };

  // Import configuration
  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        setConfig({ ...config, ...importedConfig });
        toast({
          title: "Config Imported",
          description: "Configuration has been imported successfully",
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid configuration file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // Update config helper
  const updateConfig = (updates: Partial<JWTConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Fix and prettify JSON payload
  const fixAndPrettifyPayload = () => {
    try {
      let repairedJson = config.payload;
      try {
        // Try to repair invalid JSON first
        repairedJson = jsonrepair(config.payload);
      } catch (repairError) {
        // If repair fails, use original
      }

      const parsed = JSON.parse(repairedJson);
      const prettified = JSON.stringify(parsed, null, 2);
      updateConfig({ payload: prettified });
      setPayloadError("");
      toast({
        title: "JSON Fixed & Formatted",
        description: "Payload has been corrected and formatted successfully",
      });
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: "Unable to fix and format JSON. Please check syntax.",
        variant: "destructive",
      });
    }
  };

  // Get algorithm info
  const getAlgorithmInfo = () => {
    return (
      algorithmConfig[config.algorithm as keyof typeof algorithmConfig] || {
        type: "Unknown",
        keyLabel: "Key",
        description: "Unknown algorithm",
      }
    );
  };

  const isHMACAlgorithm = () => getAlgorithmInfo().type === "HMAC";

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              JWT Developer Tool
            </h1>
            <p className="text-slate-600 text-lg">
              Generate and decode JWT tokens with various algorithms
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Configuration Panel */}
            <div className="space-y-4 lg:col-span-5">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                        <Code2 className="h-3 w-3" />
                      </div>
                      <span>Token Configuration</span>
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportConfig}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={importConfig}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Import
                        </Button>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* Payload Editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="payload"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Payload (JSON)
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fixAndPrettifyPayload}
                        className="text-xs bg-slate-50 hover:bg-slate-100"
                        title="Attempt to auto-correct and format your payload"
                      >
                        <Code2 className="h-3 w-3 mr-1" />
                        Fix & Prettify JSON
                      </Button>
                    </div>
                    <div className="relative">
                      <Textarea
                        id="payload"
                        value={config.payload}
                        onChange={e => {
                          updateConfig({ payload: e.target.value });
                          validatePayload(e.target.value);
                        }}
                        className={`font-mono text-sm min-h-[120px] bg-slate-50 border-slate-200 
                          focus:border-blue-500 focus:ring-blue-500/20 resize-none
                          ${
                            payloadError
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              : ""
                          }`}
                        placeholder="Enter JWT payload as JSON..."
                      />
                    </div>
                    {payloadError && (
                      <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>{payloadError}</span>
                      </div>
                    )}
                  </div>

                  {/* Secret/Key Section - Conditional rendering based on algorithm */}
                  {isHMACAlgorithm() ? (
                    /* HMAC Secret */
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Label
                          htmlFor="secret"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Secret
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Used for signing JWT. Enter a secret string for
                              HMAC signing (e.g., "your-256-bit-secret")
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="relative">
                        <Textarea
                          id="secret"
                          value={config.secret}
                          onChange={e =>
                            updateConfig({ secret: e.target.value })
                          }
                          className={`font-mono text-sm min-h-[100px] pr-12 bg-slate-50 border-slate-200 
                            focus:border-blue-500 focus:ring-blue-500/20 resize-none
                            ${showSecret ? "" : "text-security-disc"}`}
                          style={
                            showSecret
                              ? {}
                              : ({
                                  WebkitTextSecurity: "disc",
                                } as React.CSSProperties)
                          }
                          placeholder="Enter your secret key..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 hover:bg-slate-100"
                          onClick={() => setShowSecret(!showSecret)}
                        >
                          {showSecret ? (
                            <EyeOff className="h-4 w-4 text-slate-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Asymmetric Keys (RSA/ECDSA/EdDSA) */
                    <div className="space-y-4">
                      {/* Private Key */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Label
                            htmlFor="privateKey"
                            className="text-sm font-semibold text-slate-700"
                          >
                            Private Key
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Used for signing JWT. Paste your private key
                                starting with -----BEGIN PRIVATE KEY-----
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <Textarea
                            id="privateKey"
                            value={config.secret}
                            onChange={e =>
                              updateConfig({ secret: e.target.value })
                            }
                            className={`font-mono text-sm min-h-[100px] pr-12 bg-slate-50 border-slate-200 
                              focus:border-blue-500 focus:ring-blue-500/20 resize-none
                              ${showSecret ? "" : "text-security-disc"}`}
                            style={
                              showSecret
                                ? {}
                                : ({
                                    WebkitTextSecurity: "disc",
                                  } as React.CSSProperties)
                            }
                            placeholder="Enter your private key..."
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-2 hover:bg-slate-100"
                            onClick={() => setShowSecret(!showSecret)}
                          >
                            {showSecret ? (
                              <EyeOff className="h-4 w-4 text-slate-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-500" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Public Key (Optional) */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Label
                            htmlFor="publicKey"
                            className="text-sm font-semibold text-slate-700"
                          >
                            Public Key (Optional)
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Used for verification (optional). Add public key
                                for token verification
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <Textarea
                            id="publicKey"
                            value={config.publicKey || ""}
                            onChange={e =>
                              updateConfig({ publicKey: e.target.value })
                            }
                            className={`font-mono text-sm min-h-[80px] pr-12 bg-slate-50 border-slate-200 
                              focus:border-blue-500 focus:ring-blue-500/20 resize-none
                              ${showPublicKey ? "" : "text-security-disc"}`}
                            style={
                              showPublicKey
                                ? {}
                                : ({
                                    WebkitTextSecurity: "disc",
                                  } as React.CSSProperties)
                            }
                            placeholder="Enter your public key (optional)..."
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-2 hover:bg-slate-100"
                            onClick={() => setShowPublicKey(!showPublicKey)}
                          >
                            {showPublicKey ? (
                              <EyeOff className="h-4 w-4 text-slate-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-500" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Middle Column */}
            <div className="space-y-6 lg:col-span-2">
              <div className="sticky top-4 space-y-6">
                {/* Algorithm Selection */}
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-lg py-3">
                    <CardTitle className="text-sm font-medium">
                      Algorithm
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <Select
                      value={config.algorithm}
                      onValueChange={value =>
                        updateConfig({ algorithm: value })
                      }
                    >
                      <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                        <SelectValue placeholder="Select algorithm" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALGORITHMS.map(alg => (
                          <SelectItem
                            key={alg}
                            value={alg}
                            className="hover:bg-blue-50"
                          >
                            <div className="flex flex-col font-medium">
                              {alg}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      {getAlgorithmInfo().description}
                    </p>
                  </CardContent>
                </Card>

                {/* Token Claims */}
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-lg py-3">
                    <CardTitle className="text-sm font-medium">
                      Token Claims
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="iat"
                          checked={config.addIat}
                          onCheckedChange={checked =>
                            updateConfig({ addIat: checked as boolean })
                          }
                          className="border-green-300 data-[state=checked]:bg-green-500"
                        />
                        <Label htmlFor="iat" className="text-sm cursor-pointer">
                          Add issued at (iat)
                        </Label>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="exp"
                          checked={config.addExp}
                          onCheckedChange={checked =>
                            updateConfig({ addExp: checked as boolean })
                          }
                          className="border-green-300 data-[state=checked]:bg-green-500"
                        />
                        <Label htmlFor="exp" className="text-sm cursor-pointer">
                          Add expire at (exp)
                        </Label>
                      </div>

                      {config.addExp && (
                        <div className="ml-6 space-y-3 p-3 bg-white rounded border border-green-200">
                          <Label
                            htmlFor="expOffset"
                            className="text-sm font-medium text-slate-600"
                          >
                            Expiration time
                          </Label>
                          <Select
                            value={config.expOffset.toString()}
                            onValueChange={value =>
                              updateConfig({ expOffset: parseInt(value) })
                            }
                          >
                            <SelectTrigger className="w-full border-green-200 focus:border-green-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXP_OFFSETS.map(offset => (
                                <SelectItem
                                  key={offset.value}
                                  value={offset.value.toString()}
                                >
                                  {offset.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {config.expOffset === -1 && (
                            <div className="space-y-2">
                              <Label
                                htmlFor="customExp"
                                className="text-sm text-slate-600"
                              >
                                Custom expiration (minutes)
                              </Label>
                              <Input
                                id="customExp"
                                type="number"
                                min="1"
                                value={config.customExpMinutes || ""}
                                onChange={e =>
                                  updateConfig({
                                    customExpMinutes:
                                      parseInt(e.target.value) || 60,
                                  })
                                }
                                className="border-green-200 focus:border-green-500"
                                placeholder="60"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Generate Button */}
                <Button
                  onClick={generateJWT}
                  disabled={!!payloadError}
                  className="w-full h-16 text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                  text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  size="default"
                >
                  <CogIcon className="h-4 w-4" />
                  Generate JWT
                </Button>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-4 lg:col-span-5">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <Copy className="h-3 w-3" />
                    </div>
                    <span>Generated JWT Token</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* JWT Output */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-slate-700">
                        Token
                      </Label>
                      {jwt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(jwt)}
                          className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={jwt}
                      readOnly
                      className="font-mono text-sm min-h-[120px] bg-gradient-to-br from-slate-50 to-blue-50 
                        border-slate-200 resize-none"
                      placeholder="Generated JWT will appear here..."
                    />
                  </div>

                  {jwt && (
                    <>
                      <Separator className="bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

                      {/* Decoded Header */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span>Decoded Header</span>
                        </Label>
                        <Textarea
                          value={decodedHeader}
                          readOnly
                          className="font-mono text-sm min-h-[80px] bg-gradient-to-br from-blue-50 to-indigo-50 
                            border-blue-200 resize-none"
                        />
                      </div>

                      {/* Decoded Payload */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Decoded Payload</span>
                        </Label>
                        <Textarea
                          value={decodedPayload}
                          readOnly
                          className="font-mono text-sm min-h-[120px] bg-gradient-to-br from-green-50 to-emerald-50 
                            border-green-200 resize-none"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div
                        className="w-8 h-8 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full 
                        flex items-center justify-center shadow-sm"
                      >
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-amber-800">
                        🔒 Security Notice
                      </p>
                      <p className="text-sm text-amber-700 leading-relaxed">
                        All operations are performed locally in your browser.
                        Your secrets and private keys never leave your machine.
                        This tool runs entirely client-side for maximum
                        security.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Index;
