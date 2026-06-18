export const DESIGN_STORAGE_KEY = 'renaissance-clinic-design';

export const designVariants = ['classic', 'nova'] as const;

export type DesignVariant = (typeof designVariants)[number];

export function isDesignVariant(value: string | null | undefined): value is DesignVariant {
  return Boolean(value && designVariants.includes(value as DesignVariant));
}

export function normalizeDesignVariant(value: string | null | undefined): DesignVariant {
  return isDesignVariant(value) ? value : 'classic';
}

export function getStoredDesignVariant(): DesignVariant {
  if (typeof window === 'undefined') {
    return 'classic';
  }

  try {
    return normalizeDesignVariant(window.localStorage.getItem(DESIGN_STORAGE_KEY));
  } catch {
    return 'classic';
  }
}

export function getActiveDesignVariant(): DesignVariant {
  if (typeof document !== 'undefined') {
    return normalizeDesignVariant(document.documentElement.dataset.design);
  }

  return getStoredDesignVariant();
}

export function applyDesignVariant(nextDesign: DesignVariant): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.design = nextDesign;
}

export function persistDesignVariant(nextDesign: DesignVariant): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(DESIGN_STORAGE_KEY, nextDesign);
  } catch {
    // Ignore storage failures so the UI can still switch in memory.
  }
}

export function initializeStoredDesignVariant(): void {
  applyDesignVariant(getStoredDesignVariant());
}
