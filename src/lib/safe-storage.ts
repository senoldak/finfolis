// Güvenli localStorage sarmalayıcısı: Safari Gizli Dolaşma modu veya kumhavuzlu (sandboxed)
// ortamlarda localStorage erişiminin fırlattığı SecurityError veya QuotaExceededError hatalarını yakalar ve
// bellek içi (in-memory Map) yedeğe düşer.
const bellek = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      /* SecurityError veya engellenmiş depolama */
    }
    return bellek.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    const sVal = String(value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, sVal);
      }
    } catch {
      /* SecurityError veya kota aşımı (Safari Özel Mod) */
    }
    bellek.set(key, sVal);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      /* SecurityError */
    }
    bellek.delete(key);
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      /* SecurityError */
    }
    bellek.clear();
  },
};
