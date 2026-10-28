import type { Locale } from './i18n';

export const THEME_COOKIE = 'paobu_theme';
export const LOCALE_COOKIE = 'paobu_locale';

export const preferenceInitScript = String.raw`
(function () {
  var root = document.documentElement;
  function readCookie(name) {
    var prefix = name + '=';
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(prefix) === 0) return decodeURIComponent(parts[i].slice(prefix.length));
    }
    return null;
  }
  function validTheme(value) {
    return value === 'light' || value === 'dark' || value === 'system' ? value : null;
  }
  var params = new URLSearchParams(location.search);
  var queryTheme = validTheme(params.get('uiTheme'));
  var stored = null;
  try { stored = validTheme(localStorage.getItem('paobu_theme')); } catch (error) {}
  var preference = queryTheme || validTheme(readCookie('paobu_theme')) || stored || 'system';
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var resolved = preference === 'system' ? (media && media.matches ? 'dark' : 'light') : preference;
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;
  if (queryTheme) {
    params.delete('uiTheme');
    var search = params.toString();
    var clean = location.pathname + (search ? '?' + search : '') + location.hash;
    try { history.replaceState(null, '', clean); } catch (error) {}
  }
})();
`;

export function themeToggleScript(locale: Locale): string {
  const labels = locale === 'zh-CN'
    ? { light: '切换到浅色', dark: '切换到深色' }
    : { light: 'Switch to light theme', dark: 'Switch to dark theme' };
  return String.raw`
(function () {
  var root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var labels = ${JSON.stringify(labels)};
  function syncButtons() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      var dark = root.dataset.theme === 'dark';
      button.setAttribute('aria-label', dark ? labels.light : labels.dark);
      button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    });
  }
  function setPreference(next) {
    var resolved = next === 'system' ? (media && media.matches ? 'dark' : 'light') : next;
    root.dataset.theme = resolved;
    root.dataset.themePreference = next;
    root.style.colorScheme = resolved;
    try { localStorage.setItem('paobu_theme', next); } catch (error) {}
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    var domain = location.hostname === 'paobu.org' || location.hostname.endsWith('.paobu.org') ? '; Domain=.paobu.org' : '';
    document.cookie = 'paobu_theme=' + next + '; Path=/; Max-Age=31536000; SameSite=Lax' + domain + secure;
    syncButtons();
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      setPreference(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
  syncButtons();
  if (media) {
    var onChange = function () {
      if (root.dataset.themePreference === 'system') {
        var resolved = media.matches ? 'dark' : 'light';
        root.dataset.theme = resolved;
        root.style.colorScheme = resolved;
        syncButtons();
      }
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  }
  document.querySelectorAll('a[data-cross-site]').forEach(function (link) {
    link.addEventListener('click', function () {
      var cookieEnabled = false;
      try {
        document.cookie = 'paobu_cookie_test=1; SameSite=Lax';
        cookieEnabled = document.cookie.indexOf('paobu_cookie_test=1') !== -1;
        document.cookie = 'paobu_cookie_test=; Max-Age=0; Path=/';
      } catch (error) {}
      if (!cookieEnabled) {
        try {
          var url = new URL(link.href);
          url.searchParams.set('uiTheme', root.dataset.themePreference || 'system');
          link.href = url.toString();
        } catch (error) {}
      }
    });
  });
})();
`;
}

export const viewportAssistScript = String.raw`
(function () {
  var viewport = window.visualViewport;
  if (!viewport) return;
  var timer = 0;
  function isTextEntry(element) {
    if (!element) return false;
    return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT' || element.isContentEditable;
  }
  function revealActive() {
    var element = document.activeElement;
    if (!isTextEntry(element)) return;
    var rect = element.getBoundingClientRect();
    var top = viewport.offsetTop;
    var bottom = top + viewport.height;
    var nav = document.querySelector('.bottom-nav');
    var navHeight = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().height : 0;
    var safeBottom = bottom - navHeight - 8;
    if (rect.top < top + 8 || rect.bottom > safeBottom) {
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      var after = element.getBoundingClientRect();
      if (after.bottom > safeBottom) {
        window.scrollTo({ top: window.scrollY + after.bottom - safeBottom + 8, behavior: 'instant' });
      }
    }
  }
  viewport.addEventListener('resize', function () {
    window.clearTimeout(timer);
    timer = window.setTimeout(revealActive, 140);
  });
})();
`;

export function localeSwitchScript(locale: 'zh-CN' | 'en'): string {
  return String.raw`
(function () {
  document.querySelectorAll('[data-language-switch]').forEach(function (link) {
    link.addEventListener('click', function () {
      var secure = location.protocol === 'https:' ? '; Secure' : '';
      var domain = location.hostname === 'paobu.org' || location.hostname.endsWith('.paobu.org') ? '; Domain=.paobu.org' : '';
      document.cookie = 'paobu_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax' + domain + secure;
      try { localStorage.setItem('paobu_locale', '${locale}'); } catch (error) {}
    });
  });
})();
`;
}
