// Hamburger menü (≤ 1080 px): Esc ve dışarı tıklama kapatır. CSP satır içi betiğe izin vermediği için ayrı dosya.
document.addEventListener('DOMContentLoaded', function () {
  var meny = document.querySelector('.nav-meny');
  if (!meny) return;
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && meny.open) {
      meny.open = false;
      meny.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', function (e) {
    if (meny.open && !meny.contains(e.target)) meny.open = false;
  });
});
