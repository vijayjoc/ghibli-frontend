
const BACKEND_CONFIG = {
  useBackend: true,
  baseUrl: "https://proud-transformation-production-965a.up.railway.app",
endpoints: {
    textToImage: "/api/v2/generate-from-text",
    imageToImage: "/api/v2/generate",
},
};

const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");

function closeMenu() {
  if (!header || !menuToggle) return;
  header.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

if (header && menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => link.addEventListener("click", closeMenu));

const uploadZone = document.querySelector("#upload-zone");
const imageInput = document.querySelector("#image-input");
const chooseButton = document.querySelector("#choose-button");
const clearButton = document.querySelector("#clear-button");
const sourceFrame = document.querySelector("#source-frame");
const promptInput = document.querySelector("#prompt-input");
const promptCount = document.querySelector("#prompt-count");
const createButton = document.querySelector("#create-button");
const defaultResult = document.querySelector("#default-result");
const resultStatus = document.querySelector("#result-status");
const downloadButton = document.querySelector("#download-button");
const resetResultButton = document.querySelector("#reset-result");
const modeButtons = document.querySelectorAll(".mode-option");
const imageOnlyControls = document.querySelectorAll(".image-only");
const modeTitle = document.querySelector("#mode-title");
const stylePreset = document.querySelector("#style-preset");

let uploadedImageUrl = "";
let uploadedImageFile = null;
let lastCanvasReady = false;
let activeMode = document.querySelector(".mode-option.active")?.dataset.mode || "text";
const defaultSourceMarkup = sourceFrame ? sourceFrame.innerHTML : "";
const defaultResultMarkup = defaultResult ? defaultResult.outerHTML : "";

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setGenerationMode(button.dataset.mode));
});

if (modeButtons.length) {
  setGenerationMode(activeMode, false);
}

if (promptInput && promptCount) {
  promptInput.addEventListener("input", updatePromptCount);
  updatePromptCount();
}

if (chooseButton && imageInput) {
  chooseButton.addEventListener("click", openFilePicker);
}

if (uploadZone && imageInput) {
  uploadZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.remove("is-dragging");
    });
  });

  uploadZone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    if (file) {
      loadImageFile(file);
    }
  });
}

if (imageInput) {
  imageInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) {
      loadImageFile(file);
    }
  });
}

if (clearButton && sourceFrame && imageInput) {
  clearButton.addEventListener("click", () => {
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
    uploadedImageUrl = "";
    uploadedImageFile = null;
    imageInput.value = "";
    sourceFrame.innerHTML = defaultSourceMarkup;
    resetResult();
    setResultStatus("Ready for your first creation.");
  });
}

if (resetResultButton) {
  resetResultButton.addEventListener("click", () => {
    resetResult();
    setResultStatus("Result reset.");
  });
}

if (createButton) {
  createButton.addEventListener("click", async () => {
    createButton.disabled = true;
    createButton.textContent = "Generating...";
    setResultStatus("Painting preview...");

    try {
      await wait(420);
      const style = getSelectedStyle();
      const styleLabel = getStyleLabel(style);
      const prompt = promptInput?.value.trim() || "Create ghibli studio art";

      if (BACKEND_CONFIG.useBackend) {
        if (activeMode === "image" && !uploadedImageFile) {
          setResultStatus("Choose an image first, then generate.");
          return;
        }
        await generateWithBackend({ mode: activeMode, prompt, style, imageFile: uploadedImageFile });
        setResultStatus(`Generated a ${styleLabel} ${activeMode === "image" ? "image-to-image" : "text-to-image"} result.`);
        return;
      }

      if (activeMode === "text") {
        await renderTextToImage(prompt, style);
        setResultStatus(`Generated a ${styleLabel} text-to-image preview.`);
      } else if (uploadedImageUrl) {
        await renderStylizedImage(uploadedImageUrl, style);
        setResultStatus(`Generated a ${styleLabel} image-to-image preview.`);
      } else {
        setResultStatus("Choose an image first, then generate.");
      }
    } catch (error) {
      setResultStatus("The image could not be processed. Try another file.");
    } finally {
      createButton.disabled = false;
      createButton.textContent = "Generate";
    }
  });
}

