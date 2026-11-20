function createModelPicker(container, trigger, onAction) {
  const japanese = document.documentElement.lang.toLowerCase().startsWith("ja");
  const labels = japanese ? {
    title: "モデルの周期表", original: "標準メニュー", close: "閉じる", chart: "元素周期表",
    thinking: "思考レベル", select: "選択", selectMode: "モデルを選択",
    signIn: "ログインすると、利用可能なモデルが表示されます。",
    available: count => `選択可能な Gemini 4 モデル ${count} 件`
  } : {
    title: "Model periodic table", original: "Standard menu", close: "Close", chart: "Periodic table of elements",
    thinking: "Thinking level", select: "Select", selectMode: "Select a model",
    signIn: "Sign in to see your available models.",
    available: count => `${count} Gemini 4 ${count === 1 ? "model" : "models"} available`
  };

  function element(tag, className, text = "") {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }

  function button(className, text, action) {
    const node = element("button", className, text);
    node.type = "button";
    node.dataset.action = action;
    return node;
  }

  function tile(entry, model) {
    const label = element("span", "atomic-number", entry.number);
    const node = model ? button("element", "", `model:${model.key}`) : element("span", "element");
    node.append(label, element("span", "symbol", entry.symbol));
    if (model) {
      node.dataset.color = model.color;
      node.setAttribute("aria-label", model.label);
      node.setAttribute("aria-pressed", model.selected);
      node.title = model.label;
      node.disabled = model.disabled;
    } else {
      node.setAttribute("aria-hidden", "true");
    }
    return node;
  }

  function place(node, column, row) {
    node.style.gridColumn = column;
    node.style.gridRow = row;
    return node;
  }

  const host = document.createElement("div");
  host.dataset.gwcPicker = "";
  host.popover = "manual";
  const shadow = host.attachShadow({mode: "open"});
  const styles = new CSSStyleSheet();
  styles.replaceSync(pickerStyle);
  shadow.adoptedStyleSheets = [styles];

  const panel = element("section", "panel");
  panel.tabIndex = -1;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-labelledby", "picker-title");
  const header = element("header", "header");
  const title = element("h2", "", labels.title);
  title.id = "picker-title";
  const headerActions = element("div", "header-actions");
  const close = button("close-button", "×", "close");
  close.setAttribute("aria-label", labels.close);
  headerActions.append(button("text-button", labels.original, "original"), close);
  header.append(title, headerActions);

  const compact = element("div", "compact-models");
  const chart = element("div", "chart");
  const chartScroll = element("div", "chart-scroll");
  chartScroll.setAttribute("aria-label", labels.chart);
  const grid = element("div", "grid");
  const detail = element("section", "detail");
  const footer = element("footer", "footer");
  const legend = element("span", "legend");
  const auto = button("pill", "", "model:auto");
  footer.append(legend, auto);
  chartScroll.append(grid);
  chart.append(compact, detail, chartScroll);
  panel.append(header, chart, footer);
  shadow.append(panel);

  for (let group = 1; group <= 18; group++) {
    grid.append(place(element("span", "axis", group), group + 1, 1));
  }
  for (let period = 1; period <= 7; period++) {
    grid.append(place(element("span", "axis", period), 1, period + 1));
  }
  grid.append(place(element("span", "axis", "Ln"), 3, 10), place(element("span", "axis", "An"), 3, 11));
  grid.append(place(element("span", "range", "57–71"), 4, 7), place(element("span", "range", "89–103"), 4, 8));
  const tiles = new Map();
  for (const entry of tableElements) {
    const node = place(tile(entry), entry.group + 1, entry.period + (entry.period > 7 ? 2 : 1));
    grid.append(node);
    if (modelElements.some(model => model.number === entry.number)) tiles.set(entry.number, {entry, node});
  }

  let state;
  let previewKey;
  let previousModels;
  let previousDetail;

  function renderDetail() {
    const model = state.models.find(item => item.key === previewKey)
      ?? state.models.find(item => item.selected)
      ?? (state.auto?.selected ? state.auto : state.models[0] ?? state.auto);
    const levels = model?.selected ? state.levels : [];
    const description = state.signIn ? labels.signIn : model?.description;
    const detailKey = JSON.stringify([model, levels, state.signIn], (key, value) => key === "control" ? undefined : value);
    if (detailKey === previousDetail) return;
    previousDetail = detailKey;

    const focused = shadow.activeElement;
    const focusedAction = detail.contains(focused) ? focused.dataset.action : null;
    if (focusedAction) panel.focus({preventScroll: true});
    const heading = element("div", "detail-heading");
    const entry = tiles.get(model?.number)?.entry;
    if (entry) {
      const badge = tile(entry);
      badge.classList.add("detail-badge");
      badge.dataset.color = model.color;
      heading.append(badge);
    }

    const copy = element("div", "detail-copy");
    const modelTitle = entry && !/\bGemini\s*4\b/i.test(model.label) ? `Gemini 4 ${model.label}` : model?.label;
    copy.append(element("h3", "", modelTitle ?? labels.selectMode));
    if (description) copy.append(element("p", "", description));
    heading.append(copy);
    const controls = element("div", "detail-actions");
    if (levels.length) {
      detail.dataset.color = model.color ?? "blue";
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", labels.thinking);
      controls.append(element("span", "level-label level-title", labels.thinking));
      for (const level of levels) {
        const node = button("pill level", level.label, `level:${level.key}`);
        node.setAttribute("aria-pressed", level.selected);
        node.disabled = level.disabled;
        if (level.description) node.title = level.description;
        controls.append(node);
      }
    } else if (state.signIn) {
      controls.append(button("pill", state.signIn.label, "sign-in"));
    } else if (model && !model.selected && !model.disabled) {
      controls.append(button("pill", labels.select, `model:${model.key}`));
    }
    detail.replaceChildren(heading, controls);
    Array.from(controls.querySelectorAll("button")).find(node => node.dataset.action === focusedAction)
      ?.focus({preventScroll: true});
  }

  function update(next) {
    state = next;
    host.dataset.theme = document.body.classList.contains("dark-theme") ? "dark" : "light";
    const modelKey = JSON.stringify(next.models, (key, value) => key === "control" ? undefined : value);
    if (modelKey !== previousModels) {
      previousModels = modelKey;
      const focused = shadow.activeElement;
      const focusedAction = focused?.dataset.action;
      const focusedCompact = compact.contains(focused);
      if (focusedCompact || Array.from(tiles.values()).some(slot => slot.node === focused)) {
        panel.focus({preventScroll: true});
      }
      compact.replaceChildren();
      for (const slot of tiles.values()) {
        const model = next.models.find(item => item.number === slot.entry.number);
        const former = slot.node;
        slot.node = place(tile(slot.entry, model), slot.entry.group + 1, slot.entry.period + 1);
        former.replaceWith(slot.node);
        if (former === focused && !slot.node.disabled) slot.node.focus({preventScroll: true});
        if (model) {
          const chip = button("pill model-chip", model.label, `model:${model.key}`);
          chip.dataset.color = model.color;
          chip.setAttribute("aria-pressed", model.selected);
          chip.disabled = model.disabled;
          compact.append(chip);
          if (focusedCompact && focusedAction === chip.dataset.action) chip.focus({preventScroll: true});
        }
      }
    }
    legend.textContent = labels.available(next.models.filter(model => !model.disabled).length);
    auto.hidden = !next.auto;
    if (next.auto) {
      auto.textContent = next.auto.label;
      auto.disabled = next.auto.disabled;
      auto.setAttribute("aria-pressed", next.auto.selected);
    }
    renderDetail();
  }

  function position() {
    const margin = 12;
    const gap = 7;
    const anchor = trigger.getBoundingClientRect();
    const bounds = host.getBoundingClientRect();
    const rightEdge = document.documentElement.clientWidth;
    const bottomEdge = document.documentElement.clientHeight;
    const composer = trigger.closest("input-area-v2")?.getBoundingClientRect();
    const center = composer?.width ? composer.left + composer.width / 2 : rightEdge / 2;
    const below = bottomEdge - anchor.bottom - margin;
    const above = anchor.top - margin;
    const openBelow = bounds.height + gap <= below || below > above;
    const top = openBelow ? anchor.bottom + gap : anchor.top - bounds.height - gap;
    host.style.setProperty("--picker-left", `${Math.max(margin, Math.min(center - bounds.width / 2, rightEdge - bounds.width - margin))}px`);
    host.style.setProperty("--picker-top", `${Math.max(margin, Math.min(top, bottomEdge - bounds.height - margin))}px`);
  }

  function preview(event) {
    // Keep the detail visible when the pointer moves from a model to its controls.
    const action = event.target.closest(".element, .model-chip")?.dataset.action;
    if (!action?.startsWith("model:") || previewKey === action.slice(6)) return;
    previewKey = action.slice(6);
    renderDetail();
  }

  panel.addEventListener("pointerover", preview);
  panel.addEventListener("focusin", preview);
  panel.addEventListener("click", event => {
    // Material menus close when a click bubbles to their content container.
    event.stopPropagation();
    const action = event.target.closest("button")?.dataset.action;
    if (!action) return;
    if (action.startsWith("model:")) previewKey = action.slice(6);
    onAction(action);
  });
  panel.addEventListener("keydown", event => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      onAction("close");
    }
    if (event.key === "Tab") {
      const focusable = Array.from(panel.querySelectorAll("button:not(:disabled)")).filter(node => node.getClientRects().length);
      const edge = event.shiftKey ? focusable[0] : focusable.at(-1);
      if (shadow.activeElement === edge || (shadow.activeElement === panel && event.shiftKey)) {
        event.preventDefault();
        (event.shiftKey ? focusable.at(-1) : focusable[0])?.focus();
      }
    }
  });

  container.append(host);
  try {
    host.showPopover();
  } catch (error) {
    host.remove();
    throw error;
  }
  window.addEventListener("resize", position);
  window.addEventListener("scroll", position, {capture: true, passive: true});
  return {
    update,
    position,
    focus() {
      if (!shadow.activeElement) panel.focus({preventScroll: true});
    },
    remove() {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      host.remove();
    }
  };
}
