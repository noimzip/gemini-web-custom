(() => {
  const switcherSelector = '[data-test-id="bard-mode-menu-button"]';
  const menuSelector = '[data-test-id="gem-mode-menu"]';
  const materialMenuSelector = '.gds-mode-switch-menu[role="menu"]';
  const modelSelector = '[data-mode-id], [data-test-id^="bard-mode-option-"]';
  const levelSelector = '[data-test-id="thinking-level-option"], [role="menuitemradio"]';
  const thinkingSelector = '[value="thinking_level"], .thinking-level-header[aria-expanded]';
  const coverAttribute = "data-gwc-covered";
  let session;

  const modelFor = label => modelElements.find(model => model.aliases.test(label.normalize("NFKC")));
  const isExpanded = button => button.getAttribute("aria-expanded") === "true";
  const controlledBy = button => document.getElementById(button.getAttribute("aria-controls") || "");
  const isMounted = node => Boolean(node?.getClientRects().length) && node.dataset.visible !== "false";
  const textOf = (node, selector) => node.querySelector(selector)?.textContent.trim() ?? "";

  function describe(control) {
    return {
      control,
      label: textOf(control, ".label, .mode-title, [data-test-id='thinking-level-option-title']")
        || control.getAttribute("aria-label") || control.textContent.trim(),
      description: textOf(control, ".sublabel, .mode-desc, .thinking-level-option-description"),
      selected: control.getAttribute("aria-checked") === "true"
        || control.getAttribute("aria-current") === "true"
        || control.getAttribute("aria-pressed") === "true"
        || Boolean(control.querySelector('[data-test-id="thinking-level-check"]')),
      disabled: control.matches(":disabled, [aria-disabled='true']"),
      locked: Boolean(control.querySelector('[fonticonname="lock"], [data-mat-icon-name="lock"]'))
    };
  }

  function readMenu({marker, trigger}) {
    if (trigger.getAttribute("aria-expanded") === "false") return null;
    const scope = marker.closest("bard-mode-switcher") ?? marker.parentElement;
    const controlled = controlledBy(trigger);
    const menu = controlled?.matches(`${menuSelector}, ${materialMenuSelector}`) ? controlled : scope?.querySelector(menuSelector);
    if (!isMounted(menu)) return null;

    const models = new Map();
    let auto;
    for (const control of menu.querySelectorAll(modelSelector)) {
      if (control.closest('[role="menu"]') !== menu || !isMounted(control)) continue;
      const option = describe(control);
      // Some menus show the use case first and the versioned model name below it.
      const sublabelName = /^(?:Gemini\s*)?4\s+(.+)$/iu.exec(option.description.normalize("NFKC"))?.[1] ?? "";
      const sublabelEntry = modelFor(sublabelName);
      const entry = sublabelEntry ?? modelFor(option.label);
      if (entry) {
        const model = {
          ...option,
          label: sublabelEntry ? sublabelName : option.label,
          description: sublabelEntry ? option.label : option.description,
          disabled: option.disabled || option.locked,
          number: entry.number,
          color: entry.color,
          key: String(entry.number)
        };
        if (!models.has(entry.number) || option.selected) models.set(entry.number, model);
      } else if (/\bauto\b|自動モード|オート/i.test(option.label)) {
        auto = {...option, key: "auto"};
      }
    }

    const signInControl = menu.querySelector('[data-test-id="mode-picker-sign-in-button"], [data-test-id="bard-sign-in-button"]');
    const signIn = isMounted(signInControl) ? describe(signInControl) : null;
    if (!models.size && !auto && !signIn) return null;

    const thinking = menu.querySelector(thinkingSelector);
    const submenu = thinking && controlledBy(thinking);
    const expanded = thinking?.querySelector(".expand-content");
    const levelRoot = isMounted(submenu) ? submenu : expanded;
    const levelControls = levelRoot?.querySelectorAll(levelSelector)
      ?? menu.querySelectorAll('[data-test-id="thinking-level-option"]');
    const levels = Array.from(levelControls).filter(isMounted).map((node, index) => ({...describe(node), key: String(index)}));
    return {
      menu, models: Array.from(models.values()), auto, signIn, thinking, levels,
      container: menu.querySelector(".menu-inner-container") ?? menu,
      wrapper: menu.closest('[data-test-id="bard-mode-desktop-gem-menu"], [data-test-id="bard-mode-popover-menu"]')
        ?? menu,
      submenu: isMounted(submenu) ? submenu : null
    };
  }

  function removeView(current) {
    current.covered.forEach(node => node.removeAttribute(coverAttribute));
    current.covered.clear();
    current.view?.remove();
    current.view = null;
  }

  function stop(current) {
    if (session !== current) return;
    session = null;
    current.observer.disconnect();
    clearTimeout(current.openTimeout);
    cancelAnimationFrame(current.frame);
    removeView(current);
  }

  function keepNativeCovered(current, data) {
    // A submenu can enter the browser's top layer independently of the main menu.
    const nestedPopover = data.submenu?.closest("[popover]");
    const targets = new Set([data.wrapper.closest("[popover]") ?? data.wrapper]);
    if (nestedPopover) targets.add(nestedPopover);
    for (const node of current.covered) {
      if (!targets.has(node)) node.removeAttribute(coverAttribute);
    }
    for (const node of targets) node.setAttribute(coverAttribute, "");
    current.covered = targets;
  }

  function act(current, action) {
    const data = current.data;
    if (action === "original") {
      const selected = data.models.find(model => model.selected) ?? data.auto;
      current.covered.forEach(node => node.removeAttribute(coverAttribute));
      (selected?.control ?? data.menu).focus({preventScroll: true});
      stop(current);
      return;
    }
    if (action === "close") {
      current.trigger.click();
      stop(current);
      current.trigger.focus({preventScroll: true});
      return;
    }

    const [kind, key] = action.split(":");
    const option = kind === "model" ? (key === "auto" ? data.auto : data.models.find(model => model.key === key))
      : kind === "level" ? data.levels.find(level => level.key === key) : data.signIn;
    if (!option || option.disabled || !option.control.isConnected) return;
    if (kind === "model" && option.selected) return;
    if (kind === "model" && option.number) current.chosen = option.number;
    option.control.click();
    schedule(current);
  }

  function sync(current) {
    if (!geminiChatRoute() || !current.trigger.isConnected) {
      stop(current);
      return;
    }

    const data = readMenu(current);
    if (!data) {
      if (!current.view) return;
      const chosen = current.chosen;
      const triggerLabel = textOf(current.marker, '[data-test-id="logo-pill-label-container"], .picker-primary-text')
        || current.trigger.textContent;
      const triggerModel = modelFor(current.trigger.getAttribute("aria-label") ?? "") ?? modelFor(triggerLabel);
      if (chosen && chosen === triggerModel?.number && !isExpanded(current.trigger)) {
        // Let Gemini finish closing the menu before asking it to open again.
        removeView(current);
        current.chosen = null;
        current.thinkingAttempt = null;
        current.frame = requestAnimationFrame(() => {
          current.frame = 0;
          if (!current.trigger.isConnected) {
            stop(current);
            return;
          }
          current.openTimeout = setTimeout(() => stop(current), 1200);
          if (!isExpanded(current.trigger) && !readMenu(current)) current.trigger.click();
          schedule(current);
        });
      } else {
        stop(current);
      }
      return;
    }

    if (current.view && current.data.menu !== data.menu) {
      removeView(current);
      current.thinkingAttempt = null;
    }
    current.data = data;
    if (current.chosen && data.models.some(model => model.number === current.chosen && model.selected)) current.chosen = null;
    if (!current.view) {
      clearTimeout(current.openTimeout);
      // Gemini closes its menu when focus leaves the menu's DOM subtree.
      current.view = createModelPicker(data.container, current.trigger, action => act(current, action));
      current.view.update(data);
      current.view.focus();
    } else {
      current.view.update(data);
    }
    keepNativeCovered(current, data);
    current.view.position();

    const selected = data.models.find(model => model.selected) ?? (data.auto?.selected ? data.auto : null);
    const thinkingKey = selected?.key ?? "";
    if (data.thinking && !data.levels.length && !isExpanded(data.thinking)
        && (current.thinkingAttempt?.control !== data.thinking || current.thinkingAttempt?.key !== thinkingKey)) {
      current.thinkingAttempt = {control: data.thinking, key: thinkingKey};
      data.thinking.click();
      // The native submenu may move the focus as it opens.
      current.view.focus();
    }
  }

  function schedule(current) {
    if (session !== current || current.frame) return;
    current.frame = requestAnimationFrame(() => {
      current.frame = 0;
      try {
        sync(current);
      } catch (error) {
        stop(current);
        console.warn("Gemini Model Table could not enhance this menu", error);
      }
    });
  }

  function onOpen(event) {
    if (!geminiChatRoute() || !(event.target instanceof Element)) return;
    const marker = event.target.closest(switcherSelector);
    if (!marker) return;
    const trigger = marker.matches("button") ? marker : marker.querySelector("button") ?? marker;
    if (session?.trigger === trigger) return;
    if (session) stop(session);

    const current = {trigger, marker, covered: new Set()};
    session = current;
    current.observer = new MutationObserver(() => schedule(current));
    current.observer.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["aria-controls", "aria-expanded", "aria-checked", "aria-current", "aria-disabled", "data-visible"]
    });
    current.openTimeout = setTimeout(() => stop(current), 1200);
    schedule(current);
  }

  document.addEventListener("click", onOpen, true);
  document.addEventListener("keydown", event => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) onOpen(event);
  }, true);
  navigation.addEventListener("currententrychange", () => {
    if (session && !geminiChatRoute()) stop(session);
  });
})();
