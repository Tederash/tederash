import { TargetSize } from "../profiles/types";
import { TypographyProfile } from "../localization/typography";

export interface ComponentAdaptations {
  /** Font scale multiplier (e.g. 1.0, 1.25, 1.5) */
  fontScale: number;
  /** Effective touch/click minimum height e.g. '40px', '48px', '56px' */
  minTargetHeight: string;
  /** Effective touch/click minimum padding */
  targetPadding: string;
  /** Sizing category */
  targetSize: TargetSize;
  /** High contrast mode flag */
  highContrast: boolean;
  /** Reduce animations and transitions */
  reduceMotion: boolean;
  /** Reduce non-essential visual elements and clutter */
  reduceVisualClutter: boolean;
  /** Underline all hyperlinks explicitly */
  underlineLinks: boolean;
  /** Style level for keyboard focus rings */
  focusIndicator: "standard" | "enhanced" | "high-visibility";
  /** Plain language instructions requested */
  simplifiedLanguage: boolean;
  /** Step-by-step guidance requested */
  guidedInteraction: boolean;
  /** Always display field instructions */
  showInstructions: boolean;
  /** Emphasize active input/card reading guide */
  readingFocusGuide: boolean;
  /** Require explicit modal/dialog confirmation before destructive actions */
  confirmationBeforeDestructiveActions: boolean;
  /** Speech output is enabled */
  speechOutputEnabled: boolean;
  /** Speech input / voice dictation is enabled */
  speechInputEnabled: boolean;
  /** Language tag for speech synthesis/recognition */
  language: string;
  /** UI locale tag, e.g. 'en', 'am' */
  locale: string;
  /** Typography tokens resolved for the active locale */
  typography: TypographyProfile;
  /** CSS variables to apply to root or component container */
  cssVariables: Record<string, string>;
  /** HTML data attributes to inject on root or container */
  dataAttributes: Record<string, string>;
}
