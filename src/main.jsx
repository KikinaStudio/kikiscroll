import React from 'react'
import ReactDOM from 'react-dom/client'
import { parseUrlMode, buildPath, BASE } from './urlMode.js'
import './index.css'

// Both branches are loaded dynamically on purpose: importing App.jsx pulls in
// useAudioStore, whose module scope preloads every experience track (13 mp3s).
// The leaflet page has its own single track and must not pay that cost — and
// vice versa, the main experience doesn't need the leaflet bundle.
const renderRoot = (element) => {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>{element}</React.StrictMode>
    );
};

const segments = window.location.pathname
    .replace(BASE, '')
    .split('/')
    .filter(Boolean);

if (segments[0] === 'leaflet') {
    document.documentElement.lang = 'en';
    document.documentElement.dataset.mode = 'leaflet';
    import('./leaflet/LeafletPage.jsx').then(({ default: LeafletPage }) => {
        renderRoot(<LeafletPage />);
    });
} else if (segments[0] === 'leaflet2') {
    document.documentElement.lang = 'fr';
    document.documentElement.dataset.mode = 'leaflet2';
    import('./leaflet2/Leaflet2Page.jsx').then(({ default: Leaflet2Page }) => {
        renderRoot(<Leaflet2Page />);
    });
} else if (segments[0] === 'events') {
    document.documentElement.lang = 'fr';
    document.documentElement.dataset.mode = 'events';
    import('./events/EventsPage.jsx').then(({ default: EventsPage }) => {
        renderRoot(<EventsPage />);
    });
} else {
    const { mode, lang } = parseUrlMode();

    if (!lang) {
        window.location.replace(buildPath(mode, 'fr'));
    } else {
        document.documentElement.lang = lang;
        document.documentElement.dataset.mode = mode;

        Promise.all([
            import('./App.jsx'),
            import('./LanguageContext.jsx'),
            import('./ModeContext.jsx'),
        ]).then(([{ default: App }, { LanguageProvider }, { ModeProvider }]) => {
            renderRoot(
                <ModeProvider mode={mode}>
                    <LanguageProvider lang={lang}>
                        <App />
                    </LanguageProvider>
                </ModeProvider>
            );
        });
    }
}
