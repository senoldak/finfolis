#!/usr/bin/env python3
# PDF gölgesi (28 Ekim 2026). Bot merkez bankası duyurusunun PDF olduğunu görünce bugün yalnız başlığı okur ve adresi
# kuyruğa yazar (merkez-bankalari.mjs pdfGolgeKaydet). Bu betik yayından sonra kuyruktaki PDF'leri Docling ile metne
# çevirir ve yalnız ölçer: sayfa, süre, karakter, tablo satırı, faiz cümlesi bulundu mu. Bot ve yayın etkilenmez.
# Daha önce ölçülen adresler (yapilan dosyası, iş akışı önbellekte tutar) yeniden işlenmez. Çeviriler iş eserine gider.
# Kullanım: python pdf-golge.py <kuyruk.jsonl> <yapilan.txt> <cikti-klasoru>
import hashlib
import json
import os
import pathlib
import re
import sys
import time
import urllib.request

AZAMI = 3
FAIZ = re.compile(r'(policy|interest|call) rate[^.]{0,160}?\d+(?:\.\d+)?\s?(?:%|percent)', re.I)


def main(kuyruk, yapilan, cikti):
    cikti = pathlib.Path(cikti)
    cikti.mkdir(parents=True, exist_ok=True)
    yapilan = pathlib.Path(yapilan)
    yapilan.parent.mkdir(parents=True, exist_ok=True)
    onceki = set(yapilan.read_text(encoding='utf8').split()) if yapilan.exists() else set()
    try:
        ogeler = [json.loads(s) for s in pathlib.Path(kuyruk).read_text(encoding='utf8').splitlines() if s.strip()]
    except FileNotFoundError:
        ogeler = []
    yeni = [o for o in ogeler if o['url'] not in onceki][:AZAMI]
    print(f'pdf-gölge: kuyrukta {len(ogeler)} PDF, {len(yeni)} yeni')
    # Yalnız sayma (Docling kurulmadan önce, sistem Python'u): yeni PDF yoksa iş akışı kurulumu atlar.
    if os.environ.get('PDF_GOLGE_SAY') == '1':
        if yeni and os.environ.get('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf8') as f:
                f.write('yeni=1\n')
        return
    if not yeni:
        return
    from docling.document_converter import DocumentConverter
    cevirici = DocumentConverter()
    for o in yeni:
        bas = time.time()
        olcum = {'kurum': o['kurum'], 'url': o['url']}
        try:
            istek = urllib.request.Request(o['url'], headers={'User-Agent': 'Mozilla/5.0 (finfolis)'})
            ad = hashlib.sha1(o['url'].encode()).hexdigest()[:10]
            pdf = cikti / f'{ad}.pdf'
            with urllib.request.urlopen(istek, timeout=60) as r:
                pdf.write_bytes(r.read())
            belge = cevirici.convert(str(pdf)).document
            md = belge.export_to_markdown()
            (cikti / f'{ad}.md').write_text(f'<!-- {o["url"]} -->\n{md}', encoding='utf8')
            pdf.unlink()
            olcum.update({
                'sayfa': len(belge.pages),
                'karakter': len(md),
                'tablo_satiri': sum(1 for s in md.splitlines() if s.lstrip().startswith('|')),
                'faiz_cumlesi': bool(FAIZ.search(md)),
            })
        except Exception as e:
            olcum['hata'] = type(e).__name__
        olcum['sn'] = round(time.time() - bas, 1)
        print(f'pdf-ölçüm {json.dumps(olcum, ensure_ascii=False)}', flush=True)
        with yapilan.open('a', encoding='utf8') as f:
            f.write(o['url'] + '\n')


if __name__ == '__main__':
    main(*sys.argv[1:4])
