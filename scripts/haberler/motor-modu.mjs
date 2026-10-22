// Motor modu (MOTOR_TUR=1): tur, private mecmua deposundaki ortak motorla (motor/tur.mjs) sürülür.
// Motor kodu bu depoda yoktur; CI'da $MOTOR_DIZIN'e salt-okur çekilir ve dinamik import() ile yüklenir.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { adresiSil } from './gizli.mjs';

export const AYAR = { ad: 'finfolis', site: 'https://finfolis.com', yaziYolu: '/haber/{slug}/', havuzSaat: 24, bekleyenLimit: 50 };

// Karar verilen sonuç (yazildi / elendi / havuza giren bekliyor) üyesi durum.gorulen'e işaretlenir; yerelTur ile aynı kural.
const kararMi = (s) => s.durum === 'yazildi' || s.durum === 'elendi' || (s.durum === 'bekliyor' && s.havuzda);

/** Motorun sürdüğü uyarlayıcı: sonuçları (fırlatılan hatanın kısmi sonuçları dahil) gorulen'e de işler. */
function isaretleyen(uyarlayici, durum, simdi) {
  const kimden = new Map();
  const kaydet = (liste) => liste.forEach((a) => a.yuk?.id && kimden.set(a.kimlik, a.yuk.id));
  const isaretle = (sonuclar) => {
    const zaman = (simdi ?? new Date()).toISOString();
    for (const s of sonuclar ?? []) {
      const id = kimden.get(s.kimlik);
      if (kararMi(s) && id) durum.gorulen[id] ??= { zaman }; // finfolis gorulen kayıtları nesnedir ({ zaman, ... })
    }
  };
  return {
    ...uyarlayici,
    adaylar: async (...a) => {
      const liste = await uyarlayici.adaylar(...a);
      kaydet(liste);
      return liste;
    },
    isle: async (girdi, ...r) => {
      kaydet(girdi);
      try {
        const sonuclar = await uyarlayici.isle(girdi, ...r);
        isaretle(sonuclar);
        return sonuclar;
      } catch (e) {
        isaretle(e?.sonuclar); // tur durduran hatada bile karar verilenler yerel durumda kaybolmaz
        throw e;
      }
    },
  };
}

/**
 * Ortak motorla tur. motorDizin: motor/ klasörü. Motor yüklenemezse hata fırlatır (yerel tura düşülmez).
 * @param {{ motorDizin: string, uyarlayici: object, durum: object, env?: object, simdi?: Date, surVar?: () => boolean, log?: Function, rot?: string }} p
 */
export async function motorTuru({ motorDizin, uyarlayici, durum, env = process.env, simdi = new Date(), surVar, log = console.log, rot = '.' }) {
  const yukle = (dosya) => import(pathToFileURL(path.join(motorDizin, dosya)).href);
  let tur, defter, gizli;
  try {
    [tur, defter, gizli] = await Promise.all([yukle('tur.mjs'), yukle('defter.mjs'), yukle('ortak/gizli.mjs')]);
  } catch (e) {
    throw new Error(`motor yüklenemedi (MOTOR_DIZIN): ${adresiSil(e.message)}`);
  }
  return tur.turCalistir({
    site: AYAR.ad,
    ayar: AYAR,
    uyarlayici: isaretleyen(uyarlayici, durum, simdi),
    defter: defter.defterIstemcisi({ url: env.MOTOR_URL, site: AYAR.ad, anahtar: env.MOTOR_ANAHTARI }),
    gizli: gizli.gizliKur({ sifreliDosya: 'scripts/haberler/kaynaklar/gizli-kaynaklar.sifreli', kokDizin: rot }),
    geminiKur: () => ({ sayac: { cagri: 0, giris: 0, cikis: 0 } }),
    simdi,
    ...(surVar && { surVar }),
    log,
  });
}

/** Mod seçimi: MOTOR_TUR === '1' → motor (MOTOR_DIZIN şart); aksi hâlde yerel tur. */
export async function turSec({ env = process.env, uyarlayici, durum, yerel, motor = motorTuru, ...rest }) {
  if (env.MOTOR_TUR !== '1') return yerel(uyarlayici, durum);
  if (!env.MOTOR_DIZIN) throw new Error('MOTOR_TUR=1 ama MOTOR_DIZIN tanımlı değil; motor modunda yerel tura düşülmez.');
  return motor({ motorDizin: env.MOTOR_DIZIN, uyarlayici, durum, env, ...rest });
}
