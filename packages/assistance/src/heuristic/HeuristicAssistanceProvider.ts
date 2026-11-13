import {
  AssistanceProvider,
  ErrorContext,
  FieldContext,
  SimplificationContext,
} from "../types";

/**
 * Deterministic offline rule-based assistance provider.
 * Requires zero network dependencies and executes synchronously/instantly.
 */
export class HeuristicAssistanceProvider implements AssistanceProvider {
  readonly id = "heuristic";
  readonly name = "Offline Deterministic Assistance";
  readonly isOfflineAvailable = true;

  async explainField(context: FieldContext): Promise<string> {
    const ctx = context || ({} as FieldContext);
    const name = (ctx.fieldName || "").toLowerCase();
    const type = (ctx.type || "").toLowerCase();
    const label = ctx.label || ctx.fieldName || "";
    const isAmharic = (ctx.locale || "").toLowerCase().startsWith("am");

    // 1. Email address
    if (name.includes("email") || type === "email") {
      return isAmharic
        ? "እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ (@ ምልክት እና ዶሜይን ያለው፣ ለምሳሌ name@example.com)።"
        : "Please enter a valid email address with an @ symbol and a domain (e.g. name@example.com).";
    }

    // 2. Password security
    if (name.includes("password") || type === "password" || name.includes("pass") || name.includes("secret")) {
      return isAmharic
        ? "እባክዎ ቢያንስ 8 ፊደላት፣ ቁጥሮች እና ምልክቶች ያሉት ደህንነቱ የተጠበቀ የይለፍ ቃል ያስገቡ።"
        : "Create a secure password with at least 8 characters, including upper and lower case letters, numbers, and symbols.";
    }

    // 3. Telephone number
    if (name.includes("phone") || type === "tel" || name.includes("mobile") || name.includes("cell")) {
      return isAmharic
        ? "እባክዎ ሙሉ ስልክ ቁጥርዎን ከአካባቢ መለያ ኮድ ጋር ያስገቡ (ለምሳሌ 555-123-4567)።"
        : "Enter your complete phone number including your area code (e.g. 555-123-4567).";
    }

    // 4. Full Name / Name fields
    if (name.includes("fullname") || name === "name" || name.includes("firstname") || name.includes("lastname")) {
      return isAmharic
        ? "እባክዎ ሙሉ ስምዎን በይፋዊ መታወቂያ ሰነድ ላይ እንዳለው ያስገቡ።"
        : "Enter your legal full name as shown on official identity documents.";
    }

    // 5. Street Address
    if (name.includes("address") || name.includes("street") || name.includes("line1") || name.includes("line2")) {
      return isAmharic
        ? "እባክዎ የቤት ወይም የጎዳና አድራሻዎን፣ የህንፃ ወይም አፓርታማ ቁጥርን ጨምሮ ያስገቡ።"
        : "Enter your physical street address, including apartment, suite, or building number if applicable.";
    }

    // 6. Postal Code / ZIP
    if (name.includes("postal") || name.includes("zip") || name.includes("postcode")) {
      return isAmharic
        ? "እባክዎ ባለ 5 አሃዝ ዚፕ ኮድ ወይም የፖስታ መለያ ቁጥርዎን ያስገቡ።"
        : "Enter your local postal or ZIP code.";
    }

    // 7. Date of Birth / Calendar Date
    if (name.includes("date") || name.includes("birth") || name.includes("dob") || type === "date") {
      return isAmharic
        ? "እባክዎ ቀኑን በ ዓዓዓዓ-ወወ-ቀቀ ወይም ወወ/ቀቀ/ዓዓዓዓ ቅርጸት ያስገቡ።"
        : "Select or enter a date using the format YYYY-MM-DD or MM/DD/YYYY.";
    }

    // 8. Payment Card
    if (name.includes("card") || name.includes("credit") || name.includes("pan") || name.includes("cvv") || name.includes("cvc")) {
      return isAmharic
        ? "እባክዎ በክፍያ ካርድዎ ፊት ለፊት የተጻፈውን ባለ 16 አሃዝ የካርድ ቁጥር ያስገቡ።"
        : "Enter the 16-digit card number printed on the front of your payment card without spaces or hyphens.";
    }

    // 9. Search query
    if (name.includes("search") || type === "search") {
      return isAmharic
        ? "እባክዎ ለመፈለግ ቃላትን ያስገቡ።"
        : "Type keywords to search available content.";
    }

    // Generic fallback
    if (isAmharic) {
      return `እባክዎ ይህንን እርምጃ ለማጠናቀቅ ${label || "መረጃዎን"} በትክክል ያስገቡ።`;
    }
    const identifier = label || "information";
    return `Please enter your ${identifier} accurately to complete this step.`;
  }

