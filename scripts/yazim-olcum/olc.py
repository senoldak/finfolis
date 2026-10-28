# Tek seferlik yazım ölçümü (28 Ekim 2026, yazim-olcum.yml). Türkçe: Zemberek ile akana; Norveççe: Hunspell nb_NO ile
# Divvun (divvunspell + grammar-nob). Aynı yazılar, aynı sözcük listesi. Repoya yazmaz; çıktı iş eserine ve özetine gider.
# Kullanım: python olc.py <araç klasörü> <çıktı klasörü>
import collections, json, os, pathlib, random, re, subprocess, sys, time

ARAC = pathlib.Path(sys.argv[1])
CIKTI = pathlib.Path(sys.argv[2])
CIKTI.mkdir(parents=True, exist_ok=True)
KOK = pathlib.Path(os.environ.get('GITHUB_WORKSPACE', '.'))
ORNEK = 30
random.seed(28)


def yazilar(klasor, n):
    out = []
    for d in klasor.iterdir():
        p = d / 'index.md' if d.is_dir() else d
        if not p.exists() or p.suffix != '.md':
            continue
        s = p.read_text(encoding='utf8').replace('\r\n', '\n')
        m = re.match(r'---\n(.*?)\n---\n(.*)', s, re.S)
        if not m:
            continue
        on, govde = m.groups()
        t = re.search(r'^date:\s*(\S+)', on, re.M)
        out.append({'yol': d.name if d.is_dir() else d.stem, 'tarih': t.group(1) if t else '', 'on': on, 'govde': govde})
    out.sort(key=lambda y: y['tarih'], reverse=True)
    return out[:n]


def alan(on, ad):
    m = re.search(rf'^{ad}:\s*"?(.*?)"?\s*$', on, re.M)
    return m.group(1) if m else ''


def temizle(g):
    g = re.sub(r'```.*?```', ' ', g, flags=re.S)
    g = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', g)
    g = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', g)
    g = re.sub(r'<[^>]+>', ' ', g)
    g = re.sub(r'^\|.*$', ' ', g, flags=re.M)
    g = re.sub(r'`[^`]*`', ' ', g)
    g = re.sub(r'^[#>*\-\s]+', '', g, flags=re.M)
    return re.sub(r'[*_]{1,2}', '', g)


def metin(y):
    return '\n'.join([alan(y['on'], 'title'), alan(y['on'], 'description'), temizle(y['govde'])])


SOZ = {'tr': re.compile(r"[^\W\d_]+(?:'[^\W\d_]+)?"), 'nb': re.compile(r'[^\W\d_]+(?:-[^\W\d_]+)*')}


def sozcukler(dil, m):
    return [w for w in SOZ[dil].findall(m) if len(w) >= 2]


def sinif_ipucu(w):
    if w.isupper():
        return 'kisaltma'
    if w[0].isupper():
        return 'buyuk-harf'
    if re.fullmatch(r'[a-z]+', w):
        return 'yalniz-ascii'
    return 'kucuk'


def baglam(m, w):
    i = m.find(w)
    return m[max(0, i - 70): i + len(w) + 50].replace('\n', ' ') if i >= 0 else ''


def calistir(komut, girdi=None):
    t = time.time()
    r = subprocess.run(komut, input=girdi, capture_output=True, text=True, encoding='utf8')
    return r, time.time() - t


# --- denetleyiciler: her biri benzersiz sözcük listesi alır, yanlış saydığı sözcüklerin kümesini döndürür ---

def zemberek(ws):
    g = CIKTI / 'tr-sozcukler.txt'
    g.write_text('\n'.join(ws), encoding='utf8')
    c = CIKTI / 'zemberek-cikti.tsv'
    r, sn = calistir(['java', '-cp', f"{ARAC / 'zemberek'}:{ARAC / 'zemberek/lib/*'}", 'ZemberekKontrol', str(g), str(c)])
    if r.returncode:
        raise RuntimeError(r.stderr[-2000:])
    return {l.split('\t')[0] for l in c.read_text(encoding='utf8').splitlines() if l}, sn


def akana_(ws):
    import akana
    t = time.time()
    sc = akana.SpellChecker()
    return {w for w in ws if not sc.is_correct(w)}, time.time() - t


def hunspell(ws):
    r, sn = calistir(['hunspell', '-d', str(ARAC / 'hunspell/nb_NO'), '-i', 'UTF-8', '-l'], '\n'.join(ws))
    if r.returncode:
        raise RuntimeError(r.stderr[-2000:])
    return set(r.stdout.split()), sn


def divvunspell(ws):
    yanlis, toplam = set(), 0.0
    for i in range(0, len(ws), 400):
        parca = ws[i:i + 400]
        r, sn = calistir([str(ARAC / 'divvun/divvunspell'), 'suggest', '--archive', str(ARAC / 'divvun/nob.bhfst'),
                          '--json', '-n', '1', *parca])
        toplam += sn
        if r.returncode:
            raise RuntimeError(r.stderr[-2000:])
        j = json.loads(r.stdout)
        for k in j.get('suggest', []):
            if not k['is_correct']:
                yanlis.add(k['word'])
        if i == 0:
            (CIKTI / 'divvunspell-ornek.json').write_text(r.stdout[:20000], encoding='utf8')
    return yanlis, toplam


