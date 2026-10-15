import data from '../data/piyasa.json';
import { SITE } from './site';
import { gorunur } from './gorunur.mjs';

// Piyasa verileri src/data/piyasa.json'dan gelir (scripts/haberler/piyasa-verisi.mjs yazar).
// Yalnızca gerçek, gecikmeli veri gösterilir; her göstergenin kendi "kaynak · zaman" satırı vardır.

export { gorunur };

export interface Gosterge {
  id: string;
  ad: string;
  deger: number;
  ondalik?: number;
  onEk?: string;
  sonEk?: string;
  degisim?: number;
  simge: string;
  renk?: string;
  simgeDegeri?: number;
  simgeEtiket?: string;
  onceki?: number;
  oncekiEtiket?: string;
  anlam?: string;
  kaynak: { ad: string; url: string };
  zaman: string;
  zamanEtiket?: string;
  gecerlilik: 'kur' | 'aciklama';
  gecmis?: { tarih: string; deger: number }[];
}

export const PIYASA = data as {
  guncelleme: string;
  gostergeler: Gosterge[];
};

// Simgeli (resimli istatistik) gösterilenler ve kısa çizelgedekiler.
// Gösterilemeyecek kadar eski kurlar (3 günden eski) derleme anında elenir.
const simdi = new Date();
const gorunenler = PIYASA.gostergeler.filter((g) => gorunur(g, simdi));
const VITRIN_SIRA = ['dolar', 'enflasyon', 'euro'];
export const vitrin = gorunenler
  .filter((g) => g.simgeDegeri && g.onceki !== undefined)
  .sort((a, b) => VITRIN_SIRA.indexOf(a.id) - VITRIN_SIRA.indexOf(b.id));
export const cizelge = gorunenler.filter((g) => !vitrin.includes(g));

export function sayi(n: number, ondalik = 0) {
  return n.toLocaleString(SITE.locale, { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik });
}

export function deger(g: Gosterge, n = g.deger) {
  return `${g.onEk ?? ''}${sayi(n, g.ondalik)}${g.sonEk ?? ''}`;
}

// "<kaynak adı> · <zaman>" satırı (Europe/Istanbul, Türkçe tarih).
export function kaynakSatiri(g: Gosterge) {
  const zaman = new Date(g.zaman).toLocaleDateString(SITE.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });
  return `${g.kaynak.ad} · ${g.zamanEtiket ?? zaman}`;
}

// Günlük değişim notu: değişim rakamı gösterilen her yerde (vitrin ya da çizelge) bir kez çıkar.
const degisimVar = (l: Gosterge[]) => l.some((g) => g.degisim !== undefined);
export const notVitrinde = degisimVar(vitrin);
export const notCizelgede = !notVitrinde && degisimVar(cizelge);
export const DEGISIM_NOTU = 'Veriler gecikmelidir. Günlük değişimler bir önceki iş gününe göredir.';

// Isotype kuralı: miktar simge sayısıyla gösterilir, simge büyütülmez.
// Son simge kesirliyse kısmen çizilir (ör. 0,4 → simgenin %40'ı).
export function simgeler(miktar: number, birim: number) {
  const tam = Math.floor(miktar / birim);
  const kesir = Math.round(((miktar / birim) % 1) * 100) / 100;
  const list = Array.from({ length: tam }, () => 1);
  if (kesir >= 0.1) list.push(kesir);
  return list;
}
