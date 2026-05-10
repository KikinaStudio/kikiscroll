import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LanguageProvider } from './LanguageContext.jsx'
import { ModeProvider } from './ModeContext.jsx'
import { parseUrlMode, buildPath } from './urlMode.js'
import './index.css'

const { mode, lang } = parseUrlMode();

if (!lang) {
    window.location.replace(buildPath(mode, 'fr'));
} else {
    document.documentElement.lang = lang;
    document.documentElement.dataset.mode = mode;

    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <ModeProvider mode={mode}>
                <LanguageProvider lang={lang}>
                    <App />
                </LanguageProvider>
            </ModeProvider>
        </React.StrictMode>
    )
}
