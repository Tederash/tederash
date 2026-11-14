export interface LedgerEntry {
  el: WeakRef<Element>;
  kind: 'attr' | 'style';
  name: string;
  prev: string | null;
}

/**
 * Tracks any direct DOM/attribute mutations so revert() restores exact original state.
 */
export class MutationLedger {
  private entries: LedgerEntry[] = [];

  recordAttr(el: Element, name: string): void {
    const already = this.entries.some(
      (entry) => entry.kind === 'attr' && entry.name === name && entry.el.deref() === el
    );
    if (already) return;
    this.entries.push({
      el: new WeakRef(el),
      kind: 'attr',
      name,
      prev: el.getAttribute(name),
    });
  }

  revert(): void {
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const entry = this.entries[i];
      if (!entry) continue;
      const el = entry.el.deref();
      if (!el) continue;

      if (entry.kind === 'attr') {
        if (entry.prev === null) {
          el.removeAttribute(entry.name);
        } else {
          el.setAttribute(entry.name, entry.prev);
        }
      }
    }
    this.entries = [];
  }

  size(): number {
    return this.entries.length;
  }
}
