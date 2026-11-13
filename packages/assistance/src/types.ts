/**
 * Types and Interfaces for Intelligent Form Assistance Engine (Layer 5)
 *
 * Provides contracts for contextual form assistance, deterministic offline heuristics,
 * and pluggable AI assistance providers.
 */

export interface FieldConstraints {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

export interface FieldContext {
  /** Identifier or form control name */
  fieldName: string;
  /** HTML input type or semantic data type (e.g., 'email', 'tel', 'password', 'text', 'date') */
  type?: string;
  /** Human-readable accessible label text */
  label?: string;
  /** Existing field instructions or description */
  description?: string;
  /** Whether the field is mandatory */
  required?: boolean;
  /**
   * Current field input value.
   * NOTE: Stripped when forwarding to remote AI providers unless explicitly authorized.
   */
  value?: string;
  /** Placeholder hint text */
  placeholder?: string;
  /** Regex pattern or format hint */
  pattern?: string;
  /** Minimum character length */
  minLength?: number;
  /** Maximum character length */
  maxLength?: number;
  /** HTML5 validation constraints */
  constraints?: FieldConstraints;
  /** Target language or locale code (e.g. 'en', 'am-ET') */
  locale?: string;
  /** Extensible custom properties */
  custom?: Record<string, unknown>;
}

export type StandardErrorType =
  | "valueMissing"
  | "patternMismatch"
  | "typeMismatch"
  | "tooShort"
  | "tooLong"
  | "rangeUnderflow"
  | "rangeOverflow"
  | "stepMismatch"
  | "badInput"
  | "customError";

export interface ErrorContext {
  /** Identifier or form control name */
  fieldName: string;
  /** Human-readable accessible label text */
  label?: string;
  /** Standard HTML5 ValidityState error type or custom error code */
  errorType?: StandardErrorType | string;
  /** Raw validation message from browser or validator library */
  rawMessage?: string;
  /** Erroneous value (sanitized before remote transmission) */
  value?: string;
  /** Expected format description */
  expectedFormat?: string;
  /** Specific constraint details that were violated */
  constraintDetails?: FieldConstraints;
  /** Target language or locale code */
  locale?: string;
}

export interface SimplificationContext {
  /** Target language or locale code (default: 'en') */
  locale?: string;
  /** Maximum character length for summarized output (default: 500) */
  maxLength?: number;
  /** Target reading level */
  targetReadingLevel?: "simple" | "standard";
  /** Simplification profile intensity */
  level?: "plain" | "simple";
}

export interface AssistanceProvider {
  /** Unique provider identifier (e.g. 'heuristic', 'mock-ai', 'openai') */
  readonly id: string;
  /** Display name of the provider */
  readonly name: string;
  /** Optional provider description */
  readonly description?: string;
  /** Whether the provider operates offline without remote network requests */
  readonly isOfflineAvailable?: boolean;

  /**
   * Generates a plain-language explanation of what a form field is requesting.
   */
  explainField(context: FieldContext): Promise<string>;

  /**
   * Translates a technical or cryptic validation error into actionable, user-friendly guidance.
   */
  explainError(context: ErrorContext): Promise<string>;

  /**
   * Simplifies dense, legalistic, or bureaucratic instructions into accessible plain language.
   */
  simplifyInstructions(text: string, context?: SimplificationContext): Promise<string>;
}

export interface AssistancePrivacyOptions {
  /** Whether to allow transmitting field values to non-heuristic (remote) providers (default: false) */
  allowRemoteFieldValues?: boolean;
  /** Alias for allowRemoteFieldValues */
  allowRemoteDataTransmission?: boolean;
  /** Redact passwords, credit cards, and sensitive identifiers unconditionally */
  redactSensitiveValues?: boolean;
}

export interface AssistanceManagerConfig {
  /** Initial default provider (defaults to HeuristicAssistanceProvider if omitted) */
  defaultProvider?: AssistanceProvider;
  /** Whether to allow transmitting field values to non-heuristic (remote) providers (default: false) */
  allowRemoteFieldValues?: boolean;
  /** Privacy and data minimization settings */
  privacy?: AssistancePrivacyOptions;
  /** Enable in-memory response caching (default: true) */
  enableCache?: boolean;
}

export type AssistanceManagerOptions = AssistanceManagerConfig;
