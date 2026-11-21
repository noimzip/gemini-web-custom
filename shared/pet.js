const petStorageKey = "codexPet";
const petPositionKey = "codexPetPosition";
const petFrame = {width: 192, height: 208, columns: 8};

const petAnimations = {
  idle: {row: 0, durations: [280, 110, 110, 140, 140, 320]},
  "running-right": {row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220]},
  "running-left": {row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220]},
  failed: {row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240]},
  waiting: {row: 6, durations: [150, 150, 150, 150, 150, 260]},
  running: {row: 7, durations: [120, 120, 120, 120, 120, 220]},
  review: {row: 8, durations: [150, 150, 150, 150, 150, 280]}
};

function petSprite(pet) {
  if (pet?.atlas?.data) return pet.atlas;
  if (pet?.idleStrip) return {data: pet.idleStrip, type: "image/png", animations: ["idle"]};
  return null;
}

function playPet(canvas, sprite) {
  const {width, height} = petFrame;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  const available = new Set(sprite.animations);
  let animation = petAnimations.idle;
  let sheet;
  let frame = 0;
  let timer;

  function paint() {
    clearTimeout(timer);
    if (!sheet || document.hidden) return;
    if (motion.matches) frame = 0;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sheet, frame * width, animation.row * height, width, height, 0, 0, width, height);
    if (!motion.matches) {
      timer = setTimeout(() => {
        frame = (frame + 1) % animation.durations.length;
        paint();
      }, animation.durations[frame]);
    }
  }

  async function load() {
    // Decode the local sprite without asking Gemini to load an image URL.
    const bytes = Uint8Array.from(atob(sprite.data), char => char.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], {type: sprite.type}));
    if (controller.signal.aborted) {
      bitmap.close();
      return;
    }
    sheet = bitmap;
    paint();
  }

  motion.addEventListener("change", paint, {signal: controller.signal});
  document.addEventListener("visibilitychange", paint, {signal: controller.signal});
  load().catch(error => console.warn("Could not display the Codex Pet", error));

  return {
    setAnimation(name) {
      const next = available.has(name) ? petAnimations[name] : petAnimations.idle;
      if (next === animation) return;
      animation = next;
      frame = 0;
      paint();
    },
    stop() {
      controller.abort();
      clearTimeout(timer);
      sheet?.close();
    }
  };
}
