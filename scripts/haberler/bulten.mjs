// Her çalıştırmada (Oslo saatiyle 08:40 … 02:40, 2 saatte bir) bölgeli piyasa bülteni: olay başına tek madde (Gemini, doğrulamalı), göstergeler veriden.
import { gemini as varsayilanGemini } from './lib.mjs';
import { kontrolMasasi } from './yayin-kurulu.mjs';
import { dogrula } from './dogrula.mjs';
import { KURALLAR, SES } from './yazar.mjs';
import { bultenKapagi } from '../kapak/kapak.mjs';
import { kaynakIzi } from './gizli.mjs';

const TZ = 'Europe/Istanbul';
export const EN_AZ_MADDE = 3;
export const BULTEN_AZAMI = 12; // bülten başına en fazla madde

const trSayi = (n, d) => n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

// Bir sonraki bülten için saklanacak anlık görüntü.
export function anlikAl(piyasa, simdi) {
  const degerler = {};
  for (const g of piyasa.gostergeler ?? []) if (Number.isFinite(g.deger)) degerler[g.id] = g.deger;
  return { zaman: simdi.toISOString(), degerler };
}

export const bultenGerekli = (olaySayisi) => olaySayisi >= EN_AZ_MADDE;

function gostergeSatiri(g) {
  const d = g.ondalik ?? 2;
  let s = `- **${g.ad}:** ${g.onEk ?? ''}${trSayi(g.deger, d)}${g.sonEk ?? ''}`;
  if (Number.isFinite(g.degisim)) s += ` (günlük değişim: %${g.degisim > 0 ? '+' : ''}${trSayi(g.degisim, 1)})`;
  return s;
}

export const BOLGELER = [
  ['abd', 'ABD'],
  ['avrupa', 'Avrupa'],
  ['asya', 'Asya'],
  ['kuresel', 'Küresel'],
];

const MADDE_SEMASI = {
  type: 'object',
  properties: {
    maddeler: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          olay: { type: 'string' },
          etiket: { type: 'string', description: 'kısa Türkçe başlık, 2-5 kelime' },
          metin: { type: 'string', description: '1-2 cümle, düz metin' },
        },
        required: ['olay', 'etiket', 'metin'],
      },
    },
  },
  required: ['maddeler'],
};

const TR_AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Başlıkta saat yazılmaz (sunucu UTC'de çalışıyor, okur için yanıltıcı); yalnızca gün ve ay.
function baslikTarih(simdi) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, day: 'numeric', month: 'numeric' })
      .formatToParts(simdi)
      .map((x) => [x.type, x.value]),
  );
  return { gun: Number(p.day), ay: TR_AY[Number(p.month) - 1] };
}

async function maddeleriYaz(olaylar, gemini) {
  const kaynak = olaylar.map((o, i) => `[${i + 1}] ${o.baslik}\n${String(o.kaynakMetni ?? '').slice(0, 2500)}`).join('\n\n=====\n\n');
  const r = await gemini({
    sema: MADDE_SEMASI,
    sistem: `Sen finfolis için çalışan bir ekonomi muhabirisin. ${SES}\n${KURALLAR}`,
    istem: `Aşağıdaki her olay için piyasa bülteninde tek madde yaz: "etiket" alanına olayı anlatan kısa Türkçe başlık (2-5 kelime; kaynak başlığını çevirmeden kopyalama), "metin" alanına 1-2 cümle. "olay" alanına olayın köşeli parantez içindeki sıra numarasını (1, 2, ...) yaz. Yalnızca o olayın kendi KAYNAK bölümündeki bilgileri kullan.\n\nKAYNAK:\n${kaynak}`,
  });
  const harita = new Map();
  for (const m of r?.maddeler ?? []) {
    const o = olaylar[Number(String(m?.olay).replace(/\D/g, '')) - 1];
    const etiket = String(m?.etiket ?? '').trim();
    if (o && m.metin && etiket && !harita.has(o.id)) harita.set(o.id, { etiket, metin: String(m.metin).trim() });
  }
  return harita;
}

const kontrolTaslagi = (metinler) => ({ baslik: 'Piyasa bülteni', spot: '', govde: metinler.join('\n') });

const satirMetni = (m) => `${m.etiket}: ${m.metin}`;

