// Sayfadaki bir HTML tablosunu CSV metnine çevirir (veri sayfalarındaki "Tabloyu CSV indir" düğmesi). Tarayıcıda çalışır,
// DOM'a yalnız satır/hücre okumak için dokunur. Ayraç noktalı virgül ve başta BOM: Türkçe Excel dosyayı doğrudan açar.
// Rakamlar sayfada nasıl yazılıyorsa öyle kalır (ör. "%36", "1.234,5"); hesap için dönüştürülmez.

export const AYRAC = ';';

export function hucreKacir(metin) {
  const s = String(metin ?? '').replace(/\s+/g, ' ').trim();
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function satirlardanCsv(satirlar) {
  return '﻿' + satirlar.map((s) => s.map(hucreKacir).join(AYRAC)).join('\r\n') + '\r\n';
}

// Hücre metni: açılır kutu (<details>) varsa yalnız başlığı (<summary>); gizli öğeler atlanır.
export function hucreMetni(hucre) {
  const ozet = hucre.querySelector('summary');
  if (ozet) return ozet.textContent ?? '';
  return hucre.textContent ?? '';
}

export function tablodanSatirlar(tablo) {
  return [...tablo.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('th, td')].map(hucreMetni));
}
