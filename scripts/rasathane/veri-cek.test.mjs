import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { veriCek } from './veri-cek.mjs';

function gecici() {
  return mkdtempSync(path.join(tmpdir(), 'rasathane-test-'));
}
function yaz(kok, yol, icerik = '{}') {
  const tam = path.join(kok, yol);
  mkdirSync(path.dirname(tam), { recursive: true });
  writeFileSync(tam, icerik);
}

test('yerel klasörden yalnız geçerli yollar kopyalanır', async () => {
  const kaynak = gecici();
  const kok = gecici();
  const hedef = path.join(kok, 'hedef');
  yaz(kaynak, 'emtia/pano.json');
  yaz(kaynak, 'emtia/seri/GC=F.json');
  yaz(kaynak, 'emtia/notlar.txt', 'x');
  yaz(kaynak, 'kok.json');
  yaz(kaynak, 'Buyuk/pano.json');
  yaz(kaynak, 'emtia/seri/alt/x.json');
  yaz(path.dirname(kaynak), 'kacak.json');
  try {
    const sonuc = await veriCek({ hedef, yerel: kaynak, komut: async () => assert.fail('git çağrılmamalı') });
    assert.deepEqual(sonuc, { durum: 'tamam', dosya: 2 });
    assert.ok(existsSync(path.join(hedef, 'emtia/pano.json')));
    assert.ok(existsSync(path.join(hedef, 'emtia/seri/GC=F.json')));
    assert.ok(!existsSync(path.join(hedef, 'emtia/notlar.txt')));
    assert.ok(!existsSync(path.join(hedef, 'kok.json')));
    assert.ok(!existsSync(path.join(hedef, 'Buyuk/pano.json')));
    assert.ok(!existsSync(path.join(hedef, 'emtia/seri/alt/x.json')));
    assert.ok(!existsSync(path.join(kok, 'kacak.json')));
    const durum = JSON.parse(readFileSync(path.join(hedef, '_durum.json'), 'utf8'));
    assert.equal(durum.durum, 'tamam');
    assert.ok(!Number.isNaN(Date.parse(durum.cekildi)));
  } finally {
    rmSync(kaynak, { recursive: true, force: true });
    rmSync(kok, { recursive: true, force: true });
  }
});

test('hedefteki eski dosya yeni çekimde silinir', async () => {
  const kaynak = gecici();
  const kok = gecici();
  const hedef = path.join(kok, 'hedef');
  yaz(kaynak, 'emtia/pano.json');
  yaz(hedef, 'emtia/eski.json');
  try {
    await veriCek({ hedef, yerel: kaynak });
    assert.ok(!existsSync(path.join(hedef, 'emtia/eski.json')));
    assert.ok(existsSync(path.join(hedef, 'emtia/pano.json')));
  } finally {
    rmSync(kaynak, { recursive: true, force: true });
    rmSync(kok, { recursive: true, force: true });
  }
});

test('klonlama hep düşerse 3 deneme, alinamadi, istisna sızmaz', async () => {
  const kok = gecici();
  const hedef = path.join(kok, 'hedef');
  let cagri = 0;
  try {
    const sonuc = await veriCek({
      hedef,
      gecici: path.join(kok, 'gecici'),
      yerel: undefined,
      komut: async () => {
        cagri++;
        throw new Error('ağ yok');
      },
    });
    assert.equal(cagri, 3);
    assert.deepEqual(sonuc, { durum: 'alinamadi', dosya: 0 });
    assert.deepEqual(JSON.parse(readFileSync(path.join(hedef, '_durum.json'), 'utf8')), { durum: 'alinamadi' });
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});

test('klonlama ikinci denemede tutarsa tamam; git argümanları dizi', async () => {
  const kok = gecici();
  const hedef = path.join(kok, 'hedef');
  const gec = path.join(kok, 'gecici');
  const cagrilar = [];
  try {
    const sonuc = await veriCek({
      hedef,
      gecici: gec,
      depo: 'https://example.test/r.git',
      yerel: undefined,
      komut: async (args) => {
        cagrilar.push(args);
        if (cagrilar.length === 1) throw new Error('geçici hata');
        if (args[0] === 'clone') yaz(gec, 'site-veri/emtia/pano.json');
      },
    });
    assert.deepEqual(sonuc, { durum: 'tamam', dosya: 1 });
    assert.deepEqual(cagrilar[1], ['clone', '--depth', '1', '--filter=blob:none', '--sparse', 'https://example.test/r.git', gec]);
    assert.deepEqual(cagrilar[2], ['-C', gec, 'sparse-checkout', 'set', 'site-veri']);
    assert.ok(existsSync(path.join(hedef, 'emtia/pano.json')));
  } finally {
    rmSync(kok, { recursive: true, force: true });
  }
});
