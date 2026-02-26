import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// #region agent log
function _dbg(payload) {
  fetch('http://127.0.0.1:7273/ingest/ed4bcb7f-0c12-400b-b188-136e8b883c18', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd84d59' }, body: JSON.stringify({ sessionId: 'd84d59', ...payload, timestamp: Date.now() }) }).catch(() => {});
}
_dbg({ location: 'main.jsx:entry', message: 'main.jsx loaded', data: { baseUrl: import.meta.env.BASE_URL, href: typeof location !== 'undefined' ? location.href : '', hasRoot: !!document.getElementById('root') }, hypothesisId: 'H1' });
// #endregion

// #region agent log
function _onError(e) {
  _dbg({ location: 'window.onerror', message: 'global error', data: { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno }, hypothesisId: 'H3' });
}
function _onUnhandled(e) {
  _dbg({ location: 'window.onunhandledrejection', message: 'unhandled rejection', data: { reason: String(e.reason) }, hypothesisId: 'H3' });
}
if (typeof window !== 'undefined') {
  window.addEventListener('error', _onError);
  window.addEventListener('unhandledrejection', _onUnhandled);
}
// #endregion

let rootEl;
try {
  rootEl = document.getElementById('root');
  // #region agent log
  _dbg({ location: 'main.jsx:beforeRender', message: 'before createRoot', data: { hasRoot: !!rootEl }, hypothesisId: 'H4' });
  // #endregion
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
  );
  // #region agent log
  _dbg({ location: 'main.jsx:afterRender', message: 'createRoot.render succeeded', data: {}, hypothesisId: 'H3' });
  // #endregion
} catch (err) {
  // #region agent log
  _dbg({ location: 'main.jsx:catch', message: 'render failed', data: { err: String(err), stack: err && err.stack }, hypothesisId: 'H3' });
  // #endregion
  throw err;
}
