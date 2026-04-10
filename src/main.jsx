import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LanguageProvider } from './LanguageContext.jsx'
import './index.css'

// Parse language from URL path: /kikiscroll/fr or /kikiscroll/en
const base = '/kikiscroll/';
const path = window.location.pathname.replace(base, '').replace(/^\//, '').split('/')[0];
const supportedLangs = ['fr', 'en'];
const lang = supportedLangs.includes(path) ? path : null;

if (!lang) {
    // Redirect to default language (French)
    window.location.replace(base + 'fr');
} else {
    document.documentElement.lang = lang;

    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <LanguageProvider lang={lang}>
                <App />
            </LanguageProvider>
        </React.StrictMode>
    )
}
