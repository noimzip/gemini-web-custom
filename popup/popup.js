(() => {
  const japanese = navigator.language.toLowerCase().startsWith("ja");
  const labels = japanese ? {
    choose: "ファイルを選択", remove: "削除", visible: "Gemini に表示", preview: "プレビュー",
    hint: "Codex Pets の PNG または WebP スプライトシートを選択してください。",
    imported: "ペットを読み込みました。", removed: "読み込んだペットを削除しました。",
    format: "20 MiB 以下の PNG または WebP を選択してください。",
    size: "1536 × 1872（v1）または 1536 × 2288（v2）のスプライトシートが必要です。",
    idle: "スプライトシートの先頭行に待機アニメーションの 6 コマが必要です。",
    invalid: "画像を読み込めませんでした。", storage: "ペットの設定にアクセスできませんでした。"
  } : {
    choose: "Choose file", remove: "Remove", visible: "Show in Gemini", preview: "Preview",
    hint: "Choose a Codex Pets sprite sheet in PNG or WebP format.",
    imported: "Pet imported.", removed: "Pet removed.",
    format: "Choose a PNG or WebP file up to 20 MiB.",
    size: "Choose a 1536 × 1872 (v1) or 1536 × 2288 (v2) sprite sheet.",
    idle: "The first row needs six idle animation frames.",
    invalid: "The image could not be read.", storage: "Could not access the pet settings."
  };
  document.documentElement.lang = japanese ? "ja" : "en";
  for (const node of document.querySelectorAll("[data-label]")) node.textContent = labels[node.dataset.label];

  const petSection = document.querySelector("#pet");
  const preview = document.querySelector("#preview");
  const name = document.querySelector("#name");
  const choose = document.querySelector("#choose");
  const fileInput = document.querySelector("#file");
  const remove = document.querySelector("#remove");
  const visible = document.querySelector("#visible");
  const status = document.querySelector("#status");
  petSection.setAttribute("aria-label", labels.preview);

  let pet;
  let stopPreview;
  let previewStrip;

  function message(text, error = false) {
    status.textContent = text;
    status.toggleAttribute("data-error", error);
  }

  function render() {
    petSection.hidden = !pet;
    remove.hidden = !pet;
    name.textContent = pet?.name ?? "";
    name.title = name.textContent;
    visible.checked = Boolean(pet?.visible);
    if (pet?.idleStrip !== previewStrip) {
      stopPreview?.();
      previewStrip = pet?.idleStrip;
      stopPreview = previewStrip ? playPet(preview, previewStrip) : null;
    }
  }

  function busy(value) {
    choose.disabled = value;
    remove.disabled = value;
    visible.disabled = value;
  }

  async function extractIdle(file) {
    if (file.size > 20 * 1024 ** 2) throw new Error(labels.format);
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte);
    const webp = String.fromCharCode(...header.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...header.slice(8, 12)) === "WEBP";
    if (!png && !webp) throw new Error(labels.format);

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(labels.invalid);
    }
    try {
      if (bitmap.width !== 1536 || ![1872, 2288].includes(bitmap.height)) throw new Error(labels.size);
      const {width, height, count} = petFrame;
      const strip = document.createElement("canvas");
      strip.width = width * count;
      strip.height = height;
      const ctx = strip.getContext("2d", {willReadFrequently: true});
      ctx.drawImage(bitmap, 0, 0, strip.width, height, 0, 0, strip.width, height);

      for (let frame = 0; frame < count; frame++) {
        const {data} = ctx.getImageData(frame * width, 0, width, height);
        if (!data.some((alpha, index) => index % 4 === 3 && alpha > 0)) throw new Error(labels.idle);
      }
      // Keeping the idle strip makes both supported atlas sizes fit in Chrome's local storage quota.
      return strip.toDataURL("image/png").split(",", 2)[1];
    } finally {
      bitmap.close();
    }
  }

  choose.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files;
    fileInput.value = "";
    if (!file) return;
    busy(true);
    message("");
    try {
      const idleStrip = await extractIdle(file);
      const next = {idleStrip, name: file.name, visible: true};
      try {
        await chrome.storage.local.set({[petStorageKey]: next});
      } catch {
        throw new Error(labels.storage);
      }
      pet = next;
      render();
      message(labels.imported);
    } catch (error) {
      message(error.message, true);
    } finally {
      busy(false);
    }
  });

  visible.addEventListener("change", async () => {
    const next = {...pet, visible: visible.checked};
    busy(true);
    message("");
    try {
      await chrome.storage.local.set({[petStorageKey]: next});
      pet = next;
    } catch {
      message(labels.storage, true);
    } finally {
      render();
      busy(false);
    }
  });

  remove.addEventListener("click", async () => {
    busy(true);
    try {
      await chrome.storage.local.remove(petStorageKey);
      pet = null;
      render();
      message(labels.removed);
      busy(false);
      choose.focus();
    } catch {
      message(labels.storage, true);
      busy(false);
    }
  });

  chrome.storage.local.get(petStorageKey).then(result => {
    pet = result[petStorageKey];
    render();
  }).catch(() => message(labels.storage, true)).finally(() => busy(false));
})();
