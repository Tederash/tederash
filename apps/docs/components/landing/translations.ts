import type { Locale } from "@tederash/core";

export interface LandingTranslations {
  navbar: {
    docs: string;
    demo: string;
    language: string;
  };
  hero: {
    headline: string;
    description: string;
    tryDemo: string;
    readDocs: string;
    aiAgentsTitle: string;
    downloadSkill: string;
    downloadPrompt: string;
    copyCommandLabel: string;
  };
  liveDemo: {
    heading: string;
    description: string;
    profileTitle: string;
    languageTitle: string;
    stats: {
      textSize: string;
      targetHeight: string;
      contrast: string;
      language: string;
      high: string;
      normal: string;
    };
    presetNames: Record<string, string>;
    form: {
      ariaLabel: string;
      nameLabel: string;
      nameDescription: string;
      nameSimplified: string;
      roleLabel: string;
      rolePlaceholder: string;
      roleSimplified: string;
      roleEngineer: string;
      roleDesigner: string;
      roleTeacher: string;
      updatesLabel: string;
      submitButton: string;
      submittedStatus: string;
      announcedSuccess: string;
      announcedProfile: string;
    };
  };
  gettingStarted: {
    heading: string;
    steps: Array<{
      title: string;
      text: string;
    }>;
    notePrefix: string;
    noteLink: string;
    noteSuffix: string;
  };
  packages: {
    heading: string;
    facts: string[];
    descriptions: Record<string, string>;
    openSource: string;
    sourceOnGithub: string;
    docsLink: string;
    demoLink: string;
  };
  footer: {
    brandDescription: string;
    columns: {
      framework: string;
      docs: string;
      community: string;
      standards: string;
    };
    links: {
      overview: string;
      quickStart: string;
      interactiveDemo: string;
      components: string;
      contribute: string;
      reportIssue: string;
      discussions: string;
      wcagGuidelines: string;
      ethiopicTypography: string;
      waiStandards: string;
      a11yStatement: string;
    };
    builtWith: string;
    license: string;
    designedForEveryone: string;
  };
}

