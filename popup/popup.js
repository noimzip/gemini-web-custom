(() => {
  const japanese = navigator.language.toLowerCase().startsWith("ja");
  const labels = japanese ? {
    choose: "ファイルを選択", remove: "削除", visible: "Gemini に表示", preview: "プレビュー",
    hint: "Codex Pets の PNG または WebP スプライトシートを選択してください。",
    upgrade: "ドラッグ時やチャット中のアニメーションを使うには、元のスプライトシートをもう一度選択してください。",
    imported: "ペットを読み込みました。", removed: "読み込んだペットを削除しました。",
    format: "20 MiB 以下の PNG または WebP を選択してください。",
    size: "1536 × 1872（v1）または 1536 × 2288（v2）のスプライトシートが必要です。",
    idle: "スプライトシートの先頭行に待機アニメーションの 6 コマが必要です。",
    invalid: "画像を読み込めませんでした。", storage: "ペットの設定にアクセスできませんでした。"
  } : {
    choose: "Choose file", remove: "Remove", visible: "Show in Gemini", preview: "Preview",
    hint: "Choose a Codex Pets sprite sheet in PNG or WebP format.",
    upgrade: "Choose the original sprite sheet again to enable drag and chat animations.",
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
  const hint = document.querySelector("#hint");
  const name = document.querySelector("#name");
  const choose = document.querySelector("#choose");
  const fileInput = document.querySelector("#file");
  const remove = document.querySelector("#remove");
  const visible = document.querySelector("#visible");
  const status = document.querySelector("#status");
  petSection.setAttribute("aria-label", labels.preview);

  let pet;
  let previewPlayer;
  let previewData;

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
    hint.textContent = pet?.idleStrip && !pet.atlas ? labels.upgrade : labels.hint;
    const sprite = petSprite(pet);
    if (sprite?.data !== previewData) {
      previewPlayer?.stop();
      previewData = sprite?.data;
      previewPlayer = sprite ? playPet(preview, sprite) : null;
    }
  }

  function busy(value) {
    choose.disabled = value;
    remove.disabled = value;
    visible.disabled = value;
  }

  async function extractAtlas(file) {
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
      const {width, height, columns} = petFrame;
      const atlas = document.createElement("canvas");
      atlas.width = columns * width;
      atlas.height = 9 * height;
      const ctx = atlas.getContext("2d", {willReadFrequently: true});
      ctx.drawImage(bitmap, 0, 0);
      const animations = [];
      for (const [name, {row, durations}] of Object.entries(petAnimations)) {
        const complete = durations.every((_, frame) => {
          const {data} = ctx.getImageData(frame * width, row * height, width, height);
          return data.some((alpha, index) => index % 4 === 3 && alpha > 0);
        });
        if (complete) animations.push(name);
      }
      if (!animations.includes("idle")) throw new Error(labels.idle);

      // Prefer lossless pixels and leave room for settings in Chrome's local storage quota.
      let type = "image/png";
      let data = atlas.toDataURL(type).split(",", 2)[1];
      if (data.length > 9 * 1024 ** 2) {
        type = "image/webp";
        data = atlas.toDataURL(type, 0.94).split(",", 2)[1];
      }
      return {type, data, animations};
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
      const atlas = await extractAtlas(file);
      const next = {atlas, name: file.name, visible: true};
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
