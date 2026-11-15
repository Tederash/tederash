"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Thin scroll-progress indicator for the documentation table of contents.
 *
 * Injects a 2px track along the left edge of the "On this page" list and
 * fills it with the brand accent proportionally to how far the article has
 * been scrolled — a continuous "you are here" line that complements the
 * active-heading highlight Nextra already applies.
 *
 * Renders nothing on pages without a TOC (e.g. the landing page), respects
 * the reduce-motion adaptation via global CSS, and cleans up after itself on
 * every route change.
 */
export function TocProgress() {
  const pathname = usePathname();

  useEffect(() => {
    const tocNav = document.querySelector("nav.nextra-toc");
    const article = document.querySelector("article");
    const list = tocNav?.querySelector("ul");
    const host = list?.parentElement;
    if (!tocNav || !article || !list || !host) return;

    const track = document.createElement("div");
    track.className = "tederash-toc-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("div");
    fill.className = "tederash-toc-track-fill";
    track.appendChild(fill);

    host.prepend(track);

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = article.getBoundingClientRect();
      const viewport = window.innerHeight;
      const scrollable = Math.max(rect.height - viewport, 0);
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(scrollable, 1));
      const progress = scrollable > 0 ? scrolled / scrollable : 1;
      fill.style.height = `${Math.round(progress * 100)}%`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const onScroll = () => schedule();
    const onResize = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      track.remove();
    };
  }, [pathname]);

  return null;
}
