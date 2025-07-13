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
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css";
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
  Cog,
  TriangleAlert,
  Github,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ThemeToggle";
import { algorithmConfig } from "@/config/theme";
import { STORAGE_KEYS, DEFAULT_CONFIG } from "@/config/app.config";

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

const Index = () => {
  const [config, setConfig] = useState<JWTConfig>({
    algorithm: DEFAULT_CONFIG.algorithm,
    payload: DEFAULT_CONFIG.payload,
    secret: DEFAULT_CONFIG.secret,
    privateKey: DEFAULT_CONFIG.privateKey,
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
    localStorage.setItem(
      STORAGE_KEYS.JWT_DEV_TOOL_CONFIG,
      JSON.stringify(config)
    );
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
      const parsedPayload = JSON.parse(config.payload);

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

      let secretOrPrivateKey: CryptoKey | Uint8Array;

      // Handle different algorithm types
      if (config.algorithm.startsWith("HS")) {
        // HMAC algorithms
        const encoder = new TextEncoder();
        secretOrPrivateKey = encoder.encode(config.secret);
      } else if (
        config.algorithm.startsWith("RS") ||
        config.algorithm.startsWith("PS")
      ) {
        // RSA algorithms
        secretOrPrivateKey = await importPKCS8(
          config.privateKey,
          config.algorithm
        );
      } else if (config.algorithm.startsWith("ES")) {
        // ECDSA algorithms
        secretOrPrivateKey = await importPKCS8(
          config.privateKey,
          config.algorithm
        );
      } else {
        throw new Error(`Unsupported algorithm: ${config.algorithm}`);
      }

      // Create the JWT
      const token = await new SignJWT(parsedPayload)
        .setProtectedHeader({ alg: config.algorithm, typ: "JWT" })
        .setIssuedAt()
        .sign(secretOrPrivateKey);

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
    a.download = "jencoder-config.json";
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
      {/* Theme Toggle Button */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Jencoder - JWT Encoder Tool
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg">
              Generate JWT tokens with various algorithms
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Configuration Panel */}
            <div className="space-y-4 lg:col-span-5">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-white/10 backdrop-blur-sm">
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
                      <div className="relative inline-block">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20 cursor-pointer relative"
                        >
                          <label className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-1" />
                            Import
                            <input
                              type="file"
                              accept=".json"
                              onChange={importConfig}
                              className="hidden"
                            />
                          </label>
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
                        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Payload (JSON)
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fixAndPrettifyPayload}
                        className="text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Attempt to auto-correct and format your payload"
                      >
                        <Code2 className="h-3 w-3 mr-1" />
                        Fix & Prettify JSON
                      </Button>
                    </div>
                    <div className="relative">
                      <div
                        className={`font-mono text-sm min-h-[120px] bg-slate-50 dark:bg-slate-800 border rounded-md overflow-hidden
                          ${
                            payloadError
                              ? "border-red-500"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                      >
                        <Editor
                          value={config.payload}
                          onValueChange={code => {
                            updateConfig({ payload: code });
                            validatePayload(code);
                          }}
                          highlight={code =>
                            highlight(code, languages.json, "json")
                          }
                          padding={10}
                          className={`w-full min-h-[120px] bg-slate-50 dark:bg-slate-800 font-mono text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                            ${
                              payloadError
                                ? "border-red-500"
                                : "border-slate-200 dark:border-slate-700"
                            }`}
                          textareaClassName="focus:outline-none"
                          placeholder="Enter JWT payload as JSON..."
                          style={{
                            fontFamily: '"Fira code", "Fira Mono", monospace',
                            fontSize: "0.875rem",
                            lineHeight: "1.5",
                          }}
                        />
                      </div>
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
                          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
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
                          className={`font-mono text-sm min-h-[100px] pr-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 
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
                          className="absolute right-2 top-2 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                          >
                            Private Key
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Used for signing JWT. Enter your private key in
                                PKCS#8 format with minimum 2048 characters
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <Textarea
                            id="privateKey"
                            value={config.privateKey}
                            onChange={e =>
                              updateConfig({ privateKey: e.target.value })
                            }
                            className={`font-mono text-sm min-h-[100px] pr-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 
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
                            className="absolute right-2 top-2 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
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
                            className={`font-mono text-sm min-h-[80px] pr-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 
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
                            className="absolute right-2 top-2 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-white/10 backdrop-blur-sm">
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
                      <SelectTrigger className="border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20">
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
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-white/10 backdrop-blur-sm">
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
                        <div className="ml-6 space-y-3 p-3 bg-white rounded border border-green-200 dark:bg-slate-800">
                          <Label
                            htmlFor="expOffset"
                            className="text-sm font-medium text-slate-600 dark:text-slate-300"
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
                                className="text-sm text-slate-600 dark:text-slate-300"
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
                  <Cog className="h-4 w-4" />
                  Generate JWT
                </Button>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-4 lg:col-span-5">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-white/10 backdrop-blur-sm">
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
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
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
                      className="font-mono text-sm min-h-[120px] dark:bg-slate-800
                        border-slate-200 dark:border-slate-700 resize-none"
                      placeholder="Generated JWT will appear here..."
                    />
                  </div>

                  {jwt && (
                    <>
                      <Separator className="bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

                      {/* Decoded Header */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span>Decoded Header</span>
                        </Label>
                        <div className="relative">
                          <div className="font-mono text-sm min-h-[80px] bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-md overflow-hidden ">
                            <Editor
                              value={decodedHeader}
                              onValueChange={() => {}}
                              highlight={code =>
                                highlight(code, languages.json, "json")
                              }
                              padding={10}
                              readOnly
                              className="w-full min-h-[80px] bg-transparent dark:bg-slate-800 font-mono text-sm pointer-events-none"
                              textareaClassName="focus:outline-none cursor-default"
                              style={{
                                fontFamily:
                                  '"Fira code", "Fira Mono", monospace',
                                fontSize: "0.875rem",
                                lineHeight: "1.5",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Decoded Payload */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Decoded Payload</span>
                        </Label>
                        <div className="relative">
                          <div className="font-mono text-sm min-h-[120px] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 border border-green-200 rounded-md overflow-hidden">
                            <Editor
                              value={decodedPayload}
                              onValueChange={() => {}}
                              highlight={code =>
                                highlight(code, languages.json, "json")
                              }
                              padding={10}
                              readOnly
                              className="w-full min-h-[120px] bg-transparent dark:bg-slate-800 font-mono text-sm pointer-events-none"
                              textareaClassName="focus:outline-none cursor-default"
                              style={{
                                fontFamily:
                                  '"Fira code", "Fira Mono", monospace',
                                fontSize: "0.875rem",
                                lineHeight: "1.5",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900 dark:to-yellow-900">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0"></div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <TriangleAlert className="h-4 w-4" /> Security Notice
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

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground mt-5">
          <div className="container mx-auto px-4">
            <p className="mb-2">👨‍💻 Built by developers, for developers 👩‍💻</p>
            <a
              href="https://github.com/ashabhussan/jencoder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              <Github className="h-4 w-4 mr-1" />
              View on GitHub - Report Issues & Contribute
            </a>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
};

export default Index;
