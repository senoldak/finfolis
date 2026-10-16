import test from 'node:test';
import assert from 'node:assert/strict';
import { icerikTuru, kaynakAdiTuru } from './icerik-turu.mjs';

test('icerikTuru: veri modülleri veri, merkez bankası resmi, gizli kaynak türsüz', () => {
  assert.equal(icerikTuru([{ id: 'kur:usdjpy:2026-10-16' }]), 'veri');
  assert.equal(icerikTuru([{ id: 'esik:brent:yukselis:2026-10-16' }]), 'veri');
  assert.equal(icerikTuru([{ id: 'fed:https://www.federalreserve.gov/x' }]), 'resmi');
  assert.equal(icerikTuru([{ id: 'sec:0001213900-26-108587' }]), 'resmi');
  assert.equal(icerikTuru([{ id: 'k1a2b3c:0123456789abcdef' }]), undefined);
  assert.equal(icerikTuru([]), undefined);
});

test('icerikTuru: resmi beslemenin tur alanı kullanılır, yoksa resmi sayılır', () => {
  assert.equal(icerikTuru([{ id: 'ECB Working Papers:https://www.ecb.europa.eu/x' }]), 'arastirma');
  assert.equal(icerikTuru([{ id: 'Bank of England:https://www.bankofengland.co.uk/x' }]), 'resmi');
});

test('icerikTuru: karışık olayda öncelik veri > araştırma > resmi', () => {
  assert.equal(icerikTuru([{ id: 'k1a2b3c:abc' }, { id: 'fed:https://x' }]), 'resmi');
  assert.equal(icerikTuru([{ id: 'fed:https://x' }, { id: 'BIS Working Papers:https://y' }]), 'arastirma');
  assert.equal(icerikTuru([{ id: 'BIS Working Papers:https://y' }, { id: 'kur:eurusd:1' }]), 'veri');
});

test('kaynakAdiTuru: yayımlanmış yazının kaynak adından tür', () => {
  assert.equal(kaynakAdiTuru('Avrupa Merkez Bankası referans kuru'), 'veri');
  assert.equal(kaynakAdiTuru('TÜİK, TCMB aracılığıyla'), 'veri');
  assert.equal(kaynakAdiTuru('SEC EDGAR'), 'resmi');
  assert.equal(kaynakAdiTuru('Japonya Merkez Bankası'), 'resmi');
  assert.equal(kaynakAdiTuru('Örnek Haber'), undefined);
});
