#!/usr/bin/env python3
# Tek seferlik deneme (28 Ekim 2026, pdf-karsilastir.yml): finfolis kaynaklarındaki gerçek resmi PDF'leri Microsoft
# MarkItDown ve Docling ile metne çevirir; süre, uzunluk, tablo satırı ve sayı kaybını karşılaştırır. Çıktılar iş
# eserine (artifact) gider, özet iş özetine yazılır. Repoya hiçbir şey yazmaz. Karar verilince silinebilir.
import json
import os
import pathlib
import re
import sys
import time
import urllib.request

PDFLER = [
    ('boj-para-politikasi', 'https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2026/mpr261009a.pdf'),
    ('boj-uretici-fiyat', 'https://www.boj.or.jp/en/statistics/pi/cgpi_release/cgpi2609.pdf'),
    ('boj-kredi-anketi', 'https://www.boj.or.jp/en/statistics/dl/loan/loos/release/loos2610.pdf'),
    ('boj-para-arzi', 'https://www.boj.or.jp/en/statistics/money/ms/ms2609.pdf'),
    ('ecb-konusma', 'https://www.ecb.europa.eu/press/key/date/2026/html/ecb.sp261021_1~d190f2c349.en.pdf'),
]
CIKTI = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'pdf-cikti')
SAYI = re.compile(r'(?<![\w.])-?\d+(?:[.,]\d+)*(?![\w])')


def sayilar(metin):
    return {s.replace(',', '') for s in SAYI.findall(metin)}


def indir(ad, url):
    yol = CIKTI / f'{ad}.pdf'
    istek = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (finfolis deneme)'})
    with urllib.request.urlopen(istek, timeout=60) as r:
        yol.write_bytes(r.read())
    return yol


def markitdown_cevir(yol):
    from markitdown import MarkItDown
    return MarkItDown().convert(str(yol)).text_content


_docling = None


def docling_cevir(yol):
    global _docling
    if _docling is None:
        from docling.document_converter import DocumentConverter
        _docling = DocumentConverter()
    return _docling.convert(str(yol)).document.export_to_markdown()


def referans(yol):
    """Ham metin katmanı (pypdf): sayı kaybını ölçmek için tarafsız taban."""
    from pypdf import PdfReader
    return '\n'.join(p.extract_text() or '' for p in PdfReader(str(yol)).pages)


def main():
    CIKTI.mkdir(parents=True, exist_ok=True)
    satirlar = ['## MarkItDown ve Docling: finfolis PDF kaynakları', '',
                '| Belge | Sayfa | Araç | Süre (sn) | Karakter | Tablo satırı | Ham metindeki sayıların korunan oranı |',
                '|---|---|---|---|---|---|---|']
    ozet = []
    for ad, url in PDFLER:
        try:
            yol = indir(ad, url)
        except Exception as e:
            satirlar.append(f'| {ad} | – | indirilemedi ({type(e).__name__}) | | | | |')
            continue
        from pypdf import PdfReader
        sayfa = len(PdfReader(str(yol)).pages)
        taban = sayilar(referans(yol))
        for arac, cevir in (('MarkItDown', markitdown_cevir), ('Docling', docling_cevir)):
            bas = time.time()
            try:
                md = cevir(yol)
            except Exception as e:
                satirlar.append(f'| {ad} | {sayfa} | {arac} | hata: {type(e).__name__} | | | |')
                continue
            sure = time.time() - bas
            (CIKTI / f'{ad}.{arac.lower()}.md').write_text(md, encoding='utf8')
            tablo = sum(1 for s in md.splitlines() if s.lstrip().startswith('|'))
            oran = len(taban & sayilar(md)) / len(taban) if taban else 1
            satirlar.append(f'| {ad} | {sayfa} | {arac} | {sure:.1f} | {len(md)} | {tablo} | %{oran * 100:.0f} |')
            ozet.append({'belge': ad, 'arac': arac, 'sn': round(sure, 1), 'karakter': len(md), 'tablo_satiri': tablo, 'sayi_orani': round(oran, 3)})
            print(f'{ad} {arac}: {sure:.1f} sn, {len(md)} karakter, {tablo} tablo satırı, sayı %{oran * 100:.0f}', flush=True)
    (CIKTI / 'ozet.json').write_text(json.dumps(ozet, ensure_ascii=False, indent=1), encoding='utf8')
    metin = '\n'.join(satirlar) + '\n'
    print(metin)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf8') as f:
            f.write(metin)


if __name__ == '__main__':
    main()
