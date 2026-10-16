// /bulten/ sayfası: ?durum= değerine göre ilgili mesajı gösterir. JavaScript kapalıysa genel açıklama kalır.
(function () {
  var durum = new URLSearchParams(location.search).get('durum');
  if (!durum) return;
  var kutular = document.querySelectorAll('[data-durum]');
  var genel = document.getElementById('bulten-genel');
  for (var i = 0; i < kutular.length; i++) {
    if (kutular[i].getAttribute('data-durum') === durum) {
      kutular[i].hidden = false;
      if (genel) genel.hidden = true;
      return;
    }
  }
})();
