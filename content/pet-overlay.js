(() => {
  let pet;
  let position;
  let mounted;

  function mount(sprite, initialPosition, onMove) {
    const host = document.createElement("div");
    host.dataset.gwcPet = "";
    const shadow = host.attachShadow({mode: "open"});
    const styles = new CSSStyleSheet();
    styles.replaceSync(`
      :host {
        all: initial;
        position: fixed;
        z-index: 900;
        right: max(12px, 2vw, env(safe-area-inset-right));
        bottom: max(52px, env(safe-area-inset-bottom));
        display: block;
        pointer-events: none;
      }
      button {
        display: block;
        padding: 0;
        border: 0;
        border-radius: 8px;
        background: transparent;
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
        user-select: none;
      }
      button[data-grabbed] { cursor: grabbing; }
      button:focus-visible { outline: 2px solid #7797ec; outline-offset: 2px; }
      canvas { display: block; width: clamp(65px, 10vw, 108px); height: auto; pointer-events: none; }
      @media print { :host { display: none; } }
    `);
    shadow.adoptedStyleSheets = [styles];
    const handle = document.createElement("button");
    handle.type = "button";
    handle.setAttribute("aria-label", document.documentElement.lang.toLowerCase().startsWith("ja")
      ? "Codex ペット。ドラッグまたは矢印キーで移動。Escape で元の位置に戻す。"
      : "Codex pet. Drag or use the arrow keys to move. Escape resets its position.");
    handle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight Escape");
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    handle.append(canvas);
    shadow.append(handle);
    document.body.append(host);

    const player = playPet(canvas, sprite);
    const controller = new AbortController();
    const {signal} = controller;
    let placed = initialPosition;
    let drag;
    let chatAnimation = "idle";

    function updateAnimation() {
      player.setAnimation(drag?.animation ?? chatAnimation);
    }

    const stopWatching = watchPetChat(animation => {
      chatAnimation = animation;
      updateAnimation();
    });

    function limits() {
      const rect = host.getBoundingClientRect();
      return {
        x: Math.max(0, document.documentElement.clientWidth - rect.width),
        y: Math.max(0, document.documentElement.clientHeight - rect.height)
      };
    }

    function placeAt(x, y, max = limits()) {
      const left = Math.min(max.x, Math.max(0, x));
      const top = Math.min(max.y, Math.max(0, y));
      Object.assign(host.style, {left: `${left}px`, top: `${top}px`, right: "auto", bottom: "auto"});
      return {x: max.x ? left / max.x : 0, y: max.y ? top / max.y : 0};
    }

    function restorePosition() {
      if (drag) return;
      if (placed && Number.isFinite(placed.x) && Number.isFinite(placed.y)) {
        const max = limits();
        placeAt(placed.x * max.x, placed.y * max.y, max);
      } else {
        Object.assign(host.style, {left: "", top: "", right: "", bottom: ""});
      }
    }

    function save(value) {
      placed = value;
      onMove(value);
    }

    handle.addEventListener("pointerdown", event => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      handle.focus({preventScroll: true});
      const {left, top} = host.getBoundingClientRect();
      drag = {id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, left, top};
      handle.setAttribute("data-grabbed", "");
      handle.setPointerCapture(event.pointerId);
    }, {signal});

    handle.addEventListener("pointermove", event => {
      if (event.pointerId !== drag?.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.position && Math.hypot(dx, dy) < 4) return;
      drag.position = placeAt(drag.left + dx, drag.top + dy);
      if (event.clientX !== drag.lastX) {
        drag.animation = event.clientX > drag.lastX ? "running-right" : "running-left";
        drag.lastX = event.clientX;
        updateAnimation();
      }
    }, {signal});

    function endDrag(event) {
      if (event.pointerId !== drag?.id) return;
      const completed = drag;
      drag = null;
      handle.removeAttribute("data-grabbed");
      if (event.type === "pointerup" && completed.position) save(completed.position);
      restorePosition();
      updateAnimation();
    }

    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
      handle.addEventListener(name, endDrag, {signal});
    }
    handle.addEventListener("keydown", event => {
      const offsets = {ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16]};
      const offset = offsets[event.key];
      if (!offset && event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (drag) {
        if (event.key === "Escape") handle.releasePointerCapture(drag.id);
        return;
      }
      if (offset) {
        const {left, top} = host.getBoundingClientRect();
        save(placeAt(left + offset[0], top + offset[1]));
      } else {
        save(null);
        restorePosition();
      }
    }, {signal});

    window.addEventListener("resize", restorePosition, {signal});
    restorePosition();
    return {
      data: sprite.data,
      setPosition(next) {
        placed = next;
        restorePosition();
      },
      remove() {
        controller.abort();
        stopWatching();
        player.stop();
        host.remove();
      }
    };
  }

  function refresh() {
    const sprite = petSprite(pet);
    if (!geminiChatRoute() || !pet?.visible || !sprite) {
      mounted?.remove();
      mounted = null;
    } else if (mounted?.data === sprite.data) {
      mounted.setPosition(position);
    } else {
      mounted?.remove();
      mounted = mount(sprite, position, next => {
        position = next;
        chrome.storage.local.set({[petPositionKey]: next})
          .catch(error => console.warn("Could not save the Codex Pet position", error));
      });
    }
  }

  const receivedChanges = new Set();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (Object.hasOwn(changes, petStorageKey)) {
      receivedChanges.add(petStorageKey);
      pet = changes[petStorageKey].newValue;
    }
    if (Object.hasOwn(changes, petPositionKey)) {
      receivedChanges.add(petPositionKey);
      position = changes[petPositionKey].newValue;
    }
    if (Object.hasOwn(changes, petStorageKey) || Object.hasOwn(changes, petPositionKey)) refresh();
  });
  chrome.storage.local.get([petStorageKey, petPositionKey]).then(result => {
    if (!receivedChanges.has(petStorageKey)) pet = result[petStorageKey];
    if (!receivedChanges.has(petPositionKey)) position = result[petPositionKey];
    refresh();
  }).catch(error => console.warn("Could not read the Codex Pet", error));
  navigation.addEventListener("currententrychange", refresh);
})();