if (downloadButton) {
  downloadButton.addEventListener("click", () => {
    const canvas = getLiveCanvas();
    if (!canvas || !lastCanvasReady || canvas.hidden) {
      setResultStatus("Create a result before downloading.");
      return;
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "ghibli-ai-preview.png";
    link.click();
    setResultStatus("Download prepared.");
  });
}

function updatePromptCount() {
  const words = promptInput.value.trim().split(/\s+/).filter(Boolean);
  promptCount.textContent = Math.max(words.length, 1);
}

function getSelectedStyle() {
  return stylePreset?.value || "anime";
}

function getStyleLabel(style) {
  return stylePreset?.querySelector(`option[value="${style}"]`)?.textContent || "Anime";
}

function setGenerationMode(mode, shouldReset = true) {
  activeMode = mode;

  modeButtons.forEach((button) => {
    const selected = button.dataset.mode === mode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });

  imageOnlyControls.forEach((control) => {
    control.hidden = mode !== "image";
  });

  if (modeTitle) {
    modeTitle.textContent = mode === "image" ? "Image to Image" : "Text to Image";
  }

  if (createButton) {
    createButton.textContent = "Generate";
  }

  if (shouldReset) {
    resetResult();
    setResultStatus(mode === "image" ? "Choose an image and enter a prompt." : "Enter a prompt and generate your first image.");
  }
}

function openFilePicker() {
  imageInput.click();
}

function setResultStatus(message) {
  if (resultStatus) {
    resultStatus.textContent = message;
  }
}

function loadImageFile(file) {
  if (!file.type.startsWith("image/")) {
    setResultStatus("Please choose an image file.");
    return;
  }

  if (uploadedImageUrl) {
    URL.revokeObjectURL(uploadedImageUrl);
  }

  uploadedImageUrl = URL.createObjectURL(file);
  uploadedImageFile = file;
  const image = new Image();
  image.onload = () => {
    sourceFrame.innerHTML = "";
    image.alt = "Uploaded source preview";
    sourceFrame.appendChild(image);
    setResultStatus("Image loaded. Add a prompt and create.");
  };
  image.src = uploadedImageUrl;
}

function resetResult() {
  const stage = document.querySelector("#result-stage");
  if (!stage || !defaultResultMarkup) return;

  stage.innerHTML = `${defaultResultMarkup}<canvas id="result-canvas" width="960" height="720" hidden></canvas>`;
  lastCanvasReady = false;
}

function getLiveCanvas() {
  return document.querySelector("#result-canvas");
}

function getLiveDefaultResult() {
  return document.querySelector("#default-result");
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function generateWithBackend({ mode, prompt, style, imageFile }) {
  if (mode === "image" && !imageFile) {
    setResultStatus("Choose an image first, then generate.");
    throw new Error("Image file is required for image-to-image generation");
  }

  const endpoint = mode === "image" ? BACKEND_CONFIG.endpoints.imageToImage : BACKEND_CONFIG.endpoints.textToImage;
  const url = endpoint;
  const requestOptions = mode === "image" ? buildImageToImageRequest(prompt, style, imageFile) : buildTextToImageRequest(prompt, style);
// AFTER (fixed):
  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error(`Backend request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  await renderBackendImage({ imageUrl });
}

function buildTextToImageRequest(prompt, style) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      style,
    }),
  };
}

function buildImageToImageRequest(prompt, style, imageFile) {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("style", style);
  formData.append("image", imageFile);

  return {
    method: "POST",
    body: formData,
  };
}

function renderBackendImage(result) {
  return new Promise((resolve, reject) => {
    const imageSource = result.imageUrl || (result.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : "");

    if (!imageSource) {
      reject(new Error("Backend response did not include imageUrl or imageBase64"));
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = getLiveCanvas();
      const placeholder = getLiveDefaultResult();

      if (!canvas || !placeholder) {
        reject(new Error("Missing result canvas"));
        return;
      }

      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
      const cover = getCoverRect(image.width, image.height, width, height);

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, cover.x, cover.y, cover.w, cover.h);
      placeholder.hidden = true;
      canvas.hidden = false;
      lastCanvasReady = true;
      resolve();
    };
    image.onerror = reject;
    image.src = imageSource;
  });
}

function renderStylizedImage(src, style = "anime") {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = getLiveCanvas();
      const placeholder = getLiveDefaultResult();
      const settings = getStyleSettings(style);

      if (!canvas || !placeholder) {
        reject(new Error("Missing result canvas"));
        return;
      }

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const { width, height } = canvas;
      const cover = getCoverRect(image.width, image.height, width, height);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#f4ead4";
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(image, cover.x, cover.y, cover.w, cover.h);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const original = new Uint8ClampedArray(data);

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const warmRed = Math.min(255, red * settings.red + settings.redBoost);
        const warmGreen = Math.min(255, green * settings.green + settings.greenBoost);
        const softBlue = Math.min(255, blue * settings.blue + settings.blueBoost);

        data[index] = posterize(warmRed, settings.step);
        data[index + 1] = posterize(warmGreen, settings.step - 2);
        data[index + 2] = posterize(softBlue, settings.step);
      }

      addInkEdges(data, original, width, height);
      ctx.putImageData(imageData, 0, 0);
      applyStyleOverlay(ctx, width, height, settings);

      ctx.strokeStyle = "rgba(93, 54, 33, 0.24)";
      ctx.lineWidth = settings.borderWidth;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      placeholder.hidden = true;
      canvas.hidden = false;
      lastCanvasReady = true;
      resolve();
    };
    image.onerror = reject;
    image.src = src;
  });
}

function renderTextToImage(prompt, style = "anime") {
  return new Promise((resolve, reject) => {
    const canvas = getLiveCanvas();
    const placeholder = getLiveDefaultResult();

    if (!canvas || !placeholder) {
      reject(new Error("Missing result canvas"));
      return;
    }

    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const settings = getStyleSettings(style);
    const seed = hashText(`${prompt}-${style}`);
    const random = seededRandom(seed);
    const skyTop = pickColor(random, settings.skyTop);
    const skyBottom = pickColor(random, settings.skyBottom);
    const ground = pickColor(random, settings.ground);
    const accent = pickColor(random, settings.accent);

    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, skyTop);
    sky.addColorStop(1, skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 244, 196, 0.9)";
    ctx.beginPath();
    ctx.arc(width * (0.72 + random() * 0.16), height * (0.16 + random() * 0.08), 62, 0, Math.PI * 2);
    ctx.fill();

    drawCloud(ctx, width * 0.18, height * 0.16, 1.1);
    drawCloud(ctx, width * 0.48, height * 0.22, 0.8);

    ctx.fillStyle = "rgba(70, 117, 96, 0.7)";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.58);
    ctx.bezierCurveTo(width * 0.22, height * 0.43, width * 0.38, height * 0.68, width * 0.58, height * 0.52);
    ctx.bezierCurveTo(width * 0.77, height * 0.38, width * 0.88, height * 0.56, width, height * 0.47);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.68);
    ctx.bezierCurveTo(width * 0.2, height * 0.6, width * 0.42, height * 0.75, width * 0.62, height * 0.66);
    ctx.bezierCurveTo(width * 0.78, height * 0.58, width * 0.9, height * 0.7, width, height * 0.63);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    drawCottage(ctx, width * 0.58, height * 0.49, accent);
    drawTree(ctx, width * 0.24, height * 0.57, 1.15);
    drawTree(ctx, width * 0.82, height * 0.6, 0.9);
    drawCharacter(ctx, width * 0.43, height * 0.66, accent);
    applyStyleOverlay(ctx, width, height, settings);

    ctx.strokeStyle = "rgba(93, 54, 33, 0.22)";
    ctx.lineWidth = settings.borderWidth;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    placeholder.hidden = true;
    canvas.hidden = false;
    lastCanvasReady = true;
    resolve();
  });
}

function getStyleSettings(style) {
  const styles = {
    anime: {
      id: "anime",
      red: 1.08,
      green: 1.04,
      blue: 0.94,
      redBoost: 12,
      greenBoost: 8,
      blueBoost: 6,
      step: 30,
      borderWidth: 18,
      blend: "soft-light",
      overlay: "rgba(255, 226, 160, 0.18)",
      skyTop: ["#a8d8d0", "#b7dce8", "#c5dcb9", "#f3d29c"],
      skyBottom: ["#f4d39d", "#f3c6a0", "#e9d8aa", "#d9e3be"],
      ground: ["#557d57", "#6d8a58", "#4f8461", "#7d7b4d"],
      accent: ["#8d2513", "#2c6d82", "#2b8276", "#c8763e"],
    },
    comic: {
      id: "comic",
      red: 1.18,
      green: 1.12,
      blue: 1.08,
      redBoost: 18,
      greenBoost: 10,
      blueBoost: 8,
      step: 42,
      borderWidth: 24,
      blend: "multiply",
      overlay: "rgba(255, 244, 197, 0.12)",
      skyTop: ["#7ec8e3", "#ffdf6c", "#f59ba8", "#9ecf6b"],
      skyBottom: ["#f7a95c", "#f7e16a", "#8bd3dd", "#f4b1c3"],
      ground: ["#4c9a62", "#327d68", "#c58e2f", "#5e77b8"],
      accent: ["#d62f1f", "#146dcc", "#f4b000", "#191919"],
    },
    cinematic: {
      id: "cinematic",
      red: 1.02,
      green: 0.98,
      blue: 0.9,
      redBoost: 8,
      greenBoost: 2,
      blueBoost: 0,
      step: 26,
      borderWidth: 22,
      blend: "multiply",
      overlay: "rgba(35, 28, 24, 0.16)",
      skyTop: ["#748c98", "#8ca7a0", "#a38f78", "#667989"],
      skyBottom: ["#d39f67", "#c88b58", "#bda07a", "#e0b06e"],
      ground: ["#405640", "#5b573b", "#56483b", "#35505b"],
      accent: ["#8d2513", "#214f63", "#a4562e", "#2f3643"],
    },
    cartoon: {
      id: "cartoon",
      red: 1.24,
      green: 1.18,
      blue: 1.12,
      redBoost: 22,
      greenBoost: 18,
      blueBoost: 14,
      step: 46,
      borderWidth: 20,
      blend: "soft-light",
      overlay: "rgba(255, 255, 255, 0.16)",
      skyTop: ["#8fd8ff", "#a7e7c5", "#ffc7da", "#ffd381"],
      skyBottom: ["#ffe28a", "#ffc17a", "#b8f1d1", "#f9b7c8"],
      ground: ["#43a95d", "#70ad47", "#4cae8f", "#b4a446"],
      accent: ["#f24a2e", "#2986ff", "#00a676", "#ff9f1c"],
    },
    watercolor: {
      id: "watercolor",
      red: 1.04,
      green: 1.05,
      blue: 1,
      redBoost: 10,
      greenBoost: 10,
      blueBoost: 12,
      step: 24,
      borderWidth: 14,
      blend: "screen",
      overlay: "rgba(255, 255, 245, 0.16)",
      skyTop: ["#b9d9d6", "#caddeb", "#d5d9b6", "#efd4b6"],
      skyBottom: ["#efd6b2", "#ead6c8", "#dde4c4", "#f3c7b7"],
      ground: ["#78906a", "#7b9b86", "#8a9664", "#6f8f78"],
      accent: ["#b6634b", "#5d89a5", "#739b73", "#c59a54"],
    },
    fantasy: {
      id: "fantasy",
      red: 1.12,
      green: 1.06,
      blue: 1.18,
      redBoost: 14,
      greenBoost: 12,
      blueBoost: 22,
      step: 28,
      borderWidth: 18,
      blend: "soft-light",
      overlay: "rgba(170, 129, 255, 0.18)",
      skyTop: ["#93d4c7", "#a6b7f2", "#c7a9e8", "#89d6ef"],
      skyBottom: ["#f3c47d", "#d7b7f3", "#c7e4a8", "#f0b5cf"],
      ground: ["#4e8f73", "#5c7f9d", "#6d6aa8", "#5a8b5f"],
      accent: ["#7a3fb1", "#2b8276", "#c45c8f", "#335fbb"],
    },
  };

  return styles[style] || styles.anime;
}

function applyStyleOverlay(ctx, width, height, settings) {
  ctx.globalCompositeOperation = settings.blend;
  ctx.fillStyle = settings.overlay;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  if (settings.id === "comic") {
    drawComicTexture(ctx, width, height);
  }

  if (settings.id === "cinematic") {
    drawVignette(ctx, width, height);
  }

  if (settings.id === "watercolor") {
    drawWatercolorTexture(ctx, width, height);
  }
}

function drawComicTexture(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#1d1d1d";
  for (let y = 28; y < height; y += 34) {
    for (let x = 24; x < width; x += 34) {
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawVignette(ctx, width, height) {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.18, width / 2, height / 2, width * 0.68);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(22, 18, 15, 0.34)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawWatercolorTexture(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.12;
  const washes = [
    ["#ffffff", width * 0.18, height * 0.22, 150],
    ["#f3b59d", width * 0.78, height * 0.32, 120],
    ["#8fc5bb", width * 0.42, height * 0.78, 170],
  ];
  washes.forEach(([color, x, y, radius]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawCloud(ctx, x, y, scale) {
  ctx.fillStyle = "rgba(255, 250, 230, 0.78)";
  ctx.beginPath();
  ctx.arc(x, y, 32 * scale, 0, Math.PI * 2);
  ctx.arc(x + 36 * scale, y - 10 * scale, 42 * scale, 0, Math.PI * 2);
  ctx.arc(x + 82 * scale, y, 30 * scale, 0, Math.PI * 2);
  ctx.rect(x - 14 * scale, y, 110 * scale, 28 * scale);
  ctx.fill();
}

function drawCottage(ctx, x, y, accent) {
  ctx.fillStyle = "#f4d49d";
  ctx.fillRect(x, y, 180, 120);

  ctx.fillStyle = "#7b3f25";
  ctx.beginPath();
  ctx.moveTo(x - 24, y + 16);
  ctx.lineTo(x + 90, y - 68);
  ctx.lineTo(x + 204, y + 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.fillRect(x + 72, y + 52, 42, 68);

  ctx.fillStyle = "#78a8a0";
  ctx.fillRect(x + 26, y + 34, 42, 34);
  ctx.fillRect(x + 126, y + 34, 36, 34);
}

function drawTree(ctx, x, y, scale) {
  ctx.fillStyle = "#6f4228";
  ctx.fillRect(x - 12 * scale, y, 24 * scale, 100 * scale);

  ctx.fillStyle = "#477656";
  ctx.beginPath();
  ctx.arc(x, y - 22 * scale, 54 * scale, 0, Math.PI * 2);
  ctx.arc(x - 34 * scale, y + 8 * scale, 38 * scale, 0, Math.PI * 2);
  ctx.arc(x + 36 * scale, y + 12 * scale, 42 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawCharacter(ctx, x, y, accent) {
  ctx.fillStyle = "#d99668";
  ctx.beginPath();
  ctx.arc(x, y - 76, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5a321d";
  ctx.beginPath();
  ctx.arc(x, y - 88, 39, Math.PI, Math.PI * 2);
  ctx.lineTo(x + 36, y - 76);
  ctx.lineTo(x - 36, y - 76);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x - 50, y + 72);
  ctx.quadraticCurveTo(x, y - 42, x + 50, y + 72);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(92, 52, 32, 0.72)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 68);
  ctx.quadraticCurveTo(x, y - 56, x + 16, y - 68);
  ctx.stroke();
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed || 1;
  return () => {
    value = Math.imul(1664525, value) + 1013904223;
    return ((value >>> 0) / 4294967296);
  };
}

function pickColor(random, colors) {
  return colors[Math.floor(random() * colors.length)];
}

function posterize(value, step) {
  return Math.max(0, Math.min(255, Math.round(value / step) * step));
}

function luminance(buffer, index) {
  return buffer[index] * 0.2126 + buffer[index + 1] * 0.7152 + buffer[index + 2] * 0.0722;
}

function addInkEdges(data, original, width, height) {
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      const right = (y * width + x + 1) * 4;
      const down = ((y + 1) * width + x) * 4;
      const diff = Math.abs(luminance(original, index) - luminance(original, right)) + Math.abs(luminance(original, index) - luminance(original, down));

      if (diff > 56) {
        data[index] = Math.round(data[index] * 0.58 + 55 * 0.42);
        data[index + 1] = Math.round(data[index + 1] * 0.58 + 37 * 0.42);
        data[index + 2] = Math.round(data[index + 2] * 0.58 + 27 * 0.42);
      }
    }
  }
}

function getCoverRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const w = sourceWidth * scale;
  const h = sourceHeight * scale;

  return {
    x: (targetWidth - w) / 2,
    y: (targetHeight - h) / 2,
    w,
    h,
  };
}

document.querySelectorAll(".gallery-card").forEach((card) => {
  card.tabIndex = 0;
  card.addEventListener("click", () => useGalleryCard(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      useGalleryCard(card);
    }
  });
});

function useGalleryCard(card) {
  const stage = document.querySelector("#result-stage");
  if (!stage) {
    window.location.href = "create.html";
    return;
  }

  const svg = card.querySelector("svg").cloneNode(true);
  svg.classList.add("result-svg");
  svg.setAttribute("id", "default-result");
  svg.setAttribute("viewBox", "0 0 320 240");

  stage.innerHTML = "";
  stage.appendChild(svg);

  const canvas = document.createElement("canvas");
  canvas.id = "result-canvas";
  canvas.width = 960;
  canvas.height = 720;
  canvas.hidden = true;
  stage.appendChild(canvas);

  lastCanvasReady = false;
  setResultStatus(`${card.dataset.galleryTitle} loaded in result preview.`);
}

document.querySelectorAll(".faq-item button").forEach((button) => {
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    const panel = button.nextElementSibling;
    button.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
  });
});
