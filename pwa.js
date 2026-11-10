// Kuinstall RAINWATCH kama application kwenye simu/kompyuta
(function () {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  const panel = document.getElementById('installPanel'), btn = document.getElementById('installBtn'),
    close = document.getElementById('installClose'), help = document.getElementById('installHelp'), headerBtn = document.getElementById('headerInstall');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ua = navigator.userAgent, isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let deferred = null;
  const show = () => { if (!standalone && localStorage.getItem('rw-install-hide') !== '1') panel.hidden = false; };
  if (standalone) return;
  headerBtn.hidden = false;

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; help.hidden = true; show(); });
  window.addEventListener('appinstalled', () => { panel.hidden = true; headerBtn.hidden = true; deferred = null; });

  async function install() {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (outcome === 'accepted') { panel.hidden = true; headerBtn.hidden = true; }
      return;
    }
    // Browser haitoi kitufe cha moja kwa moja: onyesha maelekezo
    setHelp(); panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function setHelp() {
    help.hidden = false; btn.hidden = true;
    help.innerHTML = isIOS
      ? '📱 <b>iPhone/iPad (Safari):</b> bonyeza kitufe cha <b>Share</b> (⬆️) chini ya skrini, kisha chagua <b>“Add to Home Screen”</b> na ubonyeze <b>Add</b>.'
      : '📱 <b>Android (Chrome):</b> bonyeza menyu <b>⋮</b> juu kulia, kisha <b>“Install app”</b> au <b>“Add to Home screen”</b>.<br>💻 <b>Kompyuta (Chrome/Edge):</b> bonyeza alama ya <b>install</b> (⊕) kwenye sehemu ya anwani (address bar).';
  }
  btn.addEventListener('click', install);
  headerBtn.addEventListener('click', install);
  close.addEventListener('click', () => { panel.hidden = true; localStorage.setItem('rw-install-hide', '1'); });
  if (isIOS) setTimeout(() => { if (!deferred) { setHelp(); show(); } }, 1500);
})();
