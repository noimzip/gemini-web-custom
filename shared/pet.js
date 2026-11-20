const petStorageKey = "codexPet";
const petFrame = {width: 192, height: 208, count: 6, interval: 165};

function playPet(canvas, idleStrip) {
  const {width, height, count, interval} = petFrame;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  let sheet;
  let frame = 0;
  let timer;

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sheet, frame * width, 0, width, height, 0, 0, width, height);
  }

  function updateMotion() {
    clearInterval(timer);
    if (!sheet || document.hidden) return;
    if (motion.matches) {
      frame = 0;
      draw();
    } else {
      timer = setInterval(() => {
        frame = (frame + 1) % count;
        draw();
      }, interval);
    }
  }

  async function load() {
    // Decode the stored PNG without requesting an image URL inside the Gemini page.
    const bytes = Uint8Array.from(atob(idleStrip), char => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], {type: "image/png"}));
    if (controller.signal.aborted) {
      bitmap.close();
      return;
    }
    sheet = bitmap;
    draw();
    updateMotion();
  }

  motion.addEventListener("change", updateMotion, {signal: controller.signal});
  document.addEventListener("visibilitychange", updateMotion, {signal: controller.signal});
  load().catch(error => console.warn("Could not display the Codex Pet", error));

  return () => {
    controller.abort();
    clearInterval(timer);
    sheet?.close();
  };
}