  async explainError(context: ErrorContext): Promise<string> {
    const ctx = context || ({} as ErrorContext);
    const fieldIdentifier = ctx.label || ctx.fieldName || "";
    const name = fieldIdentifier || "This field";
    const type = ctx.errorType || "";
    const isAmharic = (ctx.locale || "").toLowerCase().startsWith("am");

    // Standard HTML5 ValidityState error translations
    if (type === "valueMissing") {
      return isAmharic
        ? `${name} አስፈላጊ ነው። እባክዎ መረጃ ያስገቡ።`
        : `${name} is required to continue. Please provide a value.`;
    }

    if (type === "patternMismatch") {
      const lowerName = (ctx.fieldName || "").toLowerCase();
      if (lowerName.includes("phone") || lowerName.includes("tel")) {
        return isAmharic
          ? "ስልክ ቁጥርዎ ያልተሟላ ይመስላል። እባክዎ የአካባቢ ኮዱን ጨምሮ ያስገቡ።"
          : "Your phone number appears incomplete. Please include the full number, including the area code.";
      }
      return isAmharic
        ? `${name} ትክክለኛውን ቅርጸት አያሟላም። እባክዎ እንደገና ይሞክሩ።`
        : `${name} does not match the required format. Please verify the rules above and try again.`;
    }

    if (type === "typeMismatch") {
      return isAmharic
        ? `በ${name} ውስጥ የገባው መረጃ ልክ አይደለም። እባክዎ ትክክለኛውን ቅርጸት ያረጋግጡ።`
        : `The value entered in ${name} is invalid. Please check the expected format.`;
    }

    if (type === "tooShort") {
      const minLength = ctx.constraintDetails?.minLength;
      if (minLength) {
        return isAmharic
          ? `${name} በጣም አጭር ነው። ቢያንስ ${minLength} ፊደላትን መያዝ አለበት።`
          : `${name} is too short. Please provide additional characters. It must contain at least ${minLength} characters.`;
      }
      return isAmharic
        ? `${name} በጣም አጭር ነው። እባክዎ ተጨማሪ ፊደላትን ያስገቡ።`
        : `${name} is too short. Please provide additional characters.`;
    }

    if (type === "tooLong") {
      return isAmharic
        ? `${name} ከተፈቀደው በላይ ረጅም ነው። እባክዎ ያሳጥሩት።`
        : `${name} exceeds the maximum length allowed. Please shorten your input.`;
    }

    if (type === "rangeUnderflow") {
      return isAmharic
        ? `በ${name} ውስጥ የገባው መጠን ከተፈቀደው ዝቅተኛ መጠን በታች ነው።`
        : `The value entered in ${name} is below the minimum allowed value.`;
    }

    if (type === "rangeOverflow") {
      return isAmharic
        ? `በ${name} ውስጥ የገባው መጠን ከተፈቀደው ከፍተኛ መጠን በላይ ነው።`
        : `The value entered in ${name} is above the maximum allowed value.`;
    }

    if (type === "stepMismatch") {
      return isAmharic
        ? `እባክዎ ለ${name} ትክክለኛ ጭማሪ ያስገቡ።`
        : `Please enter a valid increment for ${name}.`;
    }

    if (type === "badInput") {
      return isAmharic
        ? `እባክዎ ለ${name} ትክክለኛ መረጃ ያስገቡ።`
        : `Please enter a valid value for ${name}.`;
    }

    // Cryptic regex translation in rawMessage
    if (ctx.rawMessage) {
      if (/(\^\[0-9]|\^\\d|\bnumbers only\b)/i.test(ctx.rawMessage)) {
        return isAmharic
          ? `እባክዎ ለ${name} ቁጥሮችን ብቻ ያስገቡ።`
          : `Please enter numbers only for ${name}.`;
      }
      if (/(\^\[a-zA-Z]|\bletters only\b)/i.test(ctx.rawMessage)) {
        return isAmharic
          ? `እባክዎ ለ${name} ፊደላትን ብቻ ያስገቡ።`
          : `Please enter letters only for ${name}.`;
      }
      return ctx.rawMessage;
    }

    // Generic error fallback
    return isAmharic
      ? "እባክዎ የዚህን መስክ ቅርጸት ያረጋግጡ።"
      : "Please check the format of this field.";
  }

  async simplifyInstructions(text: string, _context?: SimplificationContext): Promise<string> {
    if (!text || !text.trim()) return "";

    // Length boundary condition (>500 chars summarization)
    if (text.length > 500) {
      return "Summary: Read all guidelines carefully and complete each required field to submit.";
    }

    const simplified = text
      .replace(
        /Failure to adhere to terms shall result in immediate account termination\./gi,
        "You must follow the rules or your account will be closed."
      )
      .replace(/\bmandatory\b/gi, "required")
      .replace(/\butilize\b/gi, "use")
      .replace(/\bterminate\b/gi, "end")
      .replace(/\bcommence(ment)?\b/gi, "start")
      .replace(/\bprior to\b/gi, "before")
      .replace(/\bsubsequent to\b/gi, "after")
      .replace(/\bin the event that\b/gi, "if")
      .replace(/\bin order to\b/gi, "to")
      .replace(/\bfacilitate\b/gi, "help")
      .replace(/\bfurnish\b/gi, "provide")
      .replace(/\bremuneration\b/gi, "payment")
      .replace(/\bpursuant to\b/gi, "under")
      .replace(/\bnotwithstanding\b/gi, "even though")
      .replace(/\bshall be deemed\b/gi, "is considered")
      .replace(/\bexpedite\b/gi, "speed up")
      .replace(/\bsole discretion\b/gi, "decision");

    return simplified.trim();
  }
}
