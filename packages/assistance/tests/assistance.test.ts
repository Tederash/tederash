import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  HeuristicAssistanceProvider,
  AssistanceManager,
  type FieldContext,
  type ErrorContext,
  type AssistanceProvider,
} from "../src";

describe("Intelligent Form Assistance Engine (@tederash/assistance)", () => {
  let heuristicProvider: HeuristicAssistanceProvider;

  beforeEach(() => {
    heuristicProvider = new HeuristicAssistanceProvider();
  });

  // ==========================================================================
  // Group 1: Heuristic Field Explanations (Deterministic Offline Rules)
  // ==========================================================================
  describe("HeuristicAssistanceProvider: Field Explanations", () => {
    it("1.1 explains Email field correctly by type and name", async () => {
      const byType = await heuristicProvider.explainField({ fieldName: "contact", type: "email" });
      const byName = await heuristicProvider.explainField({ fieldName: "userEmail", type: "text" });

      expect(byType).toContain("valid email address with an @ symbol");
      expect(byName).toContain("valid email address with an @ symbol");
    });

    it("1.2 explains Phone field correctly with area code requirement", async () => {
      const byType = await heuristicProvider.explainField({ fieldName: "phone", type: "tel" });
      const byName = await heuristicProvider.explainField({ fieldName: "mobileNumber", type: "text" });

      expect(byType).toContain("complete phone number including your area code");
      expect(byName).toContain("complete phone number including your area code");
    });

    it("1.3 explains Password field correctly with character requirements", async () => {
      const byType = await heuristicProvider.explainField({ fieldName: "secretKey", type: "password" });
      const byName = await heuristicProvider.explainField({ fieldName: "user_password", type: "text" });

      expect(byType).toContain("at least 8 characters");
      expect(byName).toContain("upper and lower case letters, numbers, and symbols");
    });

    it("1.4 explains Full Name field correctly", async () => {
      const res = await heuristicProvider.explainField({ fieldName: "fullName", type: "text" });
      expect(res).toContain("legal full name as shown on official identity documents");
    });

    it("1.5 explains Street Address field correctly", async () => {
      const res = await heuristicProvider.explainField({ fieldName: "streetAddress", type: "text" });
      expect(res).toContain("physical street address, including apartment, suite, or building number");
    });

    it("1.6 explains Postal Code / ZIP field correctly", async () => {
      const res = await heuristicProvider.explainField({ fieldName: "postalCode", type: "text" });
      expect(res).toContain("postal or ZIP code");
    });

    it("1.7 explains Date of Birth / Calendar Date field correctly", async () => {
      const byType = await heuristicProvider.explainField({ fieldName: "eventDate", type: "date" });
      const byName = await heuristicProvider.explainField({ fieldName: "dateOfBirth", type: "text" });

      expect(byType).toContain("YYYY-MM-DD");
      expect(byName).toContain("YYYY-MM-DD");
    });

    it("1.8 explains Payment Card field correctly", async () => {
      const res = await heuristicProvider.explainField({ fieldName: "creditCardNumber", type: "text" });
      expect(res).toContain("16-digit card number printed on the front of your payment card");
    });

    it("1.9 explains Search field correctly", async () => {
      const res = await heuristicProvider.explainField({ fieldName: "query", type: "search" });
      expect(res).toContain("Type keywords to search available content");
    });

    it("1.10 provides fallback for custom domain field with label", async () => {
      const res = await heuristicProvider.explainField({
        fieldName: "taxIdentificationNumber",
        type: "text",
        label: "Tax Identification Number",
      });

      expect(res).toBe("Please enter your Tax Identification Number accurately to complete this step.");
    });

    it("1.11 provides graceful fallback for empty or malformed context", async () => {
      const res = await heuristicProvider.explainField({} as FieldContext);
      expect(res).toBe("Please enter your information accurately to complete this step.");
    });

    it("1.12 supports Amharic localization for fields", async () => {
      const emailAm = await heuristicProvider.explainField({ fieldName: "email", type: "email", locale: "am" });
      const phoneAm = await heuristicProvider.explainField({ fieldName: "phone", type: "tel", locale: "am-ET" });
      const fallbackAm = await heuristicProvider.explainField({ fieldName: "custom", locale: "am", label: "መለያ ቁጥር" });

      expect(emailAm).toContain("የኢሜይል አድራሻ");
      expect(phoneAm).toContain("ስልክ ቁጥርዎን");
      expect(fallbackAm).toContain("መለያ ቁጥር");
    });
  });

  // ==========================================================================
  // Group 2: Error Translations & Plain-Language Guidance
  // ==========================================================================
  describe("HeuristicAssistanceProvider: Error Translations", () => {
    it("2.1 translates valueMissing error into required field prompt", async () => {
      const res = await heuristicProvider.explainError({
        fieldName: "username",
        label: "Username",
        errorType: "valueMissing",
      });

      expect(res).toBe("Username is required to continue. Please provide a value.");
    });

    it("2.2 translates patternMismatch for general fields", async () => {
      const res = await heuristicProvider.explainError({
        fieldName: "password",
        label: "Password",
        errorType: "patternMismatch",
      });

      expect(res).toContain("does not match the required format");
    });

    it("2.3 translates patternMismatch for phone fields into area-code guidance", async () => {
      const res = await heuristicProvider.explainError({
        fieldName: "phoneNumber",
        errorType: "patternMismatch",
      });

      expect(res).toBe("Your phone number appears incomplete. Please include the full number, including the area code.");
    });

    it("2.4 translates typeMismatch into invalid format explanation", async () => {
      const res = await heuristicProvider.explainError({
        fieldName: "userEmail",
        label: "Email",
        errorType: "typeMismatch",
      });

      expect(res).toBe("The value entered in Email is invalid. Please check the expected format.");
    });

    it("2.5 translates tooShort error with and without constraint details", async () => {
      const withoutMin = await heuristicProvider.explainError({
        fieldName: "bio",
        errorType: "tooShort",
      });
      const withMin = await heuristicProvider.explainError({
        fieldName: "bio",
        errorType: "tooShort",
        constraintDetails: { minLength: 20 },
      });

      expect(withoutMin).toContain("bio is too short. Please provide additional characters.");
      expect(withMin).toContain("It must contain at least 20 characters.");
    });

    it("2.6 translates tooLong error", async () => {
      const res = await heuristicProvider.explainError({
        fieldName: "headline",
        errorType: "tooLong",
      });

      expect(res).toContain("exceeds the maximum length allowed");
    });

    it("2.7 translates rangeUnderflow and rangeOverflow errors", async () => {
      const underflow = await heuristicProvider.explainError({
        fieldName: "age",
        errorType: "rangeUnderflow",
      });
      const overflow = await heuristicProvider.explainError({
        fieldName: "age",
        errorType: "rangeOverflow",
      });

      expect(underflow).toContain("below the minimum allowed value");
      expect(overflow).toContain("above the maximum allowed value");
    });

    it("2.8 translates stepMismatch and badInput errors", async () => {
      const step = await heuristicProvider.explainError({ fieldName: "quantity", errorType: "stepMismatch" });
      const bad = await heuristicProvider.explainError({ fieldName: "amount", errorType: "badInput" });

      expect(step).toContain("valid increment");
      expect(bad).toContain("valid value");
    });

    it("2.9 translates cryptic numeric regex rawMessages", async () => {
      const res = await heuristicProvider.explainError({
        fieldName: "zipCode",
        label: "ZIP Code",
        rawMessage: "Must match ^[0-9]+$",
      });

      expect(res).toBe("Please enter numbers only for ZIP Code.");
    });

    it("2.10 falls back to default message when errorType is undefined", async () => {
      const res = await heuristicProvider.explainError({ fieldName: "unknownField" });
      expect(res).toBe("Please check the format of this field.");
    });

    it("2.11 passes through rawMessage when errorType is unknown", async () => {
      const res = await heuristicProvider.explainError({
        fieldName: "field1",
        errorType: "customError",
        rawMessage: "Server rejected this value",
      });

      expect(res).toBe("Server rejected this value");
    });

    it("2.12 translates errors to Amharic when locale is 'am'", async () => {
      const requiredAm = await heuristicProvider.explainError({
        fieldName: "ስም",
        errorType: "valueMissing",
        locale: "am",
      });

      expect(requiredAm).toContain("አስፈላጊ ነው");
    });
  });

  // ==========================================================================
  // Group 3: Instruction Simplification
  // ==========================================================================
  describe("HeuristicAssistanceProvider: Instruction Simplification", () => {
    it("3.1 returns empty string for empty or whitespace text", async () => {
      expect(await heuristicProvider.simplifyInstructions("")).toBe("");
      expect(await heuristicProvider.simplifyInstructions("   ")).toBe("");
    });

    it("3.2 replaces legalistic account termination clause", async () => {
      const raw = "Failure to adhere to terms shall result in immediate account termination.";
      const simplified = await heuristicProvider.simplifyInstructions(raw);

      expect(simplified).toBe("You must follow the rules or your account will be closed.");
    });

    it("3.3 replaces bureaucratic vocabulary with plain language", async () => {
      const raw = "It is mandatory to utilize the form in order to expedite processing prior to commencement.";
      const simplified = await heuristicProvider.simplifyInstructions(raw);

      expect(simplified).toBe("It is required to use the form to speed up processing before start.");
    });

    it("3.4 summarizes long texts exceeding 500 characters", async () => {
      const longDisclaimer = "Legal Guidelines: " + "You agree to all conditions stated herein. ".repeat(30);
      expect(longDisclaimer.length).toBeGreaterThan(500);

      const simplified = await heuristicProvider.simplifyInstructions(longDisclaimer);
      expect(simplified).toBe("Summary: Read all guidelines carefully and complete each required field to submit.");
    });

    it("3.5 preserves text at or under 500 characters without summarization truncation", async () => {
      const shortText = "Please enter your legal name and contact details accurately.";
      const simplified = await heuristicProvider.simplifyInstructions(shortText);

      expect(simplified).toBe(shortText);
    });
  });

  // ==========================================================================
  // Group 4: AssistanceManager Provider Management & Caching
  // ==========================================================================
  describe("AssistanceManager: Provider Registry & Cache", () => {
    it("4.1 initializes with default HeuristicAssistanceProvider", () => {
      const manager = new AssistanceManager();
      expect(manager.getDefaultProvider()).toBeInstanceOf(HeuristicAssistanceProvider);
      expect(manager.listProviders()).toHaveLength(1);
    });

    it("4.2 registers, retrieves, and unregisters providers", () => {
      const manager = new AssistanceManager();
      const mockProvider: AssistanceProvider = {
        id: "mock-custom",
        name: "Custom Mock Provider",
        explainField: vi.fn().mockResolvedValue("Custom field explanation"),
        explainError: vi.fn().mockResolvedValue("Custom error explanation"),
        simplifyInstructions: vi.fn().mockResolvedValue("Custom simplified instructions"),
      };

      manager.registerProvider(mockProvider);
      expect(manager.getProvider("mock-custom")).toBe(mockProvider);
      expect(manager.listProviders()).toHaveLength(2);

      // Cannot unregister default provider
      expect(manager.unregisterProvider("heuristic")).toBe(false);

      // Can unregister added custom provider
      expect(manager.unregisterProvider("mock-custom")).toBe(true);
      expect(manager.getProvider("mock-custom")).toBeUndefined();
    });

    it("4.3 routes requests to registered provider by providerId", async () => {
      const manager = new AssistanceManager();
      const customProvider: AssistanceProvider = {
        id: "custom-ai",
        name: "Custom AI Provider",
        explainField: vi.fn().mockResolvedValue("AI generated field explanation"),
        explainError: vi.fn().mockResolvedValue("AI generated error explanation"),
        simplifyInstructions: vi.fn().mockResolvedValue("AI simplified instructions"),
      };

      manager.registerProvider(customProvider);

      const explanation = await manager.explainField({ fieldName: "email", type: "email" }, "custom-ai");
      expect(explanation).toBe("AI generated field explanation");
      expect(customProvider.explainField).toHaveBeenCalledTimes(1);
    });

    it("4.4 caches identical field explanation responses", async () => {
      const mockExplain = vi.fn().mockResolvedValue("Cached field response");
      const customProvider: AssistanceProvider = {
        id: "cached-provider",
        name: "Cached Provider",
        explainField: mockExplain,
        explainError: vi.fn(),
        simplifyInstructions: vi.fn(),
      };

      const manager = new AssistanceManager();
      manager.registerProvider(customProvider);

      const ctx: FieldContext = { fieldName: "phone", type: "tel" };

      const res1 = await manager.explainField(ctx, "cached-provider");
      const res2 = await manager.explainField(ctx, "cached-provider");

      expect(res1).toBe("Cached field response");
      expect(res2).toBe("Cached field response");
      expect(mockExplain).toHaveBeenCalledTimes(1);
      expect(manager.getCacheSize()).toBeGreaterThan(0);
    });

    it("4.5 clears cache successfully with clearCache()", async () => {
      const mockExplain = vi.fn().mockResolvedValue("Dynamic response");
      const customProvider: AssistanceProvider = {
        id: "clear-provider",
        name: "Clear Provider",
        explainField: mockExplain,
        explainError: vi.fn(),
        simplifyInstructions: vi.fn(),
      };

      const manager = new AssistanceManager();
      manager.registerProvider(customProvider);

      await manager.explainField({ fieldName: "email", type: "email" }, "clear-provider");
      expect(manager.getCacheSize()).toBe(1);

      manager.clearCache();
      expect(manager.getCacheSize()).toBe(0);

      await manager.explainField({ fieldName: "email", type: "email" }, "clear-provider");
      expect(mockExplain).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Group 5: Fallback Resiliency on Provider Failure
  // ==========================================================================
  describe("AssistanceManager: Fallback Resiliency", () => {
    it("5.1 seamlessly falls back to default provider when remote provider rejects", async () => {
      const failingAIProvider: AssistanceProvider = {
        id: "mock-failing-ai",
        name: "Failing Remote AI",
        explainField: vi.fn().mockRejectedValue(new Error("Network timeout")),
        explainError: vi.fn().mockRejectedValue(new Error("500 Internal Error")),
        simplifyInstructions: vi.fn().mockRejectedValue(new Error("Service unavailable")),
      };

      const manager = new AssistanceManager();
      manager.registerProvider(failingAIProvider);

      const fieldExplanation = await manager.explainField(
        { fieldName: "phone", type: "tel" },
        "mock-failing-ai"
      );
      expect(fieldExplanation).toContain("complete phone number including your area code");

      const errorExplanation = await manager.explainError(
        { fieldName: "password", errorType: "patternMismatch" },
        "mock-failing-ai"
      );
      expect(errorExplanation).toContain("does not match the required format");

      const simplified = await manager.simplifyInstructions(
        "Failure to adhere to terms shall result in immediate account termination.",
        "mock-failing-ai"
      );
      expect(simplified).toBe("You must follow the rules or your account will be closed.");
    });

    it("5.2 falls back to default provider when remote provider returns empty string", async () => {
      const emptyProvider: AssistanceProvider = {
        id: "empty-provider",
        name: "Empty Provider",
        explainField: vi.fn().mockResolvedValue(""),
        explainError: vi.fn().mockResolvedValue("   "),
        simplifyInstructions: vi.fn().mockResolvedValue(""),
      };

      const manager = new AssistanceManager();
      manager.registerProvider(emptyProvider);

      const explanation = await manager.explainField({ fieldName: "email", type: "email" }, "empty-provider");
      expect(explanation).toContain("valid email address with an @ symbol");
    });
  });

  // ==========================================================================
  // Group 6: Privacy Guardrails & Data Minimization
  // ==========================================================================
  describe("AssistanceManager: Privacy & Data Minimization Guardrails", () => {
    it("6.1 strips user input values when transmitting to remote non-offline providers by default", async () => {
      let capturedContext: FieldContext | undefined;

      const remoteProvider: AssistanceProvider = {
        id: "remote-ai",
        name: "Remote AI Service",
        isOfflineAvailable: false,
        explainField: vi.fn().mockImplementation(async (ctx: FieldContext) => {
          capturedContext = ctx;
          return "Explanation for field";
        }),
        explainError: vi.fn().mockResolvedValue("Error explanation"),
        simplifyInstructions: vi.fn().mockResolvedValue("Simplified"),
      };

      const manager = new AssistanceManager({
        defaultProvider: new HeuristicAssistanceProvider(),
        allowRemoteFieldValues: false,
      });
      manager.registerProvider(remoteProvider);

      await manager.explainField(
        {
          fieldName: "email",
          type: "email",
          value: "sensitive-user-email@domain.com",
        },
        "remote-ai"
      );

      expect(capturedContext).toBeDefined();
      expect((capturedContext as FieldContext).value).toBeUndefined();
      expect((capturedContext as FieldContext).fieldName).toBe("email");
    });

    it("6.2 unconditionally redacts sensitive fields like passwords and credit cards for remote providers", async () => {
      let capturedContext: FieldContext | undefined;

      const remoteProvider: AssistanceProvider = {
        id: "remote-ai-sensitive",
        name: "Remote AI Service",
        isOfflineAvailable: false,
        explainField: vi.fn().mockImplementation(async (ctx: FieldContext) => {
          capturedContext = ctx;
          return "Explanation";
        }),
        explainError: vi.fn().mockResolvedValue("Error"),
        simplifyInstructions: vi.fn().mockResolvedValue("Simplified"),
      };

      const manager = new AssistanceManager({
        allowRemoteFieldValues: true, // even if remote values were enabled
        privacy: { redactSensitiveValues: true },
      });
      manager.registerProvider(remoteProvider);

      await manager.explainField(
        {
          fieldName: "userPassword",
          type: "password",
          value: "SuperSecretP@ssword123",
        },
        "remote-ai-sensitive"
      );

      expect(capturedContext).toBeDefined();
      expect((capturedContext as FieldContext).value).toBeUndefined();
    });

    it("6.3 preserves context for local offline heuristic provider without data loss", async () => {
      const heuristic = new HeuristicAssistanceProvider();
      expect(heuristic.isOfflineAvailable).toBe(true);

      const explanation = await heuristic.explainField({
        fieldName: "userEmail",
        type: "email",
        value: "user@example.com",
      });

      expect(explanation).toContain("valid email address");
    });
  });

  // ==========================================================================
  // Group 7: Offline Availability & Zero Network Dependencies
  // ==========================================================================
  describe("HeuristicAssistanceProvider: Offline Availability", () => {
    it("7.1 executes instantly and synchronously as resolved Promises without fetch or DOM", async () => {
      const provider = new HeuristicAssistanceProvider();

      const fieldPromise = provider.explainField({ fieldName: "email", type: "email" });
      const errorPromise = provider.explainError({ fieldName: "email", errorType: "valueMissing" });
      const simplifyPromise = provider.simplifyInstructions("Failure to adhere to terms shall result in immediate account termination.");

      expect(fieldPromise).toBeInstanceOf(Promise);
      expect(errorPromise).toBeInstanceOf(Promise);
      expect(simplifyPromise).toBeInstanceOf(Promise);

      const [fieldRes, errorRes, simplifyRes] = await Promise.all([
        fieldPromise,
        errorPromise,
        simplifyPromise,
      ]);

      expect(fieldRes).toContain("valid email address");
      expect(errorRes).toContain("email is required");
      expect(simplifyRes).toBe("You must follow the rules or your account will be closed.");
    });
  });
});
