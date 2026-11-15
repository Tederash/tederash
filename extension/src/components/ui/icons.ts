import * as Lucide from 'lucide-react';
import type * as React from 'react';

/**
 * lucide-react resolves React 19 types in this pnpm workspace while the extension
 * is on React 18; the components are identical at runtime. Re-export them with
 * React 18-compatible types.
 */
type Icon = React.FC<React.SVGProps<SVGSVGElement> & { strokeWidth?: number | string; size?: number | string }>;
const as = (c: unknown) => c as Icon;

export const ArrowUp = as(Lucide.ArrowUp);
export const Check = as(Lucide.Check);
export const ChevronRight = as(Lucide.ChevronRight);
export const Contrast = as(Lucide.Contrast);
export const Moon = as(Lucide.Moon);
export const RotateCcw = as(Lucide.RotateCcw);
export const Sparkles = as(Lucide.Sparkles);
export const Square = as(Lucide.Square);
export const Sun = as(Lucide.Sun);
