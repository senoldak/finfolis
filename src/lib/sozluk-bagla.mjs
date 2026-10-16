// Haber gövdesinde finans sözlüğü terimlerine ilk geçişte bağlantı verir (Sätteri hast eklentisi).
// Kurallar: yalnızca src/content/haberler altındaki yazılar; haber başına en fazla SINIR terim; her terim en fazla
// bir kez bağlanır. Başlık, kod, mevcut bağlantı ve betik içindeki metin bağlanmaz. Yalnızca eşleşen metin düğümü
// bölünür; HTML yapısı korunur.
import { TERIMLER, terimUrl } from '../data/sozluk.mjs';

export const SINIR = 3;
const ATLA = new Set(['a', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style', 'button', 'title']);

// Her terim için bir RegExp. Küçük harfli ifadeler harf duyarsız ve Türkçe ek alabilir (\p{L}*).
// Büyük harfli kısaltmalar (harf: true) harf duyarlıdır ve yalnızca kesmeli ek alır (TÜFE’nin).
export function kaliplar() {
  return TERIMLER.filter((t) => t.bagla.length > 0).map((t) => {
    const parcalar = t.bagla.map((b) => (t.harf ? `(?:${b})(?:['’]\\p{L}+)?` : `(?:${b})`));
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${parcalar.join('|')})${t.harf ? '(?![\\p{L}\\p{N}])' : '\\p{L}*'}`,
      t.harf ? 'gu' : 'giu',
    );
    return { slug: t.slug, re };
  });
}

// Bir metin parçasını bağlantılı parçalara böler. Bağlanacak bir şey yoksa null döner.
// durum: { n: bugüne kadar bağlanan terim sayısı, kullanilan: Set<slug> } (haber başına, değiştirilir).
export function baglaMetni(metin, durum, kaliplarListe = kaliplar()) {
  if (durum.n >= SINIR) return null;
  const hits = [];
  for (const { slug, re } of kaliplarListe) {
    if (durum.kullanilan.has(slug)) continue;
    re.lastIndex = 0;
    const m = re.exec(metin);
    if (m) hits.push({ slug, index: m.index, text: m[0] });
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.index - b.index);
  const yeni = [];
  let son = 0;
  for (const h of hits) {
    if (durum.n >= SINIR) break;
    if (h.index < son) continue;
    if (h.index > son) yeni.push({ type: 'text', value: metin.slice(son, h.index) });
    yeni.push({
      type: 'element',
      tagName: 'a',
      properties: { href: terimUrl(h.slug), className: ['sozluk-baglanti'] },
      children: [{ type: 'text', value: h.text }],
    });
    durum.kullanilan.add(h.slug);
    durum.n++;
    son = h.index + h.text.length;
  }
  if (yeni.length === 0) return null;
  if (son < metin.length) yeni.push({ type: 'text', value: metin.slice(son) });
  return yeni;
}

// Haber yazısı mı? Yalnızca içerik koleksiyonunun haber klasörü; bültenler (tur: bulten) bağlanmaz.
export function haberDosyasiMi(fileURL) {
  if (!fileURL) return false;
  const yol = decodeURIComponent(fileURL.pathname).replace(/\\/g, '/');
  return /\/src\/content\/haberler\//.test(yol);
}

// Sätteri eklentisi: her belge için yeni bir durum oluşturulur (factory her belgede çağrılır).
// Haber dışı belgelerde null döner ve eklenti hattan çıkar.
export default function sozlukBagla(ctx) {
  if (!haberDosyasiMi(ctx?.fileURL)) return null;
  const durum = { n: 0, kullanilan: new Set() };
  const kaliplarListe = kaliplar();
  return {
    name: 'sozluk-bagla',
    text(node, hctx) {
      if (durum.n >= SINIR) return;
      // Başlık, bağlantı, kod vb. içindeki metin atlanır.
      for (let p = hctx.parent(node); p; p = hctx.parent(p)) {
        if (p.type === 'element' && ATLA.has(p.tagName)) return;
      }
      const yeni = baglaMetni(node.value, durum, kaliplarListe);
      if (yeni) hctx.replaceNode(node, yeni);
    },
  };
}