// Döner: {yazi, anlik, olaylar} ya da null (3'ten az doğrulanmış madde kalırsa).
// En fazla BULTEN_AZAMI olay (önem, sonra tarih sırasıyla) işlenir; olaylar = bültene seçilenler.
// butceBitti() doğruysa tek tek kontrol masası turu yapılmaz (toplu red = null).
export async function bultenYaz(
  olaylar,
  piyasa,
  { gemini = varsayilanGemini, simdi = new Date(), butceBitti = () => false, kapakYap = bultenKapagi } = {},
) {
  if (!bultenGerekli(olaylar.length)) return null;
  const secilen = [...olaylar]
    .sort((a, b) => (b.onem ?? 0) - (a.onem ?? 0) || new Date(b.tarih) - new Date(a.tarih))
    .slice(0, BULTEN_AZAMI);
  const yazilar = await maddeleriYaz(secilen, gemini).catch(() => new Map());

  // Her madde (etiket + metin) kendi olayının kaynağına karşı doğrulanır; tutmayan düşer.
  let maddeler = secilen
    .map((o) => ({ olay: o, ...yazilar.get(o.id) }))
    .filter((m) => m.metin && dogrula(satirMetni(m), [m.olay.kaynakMetni ?? '']).tamam);
  if (maddeler.length < EN_AZ_MADDE) return null;

  // Tek kontrol masası turu; reddedilirse sorunlu maddeler tek tek bulunup düşer (yeniden yazma yok).
  const hepsi = { kaynakMetni: maddeler.map((m) => m.olay.kaynakMetni ?? '').join('\n\n') };
  const tur = await kontrolMasasi(kontrolTaslagi(maddeler.map(satirMetni)), hepsi, { gemini });
  if (!tur.onay) {
    if (butceBitti()) return null;
    const sonuclar = [];
    for (const m of maddeler) sonuclar.push(await kontrolMasasi(kontrolTaslagi([satirMetni(m)]), m.olay, { gemini }));
    maddeler = maddeler.filter((_, i) => sonuclar[i].onay);
    if (maddeler.length < EN_AZ_MADDE) return null;
  }

  const bilinen = new Set(BOLGELER.map(([k]) => k));
  const bolumler = [];
  for (const [anahtar, ad] of BOLGELER) {
    const satirlar = maddeler
      .filter((m) => (bilinen.has(m.olay.bolge) ? m.olay.bolge : 'kuresel') === anahtar)
      .map((m) => {
        // Dış kaynak adı ve bağlantısı yazılmaz; yalnızca kendi haberimize bağlantı verilir.
        const ayrinti = m.olay.haberSlug ? ` ([Ayrıntı](https://finfolis.com/haber/${m.olay.haberSlug}/))` : '';
        return `- **${m.etiket}:** ${m.metin}${ayrinti}`;
      });
    if (satirlar.length) bolumler.push(`## ${ad}\n\n${satirlar.join('\n')}`);
  }
  const gostergeler = (piyasa?.gostergeler ?? []).filter((g) => Number.isFinite(g.deger));
  if (gostergeler.length) bolumler.push(`## Göstergeler\n\n${gostergeler.map(gostergeSatiri).join('\n')}`);

  const { gun, ay } = baslikTarih(simdi);
  const kaynaklar = [];
  for (const k of [...gostergeler.map((g) => g.kaynak), ...maddeler.flatMap((m) => m.olay.kaynaklar ?? [])]) {
    if (k?.url && !kaynaklar.some((x) => x.url === k.url)) kaynaklar.push({ ad: k.ad, url: k.url });
  }
  const ilk3 = [...maddeler].sort((a, b) => (b.olay.onem ?? 0) - (a.olay.onem ?? 0)).slice(0, 3).map((m) => m.etiket);

  const yazi = {
    baslik: `Piyasa bülteni · ${gun} ${ay}`,
    spot: 'Önceki bültenden bu yana öne çıkan gelişmeler, bölge bölge.',
    govde: bolumler.join('\n\n'),
    kategori: 'piyasalar',
    tarih: simdi,
    tur: 'bulten',
    kaynaklar,
    kaynakIzi: kaynakIzi(maddeler.flatMap((m) => m.olay.gizliKaynaklar ?? [])),
    kapak: kapakYap({ tarih: `${gun} ${ay}`, basliklar: ilk3 }),
    kapakAlt: 'Piyasa bülteninin öne çıkan başlıkları',
  };
  return { yazi, anlik: anlikAl(piyasa ?? {}, simdi), olaylar: maddeler.map((m) => m.olay) };
}