def divvun_dilbilgisi(metinler, azami_sn=900):
    # Her paragraf ayrı süreç (CLI'nin toplu girişi belgelenmemiş); süre sınırına gelince durur.
    drb = ARAC / 'divvun/grammar-nob.drb'
    out, toplam, ilk_hata = [], 0.0, None
    for y, m in metinler:
        if toplam > azami_sn:
            break
        for par in [p for p in m.split('\n') if len(p.split()) >= 3]:
            r, sn = calistir([str(ARAC / 'divvun/divvun-runtime'), 'run', str(drb), par])
            toplam += sn
            if r.returncode:
                ilk_hata = ilk_hata or (r.stderr[-1500:] or r.stdout[-1500:])
                continue
            out.append({'yol': y, 'paragraf': par, 'cikti': r.stdout})
    (CIKTI / 'divvun-dilbilgisi.jsonl').write_text('\n'.join(json.dumps(o, ensure_ascii=False) for o in out), encoding='utf8')
    return out, toplam, ilk_hata


# --- ölçüm ---

def olc(dil, ys, araclar):
    metinler = [(y['yol'], metin(y)) for y in ys]
    gecis = collections.Counter()
    yazida = collections.defaultdict(set)
    for yol, m in metinler:
        for w in sozcukler(dil, m):
            gecis[w] += 1
            yazida[w].add(yol)
    ws = sorted(gecis)
    sonuc = {'yazi': len(ys), 'sozcuk': sum(gecis.values()), 'benzersiz': len(ws), 'araclar': {}}
    for ad, f in araclar:
        try:
            yanlis, sn = f(ws)
        except Exception as e:  # bir aracın düşmesi ötekinin sonucunu silmesin
            sonuc['araclar'][ad] = {'hata': str(e)[:1500]}
            continue
        yanlis = {w for w in yanlis if w in gecis}
        siniflar = collections.Counter(sinif_ipucu(w) for w in yanlis for _ in range(gecis[w]))
        ornek_havuz = [(w, yol) for w in sorted(yanlis) for yol in sorted(yazida[w])]
        ornek = random.sample(ornek_havuz, min(ORNEK, len(ornek_havuz)))
        mt = dict(metinler)
        sonuc['araclar'][ad] = {
            'sure_sn': round(sn, 1), 'isaretli_benzersiz': len(yanlis),
            'isaretli_gecis': sum(gecis[w] for w in yanlis), 'yazi_basina': round(sum(gecis[w] for w in yanlis) / len(ys), 1),
            'ipucu_sinif': dict(siniflar),
            'ornek30': [{'sozcuk': w, 'yazi': yol, 'baglam': baglam(mt[yol], w)} for w, yol in ornek],
            'yanlis_liste': sorted(yanlis),
        }
    return sonuc, metinler


tr = yazilar(KOK / 'src/content/haberler', 100) + yazilar(KOK / '_kifobu/src/content/haberler', 100)
nb = yazilar(KOK / '_tidsrost/src/content/haberler', 200)
TR, _ = olc('tr', tr, [('zemberek', zemberek), ('akana', akana_)])
NB, nb_metin = olc('nb', nb, [('hunspell', hunspell), ('divvunspell', divvunspell)])
gb, gb_sn, gb_hata = divvun_dilbilgisi(nb_metin)
NB['divvun_dilbilgisi'] = {'paragraf_ciktisi': len(gb), 'yazi': len({o['yol'] for o in gb}), 'sure_sn': round(gb_sn, 1),
                           'ilk_hata': gb_hata}

# Kesişimler: iki aracın ortak ve yalnız kendi işaretledikleri
for S, a, b in ((TR, 'zemberek', 'akana'), (NB, 'hunspell', 'divvunspell')):
    A, B = S['araclar'].get(a, {}), S['araclar'].get(b, {})
    if 'yanlis_liste' in A and 'yanlis_liste' in B:
        x, y = set(A['yanlis_liste']), set(B['yanlis_liste'])
        S['kesisim'] = {'ortak': len(x & y), f'yalniz_{a}': len(x - y), f'yalniz_{b}': len(y - x),
                        f'yalniz_{a}_kucuk': sorted(w for w in x - y if sinif_ipucu(w) == 'kucuk')[:300],
                        f'yalniz_{b}_kucuk': sorted(w for w in y - x if sinif_ipucu(w) == 'kucuk')[:300]}

(CIKTI / 'sonuc.json').write_text(json.dumps({'tr': TR, 'nb': NB}, ensure_ascii=False, indent=1), encoding='utf8')

# İş özeti: yalnız sayılar (bağlamlar eserde)
s = ['# Yazım ölçümü (deneme)', '']
for dil, S in (('Türkçe', TR), ('Norveççe', NB)):
    s += [f"## {dil}: {S['yazi']} yazı, {S['sozcuk']} sözcük, {S['benzersiz']} benzersiz", '',
          '| Araç | Süre (sn) | İşaretli benzersiz | İşaretli geçiş | Yazı başına | İpucu sınıfları |', '|---|---|---|---|---|---|']
    for ad, a in S['araclar'].items():
        if 'hata' in a:
            s.append(f'| {ad} | HATA | | | | `{a["hata"][:200]}` |')
        else:
            s.append(f"| {ad} | {a['sure_sn']} | {a['isaretli_benzersiz']} | {a['isaretli_gecis']} | {a['yazi_basina']} | {a['ipucu_sinif']} |")
    if 'kesisim' in S:
        k = S['kesisim']
        s.append('')
        s.append('Kesişim: ' + ', '.join(f'{x} {v}' for x, v in k.items() if isinstance(v, int)))
    s.append('')
d = NB['divvun_dilbilgisi']
s.append(f"Divvun dilbilgisi: {d['yazi']} yazıda {d['paragraf_ciktisi']} paragraf işlendi, {d['sure_sn']} sn" + (f"; ilk hata: `{d['ilk_hata'][:300]}`" if d['ilk_hata'] else ''))
(CIKTI / 'ozet.md').write_text('\n'.join(s), encoding='utf8')
print('\n'.join(s))
