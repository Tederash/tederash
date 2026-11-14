import * as React from "react";
import { useAccessibility } from "@tederash/react";
import { useLocalization } from "../localization/useLocalization";
import { cn } from "../ui/utils";
import { Menu, X } from "lucide-react";

export interface TederashNavigationLink {
  /** Target URL or route */
  href: string;
  /** Visible label */
  label: string;
  /** Optional icon node */
  icon?: React.ReactNode;
  /** Optional badge or counter */
  badge?: string | number;
  /** Whether the link points to an external resource */
  external?: boolean;
  /** Custom click handler */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export type AccessibleNavigationLink = TederashNavigationLink;

export interface TederashNavigationProps
  extends React.HTMLAttributes<HTMLElement> {
  /** Array of navigation links */
  links: TederashNavigationLink[];
  /** Currently active route (matched against link.href) */
  activeRoute?: string;
  /** Brand name string or custom brand logo node (default: "Tederash") */
  brandName?: string | React.ReactNode;
  /** Brand link destination (default: "/") */
  brandHref?: string;
  /** Accessible name for the navigation landmark (default: "Main Navigation") */
  ariaLabel?: string;
  /** ID selector or anchor target for Skip to Content (default: "#main-content") */
  skipToContentTarget?: string;
  /** Label for skip link (default: "Skip to main content") */
  skipToContentLabel?: string;
  /** Whether to render the skip to link (default: true) */
  showSkipLink?: boolean;
  /** Custom actions or controls slot (e.g. theme toggle, accessibility settings) */
  actions?: React.ReactNode;
  /** Custom class for header container */
  className?: string;
  /** Custom class for inner nav element */
  navClassName?: string;
  /** Custom matcher for active route (defaults to href === activeRoute) */
  isActiveRoute?: (href: string, activeRoute?: string) => boolean;
}

export type AccessibleNavigationProps = TederashNavigationProps;

export const TederashNavigation = React.forwardRef<
  HTMLElement,
  TederashNavigationProps
>(function TederashNavigation({
  links,
  activeRoute = "/",
  brandName = "Tederash",
  brandHref = "/",
  ariaLabel = "Main Navigation",
  skipToContentTarget = "#main-content",
  skipToContentLabel,
  showSkipLink = true,
  actions,
  className = "",
  navClassName = "",
  isActiveRoute = (href, currentRoute) => href === currentRoute,
  ...props
}, ref) {
  const { adaptations } = useAccessibility();
  const { t } = useLocalization();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const mobileMenuId = React.useId();

  // Escape key closes mobile menu
  React.useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  // Adaptive tokens
  const focusClasses =
    adaptations.focusIndicator === "high-visibility"
      ? "focus-visible:ring-4 focus-visible:ring-amber-500 focus-visible:outline-none"
      : adaptations.focusIndicator === "enhanced"
      ? "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      : "focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none";

  const isExtraLarge =
    adaptations.targetSize === "extra-large" ||
    adaptations.minTargetHeight === "56px";
  const isLarge =
    adaptations.targetSize === "large" ||
    adaptations.minTargetHeight === "48px";

  const targetSizeClasses = isExtraLarge
    ? "min-h-[56px] px-4 py-2.5 text-base"
    : isLarge
    ? "min-h-[48px] px-3.5 py-2 text-sm"
    : "min-h-[40px] px-3 py-1.5 text-sm";

  const contrastHeader = adaptations.highContrast
    ? "border-b-2 border-foreground dark:border-white bg-background text-foreground"
    : "border-b border-border bg-background/95 backdrop-blur-sm";

  return (
    <header
      ref={ref}
      data-slot="accessible-navigation-header"
      className={cn(contrastHeader, className)}
      {...props}
    >
      {/* WCAG 2.4.1 Skip to Content Landmark */}
      {showSkipLink && (
        <a
          href={skipToContentTarget}
          data-slot="skip-to-content"
          className={cn(
            "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2",
            "focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:font-bold",
            focusClasses,
            adaptations.focusIndicator === "high-visibility" && "focus:ring-4 focus:ring-amber-500"
          )}
        >
          {skipToContentLabel ?? t("labels.skipToContent")}
        </a>
      )}

      <nav
        role="navigation"
        aria-label={ariaLabel}
        data-slot="accessible-navigation"
        data-target-size={adaptations.targetSize}
        data-high-contrast={String(adaptations.highContrast)}
        className={cn(
          "max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4",
          navClassName
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2">
          {typeof brandName === "string" ? (
            <a
              href={brandHref}
              className={cn(
                "font-bold text-lg rounded px-1 transition-colors hover:text-primary",
                focusClasses,
                adaptations.underlineLinks && "underline underline-offset-4"
              )}
            >
              {brandName}
            </a>
          ) : (
            brandName
          )}
        </div>

        {/* Desktop Navigation Links */}
        <ul className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const isActive = isActiveRoute(link.href, activeRoute);
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  onClick={link.onClick}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors select-none",
                    targetSizeClasses,
                    focusClasses,
                    isActive
                      ? "font-bold text-primary underline underline-offset-4 bg-accent/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                    adaptations.underlineLinks && "underline underline-offset-4 decoration-2",
                    adaptations.highContrast && isActive && "border-2 border-current font-bold"
                  )}
                >
                  {link.icon && <span aria-hidden="true">{link.icon}</span>}
                  <span>{link.label}</span>
                  {link.badge !== undefined && (
                    <span className="text-xs rounded-full px-1.5 py-0.5 bg-muted text-muted-foreground font-semibold">
                      {link.badge}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Actions slot & Mobile menu toggle */}
        <div className="flex items-center gap-2">
          {actions && <div className="flex items-center gap-2">{actions}</div>}

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            aria-label={
              isMobileMenuOpen
                ? t("labels.closeMenu")
                : t("labels.openMenu")
            }
            aria-expanded={isMobileMenuOpen}
            aria-controls={mobileMenuId}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className={cn(
              "md:hidden inline-flex items-center justify-center rounded-md border border-input p-2 hover:bg-accent hover:text-accent-foreground",
              focusClasses,
              targetSizeClasses
            )}
          >
            <span className="sr-only">
              {isMobileMenuOpen ? t("labels.closeMenu") : t("labels.openMenu")}
            </span>
            {isMobileMenuOpen ? (
              <X className="size-5 shrink-0" aria-hidden="true" />
            ) : (
              <Menu className="size-5 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div
          id={mobileMenuId}
          data-slot="accessible-navigation-mobile-menu"
          className={cn(
            "md:hidden px-4 pt-2 pb-4 border-t space-y-1 bg-background",
            adaptations.highContrast && "border-t-2 border-foreground dark:border-white"
          )}
        >
          <ul className="flex flex-col gap-1">
            {links.map((link) => {
              const isActive = isActiveRoute(link.href, activeRoute);
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => {
                      link.onClick?.(e);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-md w-full font-medium transition-colors",
                      targetSizeClasses,
                      focusClasses,
                      isActive
                        ? "font-bold text-primary underline underline-offset-4 bg-muted/50"
                        : "text-foreground hover:bg-muted",
                      adaptations.underlineLinks && "underline underline-offset-4 decoration-2"
                    )}
                  >
                    <span>{link.label}</span>
                    {link.badge !== undefined && (
                      <span className="text-xs rounded-full px-2 py-0.5 bg-muted">
                        {link.badge}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
});

TederashNavigation.displayName = "TederashNavigation";

export const AccessibleNavigation = TederashNavigation;
