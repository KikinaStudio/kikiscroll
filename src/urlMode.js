// Single source of truth for parsing /kikiscroll/[wellness/]<lang> from window.location.
// Used by main.jsx (routing/redirect) and useAudioStore.js (track selection at module load).

export const BASE = '/kikiscroll/';
export const SUPPORTED_LANGS = ['fr', 'en'];
export const SUPPORTED_MODES = ['retail', 'wellness'];

export function parseUrlMode(pathname = window.location.pathname) {
  const trimmed = pathname.replace(BASE, '').replace(/^\/+/, '').replace(/\/+$/, '');
  const segments = trimmed.split('/').filter(Boolean);

  let mode = 'retail';
  let lang = null;

  if (segments[0] === 'wellness') {
    mode = 'wellness';
    lang = SUPPORTED_LANGS.includes(segments[1]) ? segments[1] : null;
  } else {
    lang = SUPPORTED_LANGS.includes(segments[0]) ? segments[0] : null;
  }

  return { mode, lang };
}

export function buildPath(mode, lang) {
  return mode === 'wellness' ? `${BASE}wellness/${lang}` : `${BASE}${lang}`;
}
