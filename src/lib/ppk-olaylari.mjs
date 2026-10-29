// PPK faiz değişiklikleri, ZamanGrafik'in `olaylar` girdisi olarak. Kaynak RESMI.faiz.gecmis (TCMB 1 hafta repo
// tablosu: { tarih: geçerlilik günü, oran }); oranın değişmediği satırlar olay değildir.
// siklik 'ay': t = yıl × 12 + (ay − 1); 'hafta' (günlük/haftalık eksen): t = 1970'ten beri gün (UTC).

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const oranYaz = (n) => `%${String(n).replace('.', ',')}`;

export function ppkOlaylari(gecmis, siklik = 'ay') {
  const sonuc = [];
  const sirali = [...(gecmis ?? [])].filter((g) => g && typeof g.oran === 'number' && /^\d{4}-\d{2}-\d{2}/.test(g.tarih ?? ''));
  sirali.sort((a, b) => (a.tarih < b.tarih ? -1 : 1));
  for (let i = 1; i < sirali.length; i++) {
    const { tarih, oran } = sirali[i];
    const onceki = sirali[i - 1].oran;
    if (Math.abs(oran - onceki) < 1e-9) continue;
    const yil = Number(tarih.slice(0, 4));
    const ay = Number(tarih.slice(5, 7));
    const gun = Number(tarih.slice(8, 10));
    const t = siklik === 'ay' ? yil * 12 + ay - 1 : Math.floor(Date.UTC(yil, ay - 1, gun) / 86_400_000);
    sonuc.push({
      t,
      ad: `PPK: ${oranYaz(onceki)} → ${oranYaz(oran)} (${gun} ${AYLAR[ay - 1]} ${yil})`,
      yon: oran > onceki ? 'artis' : 'indirim',
    });
  }
  return sonuc;
}

// Haftalık eksende olay günü çoğu zaman bir gözlem gününe denk gelmez; imleç bilgisi için olayı ondan sonraki ilk
// gözlem gününe kaydırır (çizgi yine o güne çizilir). noktaT: grafikteki t değerleri, artan.
export function gozlemeHizala(olaylar, noktaT) {
  return olaylar.map((o) => ({ ...o, t: noktaT.find((t) => t >= o.t) ?? o.t }));
}
