/**
 * LiteTheme — Atticus Lite's own look & feel.
 *
 * Deliberately NOT the dark fintech theme of the main app. Lite is a retro,
 * playful, social-game skin: warm cream paper, teal + coral + mustard-gold
 * accents, navy ink, chunky outlined "neo-retro" controls with hard offset
 * shadows. Palette is pulled from the product deck.
 *
 * Lite redefines the same CSS custom property names the main GlobalTheme uses,
 * so the Lite components (which reference `var(--…)`) re-skin wholesale. Only
 * one route mounts at a time, so there's no clash with the main app at `/`.
 */

import React, { useEffect } from 'react';
import { createGlobalStyle } from 'styled-components';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';

const LiteGlobal = createGlobalStyle`
  :root {
    /* Retro paper + ink */
    --bg: #f3e7cd;
    --bg-elev: #fffaf0;
    --bg-elev-2: #f7edd6;
    --border: #e7d6ab;
    --border-strong: #2a3b50;       /* navy outline for the neo-retro stroke */
    --text: #233244;                /* navy ink */
    --text-dim: #7c6c4d;            /* warm muted */
    --text-muted: #aa9a78;

    /* Accents */
    --accent: #f0a92e;              /* mustard gold (the "money" colour) */
    --accent-hover: #ffbd4b;
    --up: #2f9c8f;                  /* teal = HIGH / win */
    --up-dim: rgba(47,156,143,0.18);
    --down: #e8604c;               /* coral = LOW / lose */
    --down-dim: rgba(232,96,76,0.18);
    --purple: #6f5aa6;
    --overlay: rgba(35,50,68,0.45);

    --font-sans: 'Space Grotesk', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    --font-display: 'Fredoka', 'Space Grotesk', sans-serif;
    --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;

    /* Hard offset shadow = the retro tactile signature */
    --shadow-hard: 3px 3px 0 var(--border-strong);
    --shadow-hard-lg: 5px 5px 0 var(--border-strong);
    --shadow-soft: 0 8px 24px rgba(35,50,68,0.14);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    background:
      radial-gradient(circle at 18% 12%, rgba(240,169,46,0.16), transparent 42%),
      radial-gradient(circle at 86% 8%, rgba(47,156,143,0.14), transparent 40%),
      var(--bg);
    background-attachment: fixed;
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body { overflow-x: hidden; min-height: 100vh; }
  #root { min-height: 100vh; width: 100vw; }

  button { font-family: inherit; -webkit-tap-highlight-color: transparent; }
  input, textarea, select { font-family: inherit; color: inherit; background: transparent; border: 0; outline: none; }

  ::selection { background: rgba(240,169,46,0.4); color: var(--text); }

  .num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

  @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
  @keyframes litePulse {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }
  @keyframes liteFloat {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
`;

/**
 * Injects the retro Google Font once (kept out of the shared index.html so the
 * main app's markup is untouched) and renders the Lite global styles.
 */
export const LiteTheme: React.FC = () => {
  useEffect(() => {
    const id = 'lite-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  return <LiteGlobal />;
};