export const LANDING_TRANSLATIONS: Record<Locale, LandingTranslations> = {
  en: {
    navbar: {
      docs: "Documentation",
      demo: "Demo",
      language: "Language",
    },
    hero: {
      headline: "Let people choose how your app should look and behave.",
      description:
        "Tederash is a React library for accessibility. A user picks a profile, such as larger text, bigger buttons or plain-language help, and every component follows it. You write normal React.",
      tryDemo: "Try the demo",
      readDocs: "Read the docs",
      aiAgentsTitle: "AI Coding Agents:",
      downloadSkill: "Download Skill (SKILL.md)",
      downloadPrompt: "Download Prompt (.md)",
      copyCommandLabel: "Copy install command",
    },
    liveDemo: {
      heading: "Try it",
      description:
        "Pick a profile. The form below, and the rest of this site, change with it. Nothing reloads.",
      profileTitle: "Profile",
      languageTitle: "Language",
      stats: {
        textSize: "Text size",
        targetHeight: "Target height",
        contrast: "Contrast",
        language: "Language",
        high: "High",
        normal: "Normal",
      },
      presetNames: {
        standard: "Standard",
        "low-vision": "Low Vision & Contrast",
        "motor-assist": "Motor & Target Sizing",
        "cognitive-assist": "Cognitive Guidance",
        amharic: "አማርኛ (Amharic)",
        oromo: "Afaan Oromoo (Oromo)",
      },
      form: {
        ariaLabel: "Sample form",
        nameLabel: "Full name",
        nameDescription: "As it appears on your ID.",
        nameSimplified: "Type your first and last name.",
        roleLabel: "Role",
        rolePlaceholder: "Choose one",
        roleSimplified: "Pick the one that fits you best.",
        roleEngineer: "Software engineer",
        roleDesigner: "Designer",
        roleTeacher: "Teacher",
        updatesLabel: "Send me updates",
        submitButton: "Submit",
        submittedStatus: "Submitted. This is only a demo.",
        announcedSuccess: "Form submitted.",
        announcedProfile: "{name} profile activated.",
      },
    },
    gettingStarted: {
      heading: "Three steps",
      steps: [
        {
          title: "Wrap your app once",
          text: "The provider holds the active profile and saves it in the browser.",
        },
        {
          title: "Use the components",
          text: "They take the usual props. Size, contrast and help text come from the profile.",
        },
        {
          title: "Let the user pick a profile",
          text: "Switch at any time. Every component updates without a reload.",
        },
      ],
      notePrefix:
        "Full setup, including custom profiles and per-component overrides, is in the ",
      noteLink: "quick start",
      noteSuffix: ".",
    },
    packages: {
      heading: "What you get",
      facts: [
        "Works offline. Preferences stay in the browser.",
        "English, Amharic, and Afaan Oromoo out of the box, with Ge'ez-aware typography.",
        "Speech input and read-aloud where the browser supports it.",
        "Confirmation before destructive actions when the profile asks for it.",
      ],
      descriptions: {
        "@tederash/core":
          "The profile model, the runtime that holds and saves it, and the rules that turn a profile into CSS variables. No React.",
        "@tederash/react":
          "The provider and hooks. Also the bridge that lets the Tederash browser extension talk to your page.",
        "@tederash/components":
          "Button, input, textarea, select, checkbox, form, dialog and navigation. Built on Radix and shadcn/ui.",
        "@tederash/assistance":
          "Plain-language explanations for fields and errors. Works offline, and an AI provider can be plugged in.",
      },
      openSource: "Open source.",
      sourceOnGithub: "Source on GitHub",
      docsLink: "Documentation",
      demoLink: "Interactive demo",
    },
    footer: {
      brandDescription:
        "An open-source, runtime-adaptive accessibility framework and component SDK for React and TypeScript. Web applications dynamically adapt their touch targets, typography, contrast, assistive announcements, and cognitive instructions to individual human preferences.",
      columns: {
        framework: "Framework SDK",
        docs: "Documentation",
        community: "Community & Source",
        standards: "Accessibility & Standards",
      },
      links: {
        overview: "Overview",
        quickStart: "Quick Start",
        interactiveDemo: "Interactive Demo",
        components: "Components",
        contribute: "Contribute",
        reportIssue: "Report an Issue",
        discussions: "Discussions",
        wcagGuidelines: "WCAG 2.2 Guidelines",
        ethiopicTypography: "Ge'ez Typography Support",
        waiStandards: "W3C WAI Standards",
        a11yStatement: "A11y Statement",
      },
      builtWith: "Built with accessible web standards and adaptive interaction.",
      license: "Released under the MIT License.",
      designedForEveryone: "Designed for everyone.",
    },
  },

  am: {
    navbar: {
      docs: "ሰነዶች",
      demo: "ናሙና",
      language: "ቋንቋ",
    },
    hero: {
      headline: "ሰዎች መተግበሪያዎ እንዴት መታየት እና መስራት እንዳለበት እንዲመርጡ ያድርጉ።",
      description:
        "ተደራሽ ለተደራሽነት የተሰራ የReact ቤተ-መጽሐፍት ነው። ተጠቃሚው እንደ ትልቅ ጽሁፍ፣ ሰፋ ያሉ አዝራሮች ወይም ግልጽ መመሪያዎች ያሉበትን መገለጫ (profile) ይመርጣል፤ እያንዳንዱ አካልም ይከተለዋል። እርስዎ መደበኛ የReact ኮድ ብቻ ይጽፋሉ።",
      tryDemo: "ናሙናውን ይሞክሩ",
      readDocs: "ሰነዶቹን ያንብቡ",
      aiAgentsTitle: "የAI ኮድ አጋዥ ኤጀንቶች፦",
      downloadSkill: "ክህሎት አውርድ (SKILL.md)",
      downloadPrompt: "ጥያቄ አውርድ (.md)",
      copyCommandLabel: "የመጫኛ ትዕዛዙን ቅዳ",
    },
    liveDemo: {
      heading: "ይሞክሩት",
      description:
        "መገለጫ ይምረጡ። ከታች ያለው ቅጽ እና መላው ድረ-ገጽ ወዲያውኑ አብረው ይቀየራሉ። ገጹ ዳግም አይጫንም።",
      profileTitle: "መገለጫ",
      languageTitle: "ቋንቋ",
      stats: {
        textSize: "የጽሁፍ መጠን",
        targetHeight: "የዒላማ ቁመት",
        contrast: "ንፅፅር",
        language: "ቋንቋ",
        high: "ከፍተኛ",
        normal: "መደበኛ",
      },
      presetNames: {
        standard: "መደበኛ",
        "low-vision": "ዝቅተኛ እይታ እና ንፅፅር",
        "motor-assist": "የእንቅስቃሴ እና የአዝራር መጠን",
        "cognitive-assist": "የማስተዋል እና የንባብ ድጋፍ",
        amharic: "አማርኛ (Amharic)",
        oromo: "አፋን ኦሮሞ (Oromo)",
      },
      form: {
        ariaLabel: "የናሙና ቅጽ",
        nameLabel: "ሙሉ ስም",
        nameDescription: "በመታወቂያዎ ላይ እንደሚታየው።",
        nameSimplified: "ስምዎን እዚህ ይጻፉ።",
        roleLabel: "ሙያ",
        rolePlaceholder: "ይምረጡ",
        roleSimplified: "ከዝርዝሩ አንዱን ይምረጡ።",
        roleEngineer: "ሶፍትዌር መሃንዲስ",
        roleDesigner: "ዲዛይነር",
        roleTeacher: "መምህር",
        updatesLabel: "ዝማኔዎችን ላኩልኝ",
        submitButton: "ላክ",
        submittedStatus: "ተልኳል። ይህ ናሙና ብቻ ነው።",
        announcedSuccess: "ቅጹ ተልኳል።",
        announcedProfile: "የ{name} መገለጫ ነቅቷል።",
      },
    },
    gettingStarted: {
      heading: "ሦስት ደረጃዎች",
      steps: [
        {
          title: "መተግበሪያዎን አንድ ጊዜ ያጠቃልሉ",
          text: "አቅራቢው (Provider) ንቁውን መገለጫ ይይዛል እንዲሁም በብሮውዘሩ ውስጥ ያስቀምጠዋል።",
        },
        {
          title: "አካላቱን (Components) ይጠቀሙ",
          text: "የተለመዱትን የReact props ይቀበላሉ። መጠናቸው፣ ንፅፅራቸውና አጋዥ ጽሑፎቻቸው ከመገለጫው ይመጣሉ።",
        },
        {
          title: "ተጠቃሚው መገለጫ እንዲመርጥ ይፍቀዱ",
          text: "በማንኛውም ጊዜ ይቀይሩ። እያንዳንዱ አካል ገጹ ዳግም ሳይጫን ወዲያውኑ ይዘመናል።",
        },
      ],
      notePrefix:
        "ብጁ መገለጫዎችን እና የአካል ደረጃ ማስተካከያዎችን ጨምሮ ሙሉው ቅንብር በ",
      noteLink: "ፈጣን ማስጀመሪያ",
      noteSuffix: " ውስጥ ይገኛል።",
    },
    packages: {
      heading: "የሚያገኙት ጥቅሞች",
      facts: [
        "ከኢንተርኔት ውጭ ይሰራል (Offline)። ምርጫዎች በብሮውዘር ውስጥ ይቀመጣሉ።",
        "እንግሊዝኛ፣ አማርኛ እና አፋን ኦሮሞ በቀጥታ ከግዕዝ ፊደላት የፊደል አጣጣል ጋር ይደገፋሉ።",
        "ብሮውዘሩ በሚደግፍበት ቦታ በድምፅ መጻፍ እና ድምፅ ማንበብ ይቻላል።",
        "መገለጫው በሚጠይቅበት ጊዜ አደገኛ እርምጃዎችን ከማከናወን በፊት ማረጋገጫ ይጠይቃል።",
      ],
      descriptions: {
        "@tederash/core":
          "የመገለጫ ሞዴል፣ መገለጫውን የሚይዘው እና የሚያስቀምጠው ራንታይም፣ እና መገለጫውን ወደ CSS ተለዋዋጮች የሚቀይሩ ህጎች። ያለ React የሚሰራ።",
        "@tederash/react":
          "የReact አቅራቢ (Provider) እና ሁኮች (Hooks)። እንዲሁም የተደራሽ ብሮውዘር ኤክስቴንሽን ከገጽዎ ጋር እንዲገናኝ የሚያስችለው ድልድይ።",
        "@tederash/components":
          "አዝራር፣ ማስገቢያ፣ ረጅም ጽሑፍ፣ መምረጫ፣ ሳጥን፣ ቅጽ፣ ንግግር እና አሰሳ። በRadix እና shadcn/ui ላይ የተገነቡ።",
        "@tederash/assistance":
          "ለሜዳዎች እና ስህተቶች ግልጽ ማብራሪያዎች። ከኢንተርኔት ውጭ ይሰራል፣ እንዲሁም የAI አቅራቢን ማገናኘት ይቻላል።",
      },
      openSource: "ክፍት ምንጭ።",
      sourceOnGithub: "የኮድ ምንጭ በGitHub",
      docsLink: "ሰነዶች",
      demoLink: "ተግባራዊ ናሙና",
    },
    footer: {
      brandDescription:
        "ክፍት ምንጭ፣ በራንታይም የሚላመድ የተደራሽነት ማዕቀፍ እና የክፍሎች SDK ለReact እና TypeScript። የድር መተግበሪያዎች የአዝራር መጠኖችን፣ የፊደል አጣጣልን፣ ንፅፅርን፣ የድምፅ ማስታወቂያዎችን እና የማስተዋል መመሪያዎችን ለግል የሰው ምርጫዎች ወዲያውኑ ያስማማሉ።",
      columns: {
        framework: "የማዕቀፍ SDK",
        docs: "ሰነዶች",
        community: "ማህበረሰብ እና ምንጭ",
        standards: "ተደራሽነት እና ደረጃዎች",
      },
      links: {
        overview: "አጠቃላይ እይታ",
        quickStart: "ፈጣን ማስጀመሪያ",
        interactiveDemo: "ተግባራዊ ናሙና",
        components: "ክፍሎች (Components)",
        contribute: "ያበርክቱ",
        reportIssue: "ችግር ሪፖርት ያድርጉ",
        discussions: "ውይይቶች",
        wcagGuidelines: "የWCAG 2.2 መመሪያዎች",
        ethiopicTypography: "የግዕዝ የፊደል አጣጣል ድጋፍ",
        waiStandards: "የW3C WAI ደረጃዎች",
        a11yStatement: "የተደራሽነት መግለጫ",
      },
      builtWith: "በተደራሽ የድር ደረጃዎች እና በተላማጅ መስተጋብር የተገነባ።",
      license: "በMIT ፈቃድ የተለቀቀ።",
      designedForEveryone: "ለሁሉም ሰው የተዘጋጀ።",
    },
  },

  om: {
    navbar: {
      docs: "Dookumantii",
      demo: "Yaalii",
      language: "Afaan",
    },
    hero: {
      headline: "Namoonni akkaataa itti appiin keessan mul'atuu fi hojjatu akka filatan taasisaa.",
      description:
        "Tederashii laayibrarii React qaqqabamummaaf ijaarameedha. Fayyadamaan tokko piroofaayilii akka barreeffama guddaa, qabduulee bal'aa ykn gargaarsa qulqulluu filata; kutaaleen hundi isa hordofu. Isin koodii React baramaa qofa barreessitu.",
      tryDemo: "Yaalii yaalaa",
      readDocs: "Dookumantii dubbisaa",
      aiAgentsTitle: "Eejantoota Koodii AI:",
      downloadSkill: "Dandeettii Buufadhaa (SKILL.md)",
      downloadPrompt: "Ajaja Buufadhaa (.md)",
      copyCommandLabel: "Ajaja fe'iinsaa garagalchaa",
    },
    liveDemo: {
      heading: "Mee yaalaa",
      description:
        "Piroofaayilii filadhaa. Foormiin armaan gadii fi guutummaan marsariitii kanaa battalatti waliin jijjiiramu. Fuulli lamuu hin fe'amu.",
      profileTitle: "Piroofaayilii",
      languageTitle: "Afaan",
      stats: {
        textSize: "Hamma barreeffamaa",
        targetHeight: "Hojjaa qabduu",
        contrast: "Qulqullina (Contrast)",
        language: "Afaan",
        high: "Olaanaa",
        normal: "Idilee",
      },
      presetNames: {
        standard: "Idilee",
        "low-vision": "Agartuu Xiqqaa fi Qulqullina",
        "motor-assist": "Sochii fi Hamma Qabduu",
        "cognitive-assist": "Gorsa Sammuu fi Dubbisaa",
        amharic: "Afaan Amaaraa (Amharic)",
        oromo: "Afaan Oromoo (Oromo)",
      },
      form: {
        ariaLabel: "Foormii fakkeenyaa",
        nameLabel: "Maqaa guutuu",
        nameDescription: "Akkuma waraqaa eenyummaa keessan irratti mul'atutti.",
        nameSimplified: "Maqaa keessan asitti barreessaa.",
        roleLabel: "Gahee hojii",
        rolePlaceholder: "Filadhaa",
        roleSimplified: "Tarree keessaa isa isin fakkaatu filadhaa.",
        roleEngineer: "Injinara Saamudaa",
        roleDesigner: "Dizaayinara",
        roleTeacher: "Barsiisaa",
        updatesLabel: "Oodeeffannoowwan haaraa naaf ergaa",
        submitButton: "Ergi",
        submittedStatus: "Ergameera. Kun yaalii qofa.",
        announcedSuccess: "Foormichi ergameera.",
        announcedProfile: "Piroofaayiliin {name} hojjachaa jira.",
      },
    },
    gettingStarted: {
      heading: "Tarkaanfiiwwan sadii",
      steps: [
        {
          title: "Appii keessan altokko qindeessaa",
          text: "Dhiyeessaan (Provider) piroofaayilii hojjatu qabatee baafata keessatti olkaawa.",
        },
        {
          title: "Kutaalee (Components) fayyadamaa",
          text: "Props baramaa fudhatu. Hammi, qulqullinnii fi barreeffamni gargaarsaa piroofaayilii irraa dhufu.",
        },
        {
          title: "Fayyadamaan piroofaayilii akka filatu hayyamaa",
          text: "Yeroo kamiyyuu jijjiiraa. Kutaaleen hundi fuulli lamuu osoo hin fe'amin haaromu.",
        },
      ],
      notePrefix:
        "Qindaa'inni guutuun, piroofaayiliiwwan dhuunfaa dabalatee, ",
      noteLink: "jalqaba saffisaa",
      noteSuffix: " keessa jira.",
    },
    packages: {
      heading: "Wanta argattan",
      facts: [
        "Toora interneetiin ala hojjata. Filannoowwan baafata keessatti olkaawamu.",
        "Afaan Ingilizii, Amaaraa fi Afaan Oromoo kallattiin qubee Ge'ez fi Qubee waliin ni deggeramu.",
        "Iddoo baafanni deggarutti sagaleen barreessuu fi sagaleen dubbisuu.",
        "Piroofaayiliin yoo gaafate gocha balleessaa dura mirkaneessa gaafata.",
      ],
      descriptions: {
        "@tederash/core":
          "Moodeela piroofaayilii, raantaayimii isa qabatee olkaawu, fi seera gara CSS jijjiiru. React malee.",
        "@tederash/react":
          "Dhiyeessaa fi huukiiwwan. Akkasumas riqicha ekisteenshiniin Tederash fuula keessan waliin akka haasa'u taasisu.",
        "@tederash/components":
          "Qabduu, galtee, filannoo, saanduqa, foormii, haasaa fi deemsa. Radix fi shadcn/ui irratti kan ijaarame.",
        "@tederash/assistance":
          "Ibsa qulqulluu dirreewwanii fi dogoggoraa. Interneetiin ala hojjata, AI dabalataan itti galchuun ni danda'ama.",
      },
      openSource: "Madda banaa.",
      sourceOnGithub: "Madda GitHub irratti",
      docsLink: "Dookumantii",
      demoLink: "Yaalii qabatamaa",
    },
    footer: {
      brandDescription:
        "Gireemworkii qaqqabamummaa yeroo hojii jijjiiramuu fi SDK kutaalee React fi TypeScript isa madda banaa ta'e. Appilikeeshiniin weebii hamma qabduulee, barreeffama, qulqullina, fi gorsa sammuu fedhii dhuunfaa namootaatiin yeroodhaa gara yerootti walmadaalsisa.",
      columns: {
        framework: "Gireemwoorkii SDK",
        docs: "Dookumantii",
        community: "Hawaasaa fi Madda",
        standards: "Qaqqabamummaa fi Sadarkaalee",
      },
      links: {
        overview: "Waliigala",
        quickStart: "Jalqaba Saffisaa",
        interactiveDemo: "Yaalii Qabatamaa",
        components: "Kutaalee",
        contribute: "Hirmaadhaa",
        reportIssue: "Rakkoo Gabaasaa",
        discussions: "Marii",
        wcagGuidelines: "Qajeelfama WCAG 2.2",
        ethiopicTypography: "Deeggarsa Qubee Ge'ez",
        waiStandards: "Sadarkaalee W3C WAI",
        a11yStatement: "Ibsa Qaqqabamummaa",
      },
      builtWith: "Sadarkaalee weebii qaqqabamaa fi walitti dhufeenya jijjiiramuun kan ijaarame.",
      license: "Hayyama MIT jalatti kan gadhiifame.",
      designedForEveryone: "Namoota hundaaf kan qophaa'e.",
    },
  },
};

import * as React from "react";
import { useTederash } from "@tederash/react";

export function useLandingTranslation(): {
  locale: Locale;
  t: LandingTranslations;
  setLocale: (locale: Locale) => void;
} {
  const { profile, updatePreferences } = useTederash();
  const locale: Locale =
    profile.locale === "am" || profile.locale === "om" ? profile.locale : "en";

  const t = LANDING_TRANSLATIONS[locale] ?? LANDING_TRANSLATIONS.en;

  const setLocale = React.useCallback(
    (nextLocale: Locale) => {
      const speech =
        nextLocale === "am" ? "am-ET" : nextLocale === "om" ? "om-ET" : "en-US";
      updatePreferences({
        locale: nextLocale,
        speech: { language: speech },
      });
    },
    [updatePreferences]
  );

  return { locale, t, setLocale };
}
