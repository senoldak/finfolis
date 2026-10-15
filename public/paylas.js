// "Bağlantıyı kopyala" düğmesi. CSP satır içi betiğe izin vermediği için ayrı dosya; betik yoksa düğme gizli kalır.
for (const dugme of document.querySelectorAll('button[data-kopyala]')) {
  if (!navigator.clipboard) continue;
  dugme.hidden = false;
  const ilk = dugme.textContent;
  dugme.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(dugme.dataset.kopyala);
      dugme.textContent = 'Kopyalandı';
    } catch {
      dugme.textContent = 'Kopyalanamadı';
    }
    setTimeout(() => (dugme.textContent = ilk), 2000);
  });
}
