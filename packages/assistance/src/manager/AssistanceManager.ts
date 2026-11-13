import {
  AssistanceManagerConfig,
  AssistanceManagerOptions,
  AssistancePrivacyOptions,
  AssistanceProvider,
  ErrorContext,
  FieldContext,
  SimplificationContext,
} from "../types";
import { HeuristicAssistanceProvider } from "../heuristic/HeuristicAssistanceProvider";

export class AssistanceManager {
  private providers = new Map<string, AssistanceProvider>();
  private defaultProvider: AssistanceProvider;
  private cache = new Map<string, string>();
  private privacy: AssistancePrivacyOptions;
  private enableCache: boolean;

  constructor(config?: AssistanceManagerConfig | AssistanceProvider) {
    if (config && "id" in config && typeof (config as AssistanceProvider).explainField === "function") {
      this.defaultProvider = config as AssistanceProvider;
      this.privacy = {
        allowRemoteFieldValues: false,
        allowRemoteDataTransmission: false,
        redactSensitiveValues: true,
      };
      this.enableCache = true;
    } else {
      const cfg = (config as AssistanceManagerOptions) || {};
      this.defaultProvider = cfg.defaultProvider || new HeuristicAssistanceProvider();
      const allowRemote = cfg.allowRemoteFieldValues ?? cfg.privacy?.allowRemoteFieldValues ?? cfg.privacy?.allowRemoteDataTransmission ?? false;
      this.privacy = {
        allowRemoteFieldValues: allowRemote,
        allowRemoteDataTransmission: allowRemote,
        redactSensitiveValues: cfg.privacy?.redactSensitiveValues ?? true,
      };
      this.enableCache = cfg.enableCache !== false;
    }

    this.registerProvider(this.defaultProvider);
  }

  registerProvider(provider: AssistanceProvider): void {
    if (!provider || !provider.id) return;
    this.providers.set(provider.id, provider);
  }

  unregisterProvider(providerId: string): boolean {
    if (providerId === this.defaultProvider.id) {
      return false; // Cannot unregister the active default fallback provider
    }
    return this.providers.delete(providerId);
  }

  getProvider(providerId: string): AssistanceProvider | undefined {
    return this.providers.get(providerId);
  }

  listProviders(): AssistanceProvider[] {
    return Array.from(this.providers.values());
  }

  getAllProviders(): AssistanceProvider[] {
    return this.listProviders();
  }

  setDefaultProvider(provider: AssistanceProvider | string): void {
    if (typeof provider === "string") {
      const found = this.providers.get(provider);
      if (found) {
        this.defaultProvider = found;
      }
    } else {
      this.defaultProvider = provider;
      this.registerProvider(provider);
    }
  }

  getDefaultProvider(): AssistanceProvider {
    return this.defaultProvider;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  async explainField(context: FieldContext, providerId?: string): Promise<string> {
    const locale = context?.locale || "en";
    const key = `field:${context?.fieldName || ""}:${context?.type || ""}:${locale}`;
    if (this.enableCache && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const provider = (providerId && this.providers.get(providerId)) || this.defaultProvider;
    const sanitized = this.sanitizeFieldContext(context, provider);

    try {
      const res = await provider.explainField(sanitized);
      if (res && res.trim().length > 0) {
        if (this.enableCache) this.cache.set(key, res);
        return res;
      }
      throw new Error("Provider returned empty explanation");
    } catch {
      // Seamless deterministic fallback to default provider
      const fallbackRes = await this.defaultProvider.explainField(context);
      if (this.enableCache) this.cache.set(key, fallbackRes);
      return fallbackRes;
    }
  }

  async explainError(context: ErrorContext, providerId?: string): Promise<string> {
    const locale = context?.locale || "en";
    const key = `error:${context?.fieldName || ""}:${context?.errorType || ""}:${context?.rawMessage || ""}:${locale}`;
    if (this.enableCache && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const provider = (providerId && this.providers.get(providerId)) || this.defaultProvider;
    const sanitized = this.sanitizeErrorContext(context, provider);

    try {
      const res = await provider.explainError(sanitized);
      if (res && res.trim().length > 0) {
        if (this.enableCache) this.cache.set(key, res);
        return res;
      }
      throw new Error("Provider returned empty error explanation");
    } catch {
      // Seamless deterministic fallback to default provider
      const fallbackRes = await this.defaultProvider.explainError(context);
      if (this.enableCache) this.cache.set(key, fallbackRes);
      return fallbackRes;
    }
  }

  async simplifyInstructions(
    text: string,
    param2?: string | SimplificationContext,
    param3?: string | SimplificationContext
  ): Promise<string> {
    let providerId: string | undefined;
    let context: SimplificationContext | undefined;

    if (typeof param2 === "string") {
      providerId = param2;
      if (typeof param3 === "object") {
        context = param3;
      }
    } else if (typeof param2 === "object") {
      context = param2;
      if (typeof param3 === "string") {
        providerId = param3;
      }
    }

    const locale = context?.locale || "en";
    const key = `simplify:${text}:${locale}`;
    if (this.enableCache && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const provider = (providerId && this.providers.get(providerId)) || this.defaultProvider;

    try {
      const res = await provider.simplifyInstructions(text, context);
      if (this.enableCache) this.cache.set(key, res);
      return res;
    } catch {
      // Seamless deterministic fallback to default provider
      const fallbackRes = await this.defaultProvider.simplifyInstructions(text, context);
      if (this.enableCache) this.cache.set(key, fallbackRes);
      return fallbackRes;
    }
  }

  /**
   * Privacy Guardrail: Strips user input value before transmission to remote providers
   * unless explicitly allowed by privacy settings. Unconditionally strips sensitive fields.
   */
  private sanitizeFieldContext(context: FieldContext, provider: AssistanceProvider): FieldContext {
    if (!context) return {} as FieldContext;
    if (provider.isOfflineAvailable) return context;

    const sanitized: FieldContext = { ...context };
    const allowRemote = this.privacy.allowRemoteFieldValues || this.privacy.allowRemoteDataTransmission;

    if (!allowRemote) {
      delete sanitized.value;
    }
    if (this.privacy.redactSensitiveValues && this.isSensitiveField(context.fieldName, context.type)) {
      delete sanitized.value;
    }
    return sanitized;
  }

  private sanitizeErrorContext(context: ErrorContext, provider: AssistanceProvider): ErrorContext {
    if (!context) return {} as ErrorContext;
    if (provider.isOfflineAvailable) return context;

    const sanitized: ErrorContext = { ...context };
    const allowRemote = this.privacy.allowRemoteFieldValues || this.privacy.allowRemoteDataTransmission;

    if (!allowRemote) {
      delete sanitized.value;
    }
    if (this.privacy.redactSensitiveValues && this.isSensitiveField(context.fieldName)) {
      delete sanitized.value;
    }
    return sanitized;
  }

  private isSensitiveField(fieldName?: string, type?: string): boolean {
    const fn = (fieldName || "").toLowerCase();
    const t = (type || "").toLowerCase();
    return (
      t === "password" ||
      fn.includes("password") ||
      fn.includes("card") ||
      fn.includes("credit") ||
      fn.includes("cvv") ||
      fn.includes("cvc") ||
      fn.includes("ssn") ||
      fn.includes("pin")
    );
  }
}
