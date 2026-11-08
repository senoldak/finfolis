import test from 'node:test';
import assert from 'node:assert/strict';
import { safeStorage } from './safe-storage.ts';

test('safeStorage: window olmadan (Node/SSR ortamında) Map üzerinden güvenle çalışır', () => {
  safeStorage.clear();
  assert.equal(safeStorage.getItem('anahtar'), null);
  safeStorage.setItem('anahtar', 'deger1');
  assert.equal(safeStorage.getItem('anahtar'), 'deger1');
  safeStorage.removeItem('anahtar');
  assert.equal(safeStorage.getItem('anahtar'), null);
});

test('safeStorage: localStorage SecurityError fırlattığında Map yedeğine geçer', () => {
  const sahteHata = () => {
    throw new Error('SecurityError: The operation is insecure.');
  };

  (globalThis as any).window = {
    get localStorage() {
      return {
        getItem: sahteHata,
        setItem: sahteHata,
        removeItem: sahteHata,
        clear: sahteHata,
      };
    },
  };

  try {
    safeStorage.clear();
    assert.doesNotThrow(() => {
      safeStorage.setItem('kullanici-tercihi', 'karanlik');
    });
    assert.equal(safeStorage.getItem('kullanici-tercihi'), 'karanlik');
    safeStorage.removeItem('kullanici-tercihi');
    assert.equal(safeStorage.getItem('kullanici-tercihi'), null);
  } finally {
    delete (globalThis as any).window;
  }
});

test('safeStorage: normal localStorage var olduğunda onu kullanır', () => {
  const depo = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => depo.get(k) ?? null,
      setItem: (k: string, v: string) => depo.set(k, String(v)),
      removeItem: (k: string) => depo.delete(k),
      clear: () => depo.clear(),
    },
  };

  try {
    safeStorage.setItem('tema', 'aydinlik');
    assert.equal(depo.get('tema'), 'aydinlik');
    assert.equal(safeStorage.getItem('tema'), 'aydinlik');
    safeStorage.removeItem('tema');
    assert.equal(safeStorage.getItem('tema'), null);
  } finally {
    delete (globalThis as any).window;
  }
});

test('safeStorage: Safari Özel Dolaşma modunda (setItem kota hatası verir, getItem null döner) belleğe düşer ve okur', () => {
  (globalThis as any).window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError: The quota has been exceeded.');
      },
      removeItem: () => {},
      clear: () => {},
    },
  };

  try {
    safeStorage.clear();
    assert.doesNotThrow(() => {
      safeStorage.setItem('yazi-boyu', '2');
    });
    assert.equal(safeStorage.getItem('yazi-boyu'), '2');
    safeStorage.removeItem('yazi-boyu');
    assert.equal(safeStorage.getItem('yazi-boyu'), null);
  } finally {
    delete (globalThis as any).window;
  }
});
