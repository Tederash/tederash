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
    const lang = (ctx.locale || "").toLowerCase();
    const isAmharic = lang.startsWith("am");
    const isOromo = lang.startsWith("om");

    // 1. Email address
    if (name.includes("email") || type === "email") {
      if (isAmharic) return "እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ (@ ምልክት እና ዶሜይን ያለው፣ ለምሳሌ name@example.com)።";
      if (isOromo) return "Maaloo teessoo iimeelii sirrii galchaa (mallattoo @ fi doomeenii kan qabu, fakkeenyaaf name@example.com).";
      return "Please enter a valid email address with an @ symbol and a domain (e.g. name@example.com).";
    }

    // 2. Password security
    if (name.includes("password") || type === "password" || name.includes("pass") || name.includes("secret")) {
      if (isAmharic) return "እባክዎ ቢያንስ 8 ፊደላት፣ ቁጥሮች እና ምልክቶች ያሉት ደህንነቱ የተጠበቀ የይለፍ ቃል ያስገቡ።";
      if (isOromo) return "Maaloo jecha icciitii amansiisaa yoo xiqqaate qubee 8, lakkoofsota fi mallattoolee qabu uumaa.";
      return "Create a secure password with at least 8 characters, including upper and lower case letters, numbers, and symbols.";
    }

    // 3. Telephone number
    if (name.includes("phone") || type === "tel" || name.includes("mobile") || name.includes("cell")) {
      if (isAmharic) return "እባክዎ ሙሉ ስልክ ቁጥርዎን ከአካባቢ መለያ ኮድ ጋር ያስገቡ (ለምሳሌ 555-123-4567)።";
      if (isOromo) return "Maaloo lakkoofsa bilbilaa keessan guutuu koodii naannoo wajjin galchaa (fakkeenyaaf 0911234567).";
      return "Enter your complete phone number including your area code (e.g. 555-123-4567).";
    }

    // 4. Full Name / Name fields
    if (name.includes("fullname") || name === "name" || name.includes("firstname") || name.includes("lastname")) {
      if (isAmharic) return "እባክዎ ሙሉ ስምዎን በይፋዊ መታወቂያ ሰነድ ላይ እንዳለው ያስገቡ።";
      if (isOromo) return "Maaloo maqaa keessan guutuu akkuma waraqaa eenyummaa seeraa irratti mul'atutti galchaa.";
      return "Enter your legal full name as shown on official identity documents.";
    }

    // 5. Street Address
    if (name.includes("address") || name.includes("street") || name.includes("line1") || name.includes("line2")) {
      if (isAmharic) return "እባክዎ የቤት ወይም የጎዳና አድራሻዎን፣ የህንፃ ወይም አፓርታማ ቁጥርን ጨምሮ ያስገቡ።";
      if (isOromo) return "Maaloo teessoo mana ykn daandii keessan, lakkoofsa gamoo ykn kutaa dabalatee galchaa.";
      return "Enter your physical street address, including apartment, suite, or building number if applicable.";
    }

    // 6. Postal Code / ZIP
    if (name.includes("postal") || name.includes("zip") || name.includes("postcode")) {
      if (isAmharic) return "እባክዎ ባለ 5 አሃዝ ዚፕ ኮድ ወይም የፖስታ መለያ ቁጥርዎን ያስገቡ።";
      if (isOromo) return "Maaloo koodii poostaa ykn ZIP naannoo keessanii galchaa.";
      return "Enter your local postal or ZIP code.";
    }

    // 7. Date of Birth / Calendar Date
    if (name.includes("date") || name.includes("birth") || name.includes("dob") || type === "date") {
      if (isAmharic) return "እባክዎ ቀኑን በ ዓዓዓዓ-ወወ-ቀቀ ወይም ወወ/ቀቀ/ዓዓዓዓ ቅርጸት ያስገቡ።";
      if (isOromo) return "Maaloo guyyaa bifa GG-WW-AAAA ykn WW/GG/AAAA tiin filadhaa ykn galchaa.";
      return "Select or enter a date using the format YYYY-MM-DD or MM/DD/YYYY.";
    }

    // 8. Payment Card
    if (name.includes("card") || name.includes("credit") || name.includes("pan") || name.includes("cvv") || name.includes("cvc")) {
      if (isAmharic) return "እባክዎ በክፍያ ካርድዎ ፊት ለፊት የተጻፈውን ባለ 16 አሃዝ የካርድ ቁጥር ያስገቡ።";
      if (isOromo) return "Maaloo lakkoofsa kaardii lakkoofsa 16 fuula kaardii kaffaltii keessan irratti barreeffame galchaa.";
      return "Enter the 16-digit card number printed on the front of your payment card without spaces or hyphens.";
    }

    // 9. Search query
    if (name.includes("search") || type === "search") {
      if (isAmharic) return "እባክዎ ለመፈለግ ቃላትን ያስገቡ።";
      if (isOromo) return "Maaloo qabiyyee jiru barbaaduuf jechoota barreessaa.";
      return "Type keywords to search available content.";
    }

    // Generic fallback
    if (isAmharic) {
      return `እባክዎ ይህንን እርምጃ ለማጠናቀቅ ${label || "መረጃዎን"} በትክክል ያስገቡ።`;
    }
    if (isOromo) {
      return `Maaloo tarkaanfii kana xumuruuf ${label || "odeeffannoo keessan"} sirriitti galchaa.`;
    }
    const identifier = label || "information";
    return `Please enter your ${identifier} accurately to complete this step.`;
  }

  async explainError(context: ErrorContext): Promise<string> {
    const ctx = context || ({} as ErrorContext);
    const fieldIdentifier = ctx.label || ctx.fieldName || "";
    const name = fieldIdentifier || "This field";
    const type = ctx.errorType || "";
    const lang = (ctx.locale || "").toLowerCase();
    const isAmharic = lang.startsWith("am");
    const isOromo = lang.startsWith("om");

    // Standard HTML5 ValidityState error translations
    if (type === "valueMissing") {
      if (isAmharic) return `${name} አስፈላጊ ነው። እባክዎ መረጃ ያስገቡ።`;
      if (isOromo) return `${name} barbaachisaadha. Maaloo odeeffannoo galchaa.`;
      return `${name} is required to continue. Please provide a value.`;
    }

    if (type === "patternMismatch") {
      const lowerName = (ctx.fieldName || "").toLowerCase();
      if (lowerName.includes("phone") || lowerName.includes("tel")) {
        if (isAmharic) return "ስልክ ቁጥርዎ ያልተሟላ ይመስላል። እባክዎ የአካባቢ ኮዱን ጨምሮ ያስገቡ።";
        if (isOromo) return "Lakkoofsi bilbilaa keessanii hin guutamne. Maaloo koodii naannoo dabalatee galchaa.";
        return "Your phone number appears incomplete. Please include the full number, including the area code.";
      }
      if (isAmharic) return `${name} ትክክለኛውን ቅርጸት አያሟላም። እባክዎ እንደገና ይሞክሩ።`;
      if (isOromo) return `${name} bifa barbaadamu hin guunne. Maaloo irra deebi'aa yaalaa.`;
      return `${name} does not match the required format. Please verify the rules above and try again.`;
    }

    if (type === "typeMismatch") {
      if (isAmharic) return `በ${name} ውስጥ የገባው መረጃ ልክ አይደለም። እባክዎ ትክክለኛውን ቅርጸት ያረጋግጡ።`;
      if (isOromo) return `Gatiin ${name} keessatti galfame sirrii miti. Maaloo bifa isaa mirkaneessaa.`;
      return `The value entered in ${name} is invalid. Please check the expected format.`;
    }

    if (type === "tooShort") {
      const minLength = ctx.constraintDetails?.minLength;
      if (minLength) {
        if (isAmharic) return `${name} በጣም አጭር ነው። ቢያንስ ${minLength} ፊደላትን መያዝ አለበት።`;
        if (isOromo) return `${name} gabaabaadha. Yoo xiqqaate qubee ${minLength} qabaachuu qaba.`;
        return `${name} is too short. Please provide additional characters. It must contain at least ${minLength} characters.`;
      }
      if (isAmharic) return `${name} በጣም አጭር ነው። እባክዎ ተጨማሪ ፊደላትን ያስገቡ።`;
      if (isOromo) return `${name} gabaabaadha. Maaloo qubee dabalataa galchaa.`;
      return `${name} is too short. Please provide additional characters.`;
    }

    if (type === "tooLong") {
      if (isAmharic) return `${name} ከተፈቀደው በላይ ረጅም ነው። እባክዎ ያሳጥሩት።`;
      if (isOromo) return `${name} dheerina heyyamamee ol ta'eera. Maaloo gabaabsaa.`;
      return `${name} exceeds the maximum length allowed. Please shorten your input.`;
    }

    if (type === "rangeUnderflow") {
      if (isAmharic) return `በ${name} ውስጥ የገባው መጠን ከተፈቀደው ዝቅተኛ መጠን በታች ነው።`;
      if (isOromo) return `Gatiin ${name} keessatti galfame gatii xiqqaa heyyamamee gadi.`;
      return `The value entered in ${name} is below the minimum allowed value.`;
    }

    if (type === "rangeOverflow") {
      if (isAmharic) return `በ${name} ውስጥ የገባው መጠን ከተፈቀደው ከፍተኛ መጠን በላይ ነው።`;
      if (isOromo) return `Gatiin ${name} keessatti galfame gatii guddaa heyyamamee oli.`;
      return `The value entered in ${name} is above the maximum allowed value.`;
    }

    if (type === "stepMismatch") {
      if (isAmharic) return `እባክዎ ለ${name} ትክክለኛ ጭማሪ ያስገቡ።`;
      if (isOromo) return `Maaloo ${name} tiif daballii sirrii galchaa.`;
      return `Please enter a valid increment for ${name}.`;
    }

    if (type === "badInput") {
      if (isAmharic) return `እባክዎ ለ${name} ትክክለኛ መረጃ ያስገቡ።`;
      if (isOromo) return `Maaloo ${name} tiif gatii sirrii galchaa.`;
      return `Please enter a valid value for ${name}.`;
    }

    // Cryptic regex translation in rawMessage
    if (ctx.rawMessage) {
      if (/(\^\[0-9]|\^\\d|\bnumbers only\b)/i.test(ctx.rawMessage)) {
        if (isAmharic) return `እባክዎ ለ${name} ቁጥሮችን ብቻ ያስገቡ።`;
        if (isOromo) return `Maaloo ${name} tiif lakkoofsa qofa galchaa.`;
        return `Please enter numbers only for ${name}.`;
      }
      if (/(\^\[a-zA-Z]|\bletters only\b)/i.test(ctx.rawMessage)) {
        if (isAmharic) return `እባክዎ ለ${name} ፊደላትን ብቻ ያስገቡ።`;
        if (isOromo) return `Maaloo ${name} tiif qubee qofa galchaa.`;
        return `Please enter letters only for ${name}.`;
      }
      return ctx.rawMessage;
    }

    // Generic error fallback
    if (isAmharic) return "እባክዎ የዚህን መስክ ቅርጸት ያረጋግጡ።";
    if (isOromo) return "Maaloo bifa dirree kanaa mirkaneessaa.";
    return "Please check the format of this field.";
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
