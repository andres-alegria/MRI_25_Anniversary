/* -------------------------------------------------------------------------
 * Soft access gate for the MRI 25th Anniversary preview.
 *
 * Blocks the bundler from unpacking the page until the passphrase is entered,
 * so the content never reaches the DOM for a visitor without it.
 *
 * SCOPE: the page content ships inside this same HTML file. This deters
 * casual link-sharing; it is NOT real access control. Anyone who opens
 * view-source, or the public repo, can read the content regardless.
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var HASH = '__PASSWORD_HASH__';

  /* ---- appearance knobs ---- */
  var BG       = '#faf9f5';   // adjust gate background
  var CARD     = '#ffffff';   // adjust card background
  var INK      = '#3a3630';   // adjust primary text color
  var MUTED    = '#8a8377';   // adjust secondary text color
  var ACCENT   = '#0067b2';   // adjust focus ring and button color
  var ERROR    = '#b23c17';   // adjust error text color
  var RADIUS   = '14px';      // adjust card corner radius
  var EYEBROW  = 'MRI · 25TH ANNIVERSARY PUBLICATION';
  var TITLE    = 'Stories from Our Changing Mountains';
  var SUBTITLE = 'This preview is private. Enter the passphrase to continue.';

  var REMEMBER_DAYS = 30;     // adjust how long an unlock is remembered
  var STORE_KEY = '__mri25_unlocked_until';

  function remembered() {
    try {
      return parseInt(localStorage.getItem(STORE_KEY) || '0', 10) > Date.now();
    } catch (e) { return false; }
  }

  function remember() {
    try {
      localStorage.setItem(STORE_KEY, String(Date.now() + REMEMBER_DAYS * 864e5));
    } catch (e) { /* private mode — unlock just won't persist */ }
  }

  function sha256Hex(str) {
    return crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(str))
      .then(function (buf) {
        return Array.prototype.map
          .call(new Uint8Array(buf), function (b) {
            return b.toString(16).padStart(2, '0');
          })
          .join('');
      });
  }

  function buildUI(resolve) {
    var wrap = document.createElement('div');
    wrap.id = '__gate';
    wrap.innerHTML =
      '<style>' +
      '#__gate{position:fixed;inset:0;z-index:100000;background:' + BG + ';' +
      'display:flex;align-items:center;justify-content:center;padding:24px;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
      '#__gate .card{background:' + CARD + ';border-radius:' + RADIUS + ';' +
      'padding:40px 36px;max-width:420px;width:100%;' +
      'box-shadow:0 2px 24px rgba(0,0,0,.08);}' +
      '#__gate .eyebrow{font-size:11px;letter-spacing:.12em;color:' + MUTED + ';' +
      'margin-bottom:18px;}' +
      '#__gate h1{font-size:22px;line-height:1.3;color:' + INK + ';' +
      'font-weight:600;margin-bottom:10px;}' +
      '#__gate p{font-size:14px;line-height:1.5;color:' + MUTED + ';margin-bottom:22px;}' +
      '#__gate input{width:100%;padding:12px 14px;font-size:15px;color:' + INK + ';' +
      'border:1px solid #ddd8cc;border-radius:8px;background:' + BG + ';outline:none;}' +
      '#__gate input:focus{border-color:' + ACCENT + ';box-shadow:0 0 0 3px ' + ACCENT + '22;}' +
      '#__gate button{width:100%;margin-top:12px;padding:12px;font-size:15px;' +
      'font-weight:500;color:#fff;background:' + ACCENT + ';border:0;border-radius:8px;' +
      'cursor:pointer;}' +
      '#__gate button:hover{filter:brightness(1.08);}' +
      '#__gate .err{min-height:18px;margin-top:10px;font-size:13px;color:' + ERROR + ';}' +
      '#__gate .shake{animation:__gsh .3s;}' +
      '@keyframes __gsh{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}' +
      '</style>' +
      '<div class="card">' +
      '<div class="eyebrow">' + EYEBROW + '</div>' +
      '<h1>' + TITLE + '</h1>' +
      '<p>' + SUBTITLE + '</p>' +
      '<form autocomplete="on">' +
      '<input type="password" name="password" autocomplete="current-password" ' +
      'placeholder="Passphrase" aria-label="Passphrase" autofocus>' +
      '<button type="submit">View the publication</button>' +
      '<div class="err" role="alert"></div>' +
      '</form></div>';

    document.body.appendChild(wrap);

    var form = wrap.querySelector('form');
    var input = wrap.querySelector('input');
    var err = wrap.querySelector('.err');
    input.focus();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sha256Hex(input.value).then(function (h) {
        if (h === HASH) {
          remember();
          wrap.remove();
          resolve();
        } else {
          err.textContent = 'That passphrase does not match. Please try again.';
          wrap.querySelector('.card').classList.remove('shake');
          void wrap.offsetWidth;
          wrap.querySelector('.card').classList.add('shake');
          input.select();
        }
      });
    });
  }

  window.__gate = function () {
    // crypto.subtle is unavailable in non-secure contexts (e.g. file://).
    // Opening the file locally already means possessing the content, so the
    // gate would protect nothing there — skip it so local preview works.
    if (!window.crypto || !crypto.subtle) {
      console.warn('[gate] insecure context — gate skipped for local preview.');
      return Promise.resolve();
    }
    if (remembered()) return Promise.resolve();
    return new Promise(buildUI);
  };
})();
