(() => {
  let pet;
  let host;
  let canvas;
  let stopPlaying;

  function refresh() {
    if (!geminiChatRoute() || !pet?.visible || !pet.idleStrip) {
      stopPlaying?.();
      stopPlaying = null;
      host?.remove();
      host = null;
      return;
    }
    if (!host) {
      host = document.createElement("div");
      host.dataset.gwcPet = "";
      host.setAttribute("aria-hidden", "true");
      const shadow = host.attachShadow({mode: "open"});
      const styles = new CSSStyleSheet();
      styles.replaceSync(`
        :host {
          all: initial;
          position: fixed;
          z-index: 900;
          inset-inline-end: max(12px, 2vw, env(safe-area-inset-right));
          bottom: max(52px, env(safe-area-inset-bottom));
          display: block;
          pointer-events: none;
        }
        canvas { display: block; width: clamp(65px, 10vw, 108px); height: auto; }
        @media print { :host { display: none; } }
      `);
      shadow.adoptedStyleSheets = [styles];
      canvas = document.createElement("canvas");
      shadow.append(canvas);
      document.body.append(host);
    }
    stopPlaying?.();
    stopPlaying = playPet(canvas, pet.idleStrip);
  }

  let receivedChange = false;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !Object.hasOwn(changes, petStorageKey)) return;
    receivedChange = true;
    pet = changes[petStorageKey].newValue;
    refresh();
  });
  chrome.storage.local.get(petStorageKey).then(result => {
    if (receivedChange) return;
    pet = result[petStorageKey];
    refresh();
  }).catch(error => console.warn("Could not read the Codex Pet", error));
  navigation.addEventListener("currententrychange", refresh);
})();
