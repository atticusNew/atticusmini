import { createGlobalStyle } from 'styled-components';
import { tokens } from './theme';

export const GlobalTheme = createGlobalStyle`
  :root {
    --bg: ${tokens.color.bg};
    --bg-elev: ${tokens.color.bgElev};
    --bg-elev-2: ${tokens.color.bgElev2};
    --border: ${tokens.color.border};
    --border-strong: ${tokens.color.borderStrong};
    --text: ${tokens.color.text};
    --text-dim: ${tokens.color.textDim};
    --text-muted: ${tokens.color.textMuted};
    --accent: ${tokens.color.accent};
    --accent-hover: ${tokens.color.accentHover};
    --up: ${tokens.color.up};
    --up-dim: ${tokens.color.upDim};
    --down: ${tokens.color.down};
    --down-dim: ${tokens.color.downDim};
    --overlay: ${tokens.color.overlay};

    --font-sans: ${tokens.font.sans};
    --font-mono: ${tokens.font.mono};

    /* Legacy shims so unmigrated components keep working until PR #25 sweep. */
    --bg-primary: ${tokens.color.bg};
    --bg-panel: ${tokens.color.bgElev};
    --bg-button: ${tokens.color.bgElev2};
    --bg-button-hover: ${tokens.color.borderStrong};
    --green: ${tokens.color.up};
    --red: ${tokens.color.down};
    --shadow: ${tokens.shadow.card};
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: ${tokens.size.body};
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    overflow-x: hidden;
    min-height: 100vh;
  }

  #root { min-height: 100vh; width: 100vw; }

  button {
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  input, textarea, select {
    font-family: inherit;
    color: inherit;
    background: transparent;
    border: 0;
    outline: none;
  }

  ::selection {
    background: rgba(245, 195, 68, 0.32);
    color: var(--text);
  }

  /* Tabular numerals for prices everywhere */
  .num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
