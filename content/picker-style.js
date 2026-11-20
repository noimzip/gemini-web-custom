const pickerStyle = `
  :host(:popover-open) {
    /* Keep site-wide popover styles from altering this panel's geometry. */
    all: initial !important;
    --surface: #f9fbff;
    --ink: #202a3e;
    --muted: #53617a;
    --border: #d6deeb;
    --tile: #edf1f8;
    --tile-ink: #59677c;
    --detail: #f1f5fc;
    --ring: #315ec4;
    --shadow: 0 16px 54px #17254138, 0 2px 10px #1725411c;
    position: fixed !important;
    inset: var(--picker-top, 12px) auto auto var(--picker-left, 12px) !important;
    display: block !important;
    box-sizing: border-box !important;
    width: min(1056px, calc(100vw - 24px)) !important;
    max-height: calc(100dvh - 24px) !important;
    margin: 0 !important;
    border: 1px solid var(--border) !important;
    border-radius: 20px !important;
    overflow: auto !important;
    background: var(--surface) !important;
    color: var(--ink) !important;
    box-shadow: var(--shadow) !important;
    visibility: visible !important;
    pointer-events: auto !important;
    font: 14px/1.4 system-ui, sans-serif !important;
    color-scheme: light !important;
  }

  :host([data-theme="dark"]) {
    --surface: #1b202a;
    --ink: #eef2fb;
    --muted: #aeb9cd;
    --border: #374255;
    --tile: #252c38;
    --tile-ink: #a1aec2;
    --detail: #222a38;
    --ring: #a8beff;
    --shadow: 0 16px 54px #0008, 0 2px 12px #0005;
    color-scheme: dark !important;
  }

  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  button:disabled { cursor: default; }
  button:focus-visible, .chart-scroll:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }

  .panel { padding: 17px 19px 20px; outline: none; }
  .header, .header-actions, .detail-heading, .detail-actions {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .header { justify-content: space-between; margin-bottom: 12px; }
  .header-actions { flex-shrink: 0; }
  h2, h3, p { margin: 0; }
  h2 { font-size: 19px; letter-spacing: -.025em; font-weight: 690; }
  h3 { font-size: 15px; line-height: 1.25; }
  .text-button, .close-button, .pill {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    padding: 5px 10px;
  }
  .text-button { font-size: 12px; color: var(--muted); }
  .close-button { width: 32px; height: 32px; padding: 0; font-size: 22px; line-height: 1; }
  .text-button:hover, .close-button:hover, .pill:hover:enabled { background: var(--tile); }

  .chart {
    --cell: clamp(31px, 5vh, 43px);
    display: grid;
    grid-template-columns: 24px repeat(18, minmax(0, 1fr));
    grid-template-rows: 16px repeat(7, var(--cell)) 5px repeat(2, var(--cell));
    gap: 4px;
  }
  .chart-scroll, .grid { display: contents; }
  .axis, .range {
    display: grid;
    place-items: center;
    color: var(--muted);
    font: 10px/1 ui-monospace, monospace;
  }
  .range {
    border: 1px dashed var(--border);
    border-radius: 6px;
    font-size: 9px;
  }

  .element {
    display: grid;
    place-items: center;
    position: relative;
    min-width: 0;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--tile);
    color: var(--tile-ink);
    padding: 8px 0 0;
    font-size: 16px;
    line-height: 1;
    font-weight: 570;
  }
  .atomic-number {
    position: absolute;
    inset: 4px auto auto 5px;
    font: 9px/1 ui-monospace, monospace;
    opacity: .88;
  }
  [data-color="blue"] { --accent: #234eb2; --tint: #e1eaff; }
  [data-color="violet"] { --accent: #663ca3; --tint: #efe4ff; }
  [data-color="amber"] { --accent: #8c4800; --tint: #fff0d8; }
  [data-color="teal"] { --accent: #086969; --tint: #dbf5ef; }
  :host([data-theme="dark"]) [data-color="blue"] { --accent: #a9c6ff; --tint: #253d65; }
  :host([data-theme="dark"]) [data-color="violet"] { --accent: #e0b8ff; --tint: #483363; }
  :host([data-theme="dark"]) [data-color="amber"] { --accent: #ffd48c; --tint: #52381e; }
  :host([data-theme="dark"]) [data-color="teal"] { --accent: #9ee7da; --tint: #204846; }
  .element[data-color], .model-chip[data-color], .level[aria-pressed="true"] {
    border-color: color-mix(in srgb, var(--accent) 52%, var(--border));
    background: var(--tint);
    color: var(--accent);
  }
  button.element:hover, .model-chip:hover:enabled, .level:hover:enabled {
    border-color: var(--accent, var(--ring));
  }
  .element[aria-pressed="true"], .model-chip[aria-pressed="true"] {
    box-shadow: inset 0 0 0 1px var(--accent, var(--ring));
  }
  .element[aria-pressed="true"]::after {
    content: "";
    position: absolute;
    inset: 5px 5px auto auto;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }
  button.element:disabled, .model-chip:disabled, .level:disabled { opacity: .55; }

  .detail {
    grid-area: 3 / 4 / 5 / 14;
    align-self: center;
    justify-self: stretch;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 12px;
    min-width: 0;
    margin: 0 7px;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: var(--detail);
  }
  .detail-heading { flex: 1 1 160px; min-width: 0; gap: 9px; }
  .detail-copy { min-width: 0; }
  .detail p { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
  .detail-badge { width: 33px; height: 34px; flex-shrink: 0; font-size: 16px; }
  .detail-badge .atomic-number { top: 3px; left: 4px; }
  .detail-actions { flex-wrap: wrap; gap: 4px; }
  .level-label { color: var(--muted); font-size: 11px; font-weight: 600; }
  .pill { font-size: 12px; padding: 4px 8px; }
  .level-title { flex-basis: 100%; }
  .compact-models { display: none; }
  .footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 12px; }
  .footer button[aria-pressed="true"] { border-color: var(--ring); }
  .legend { color: var(--muted); font-size: 12px; }

  @media (max-width: 850px) {
    .panel { padding: 14px 13px 15px; }
    .chart { display: flex; flex-direction: column; gap: 9px; }
    .chart-scroll { display: block; order: 2; overflow-x: auto; padding: 2px; }
    .grid {
      display: grid;
      grid-template-columns: 24px repeat(18, minmax(33px, 1fr));
      grid-template-rows: 16px repeat(7, 33px) 5px repeat(2, 33px);
      gap: 3px;
      min-width: 672px;
    }
    .detail { order: 1; align-self: stretch; margin: 0; }
    .compact-models { display: flex; gap: 5px; flex-wrap: wrap; }
    .compact-models:empty { display: none; }
    .footer { margin-top: 8px; }
  }

  @media (max-width: 440px) {
    h2 { font-size: 16px; }
    .header, .header-actions { gap: 6px; }
    .text-button { padding-inline: 7px; }
  }
`;
