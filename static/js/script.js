/* Drishti — frontend logic (vanilla JS) */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const MAX_BYTES = 10 * 1024 * 1024;
  const TYPES = ["image/png", "image/jpeg", "image/webp"];
  const API_URL = "/api/analyze";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };
  const statusEl = $("status");
  const setStatus = (msg, kind = "") => { statusEl.textContent = msg; statusEl.className = "status " + kind; };

  /* ---------- Mobile navigation ---------- */
  const navToggle = $("navToggle"), navMenu = $("navMenu");
  const setNav = (open) => {
    navMenu.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  navToggle.addEventListener("click", () => setNav(!navMenu.classList.contains("open")));
  navMenu.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navMenu.classList.contains("open")) { setNav(false); navToggle.focus(); }
  });

  /* ---------- Text size and contrast ---------- */
  const levels = [90, 100, 115, 130, 150];
  let level = levels.indexOf(Number(store.get("drishti-text")) || 100);
  if (level === -1) level = 1;
  const applyText = () => {
    document.documentElement.style.fontSize = levels[level] + "%";
    $("textLevel").textContent = levels[level] + "%";
    $("textDown").disabled = level === 0;
    $("textUp").disabled = level === levels.length - 1;
    store.set("drishti-text", levels[level]);
  };
  $("textDown").addEventListener("click", () => { level = Math.max(0, level - 1); applyText(); });
  $("textUp").addEventListener("click", () => { level = Math.min(levels.length - 1, level + 1); applyText(); });
  $("textReset").addEventListener("click", () => { level = 1; applyText(); });
  applyText();

  const contrastBtn = $("contrastToggle");
  const applyContrast = (on) => {
    document.body.classList.toggle("hc", on);
    contrastBtn.setAttribute("aria-pressed", String(on));
    $("contrastState").textContent = on ? "On" : "Off";
    store.set("drishti-contrast", on ? "1" : "0");
  };
  contrastBtn.addEventListener("click", () => applyContrast(!document.body.classList.contains("hc")));
  applyContrast(store.get("drishti-contrast") === "1");

  /* ---------- Settings dialog ---------- */
  const dlg = $("settingsDialog");
  $("settingsBtn").addEventListener("click", () => dlg.showModal());
  $("settingsClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => $("settingsBtn").focus());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  const rateSel = $("rateSelect"), voiceSel = $("voiceSelect"), zoomDef = $("zoomDefault");
  rateSel.value = store.get("drishti-rate") || "1";
  zoomDef.value = store.get("drishti-zoom") || "100";
  rateSel.addEventListener("change", () => store.set("drishti-rate", rateSel.value));
  zoomDef.addEventListener("change", () => { store.set("drishti-zoom", zoomDef.value); setZoom(zoomDef.value); });
  voiceSel.addEventListener("change", () => store.set("drishti-voice", voiceSel.value));

  /* ---------- Magnifier ---------- */
  const zoomRange = $("zoomRange"), previewImg = $("previewImg");
  function setZoom(v) {
    zoomRange.value = v;
    previewImg.style.width = v + "%";
    $("zoomOut").textContent = v + "%";
  }
  zoomRange.addEventListener("input", () => setZoom(zoomRange.value));

  /* ---------- Upload ---------- */
  const dropzone = $("dropzone"), fileInput = $("fileInput"), errorEl = $("uploadError");
  const preview = $("preview"), analyzeBtn = $("analyzeBtn");
  let currentFile = null, objectUrl = null;

  const showError = (msg) => { errorEl.textContent = msg; errorEl.hidden = false; };
  const clearError = () => { errorEl.hidden = true; errorEl.textContent = ""; };
  const fmtSize = (b) => (b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB");

  function validate(file) {
    if (!TYPES.includes(file.type)) return "This file type is not supported. Please choose a PNG, JPG or WEBP image.";
    if (file.size > MAX_BYTES) return `This image is ${fmtSize(file.size)}. The limit is 10 MB. Please choose a smaller image.`;
    if (file.size === 0) return "This file is empty. Please choose a different image.";
    return null;
  }

  function showPreview(file, url) {
    previewImg.src = url;
    previewImg.alt = "Preview of your uploaded image: " + file.name;
    $("fileMeta").textContent = `${file.name} (${fmtSize(file.size)})`;
    setZoom(zoomDef.value);
    preview.hidden = false;
  }

  function setFile(file) {
    clearError();
    const problem = validate(file);
    if (problem) { showError(problem); setStatus("The image could not be added.", "err"); return; }
    stopSpeech();
    currentFile = file;
    objectUrl = URL.createObjectURL(file);
    showPreview(file, objectUrl);
    analyzeBtn.disabled = false;
    $("analyzeHelp").textContent = "Ready. Select the button to analyse your image.";
    resetResults();
    setStatus("Image added. Select “Understand this image” to continue.", "ok");
  }

  function removeFile() {
    stopSpeech();
    currentFile = null;
    fileInput.value = "";
    previewImg.removeAttribute("src");
    preview.hidden = true;
    analyzeBtn.disabled = true;
    $("analyzeHelp").textContent = "Add an image first to turn this button on.";
    clearError();
    resetResults();
    setStatus("Image removed. Waiting for an image.");
    $("browseBtn").focus();
  }

  $("browseBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });
  $("removeBtn").addEventListener("click", removeFile);

  $("sampleBtn").addEventListener("click", async () => {
    try {
      const blob = await (await fetch("/static/images/sample-timetable.png")).blob();
      setFile(new File([blob], "sample-timetable.png", { type: "image/png" }));
    } catch { showError("The sample image could not be loaded. Is the Flask server running?"); }
  });

  ["dragenter", "dragover"].forEach((t) => dropzone.addEventListener(t, (e) => { e.preventDefault(); dropzone.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((t) => dropzone.addEventListener(t, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); }));
  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 1) { showError("Please add one image at a time."); return; }
    if (files[0]) setFile(files[0]);
  });
  ["dragover", "drop"].forEach((t) => window.addEventListener(t, (e) => e.preventDefault()));

  /* ---------- Results ---------- */
  const emptyState = $("emptyState"), loading = $("loading"), results = $("results");
  const notice = $("notice"), retryBtn = $("retryBtn");
  const field = (n) => results.querySelector(`[data-field="${n}"]`);
  let current = null; // latest result data

  function resetResults() {
    current = null;
    results.hidden = loading.hidden = notice.hidden = retryBtn.hidden = true;
    emptyState.hidden = false;
    $("speakBtn").disabled = true;
    $("audioHelp").textContent = "Listen turns on after your image is analysed. Voice and speed are in Settings.";
  }

  function renderResults(data) {
    current = data;
    const ai = data.mode === "ai";
    field("description").textContent = data.description || "";
    field("simple").textContent = data.simple || "";
    field("text").textContent = data.text || "No readable text was found in this image.";
    const list = field("info");
    list.replaceChildren(...(data.info || []).map((t) => Object.assign(document.createElement("li"), { textContent: t })));
    $("infoEmpty").hidden = !!(data.info && data.info.length);
    const d = data.details || {};
    const extra = [d.purpose && "Purpose: " + d.purpose, (d.attention || []).length && "Pay attention to: " + d.attention.join("; "),
                   d.uncertainty && "Not certain: " + d.uncertainty].filter(Boolean);
    field("attention").textContent = extra.join("\n");
    $("descBadge").className = "badge " + (ai ? "badge-ai" : "badge-basic");
    $("simpleBadge").className = "badge " + (ai ? "badge-ai" : "badge-basic");
    const note = data.ocr_error || data.notice;
    notice.textContent = note || ""; notice.hidden = !note;
    emptyState.hidden = loading.hidden = retryBtn.hidden = true;
    results.hidden = false;
    $("speakBtn").disabled = !synth;
    $("audioHelp").textContent = "Choose what to read, then select Listen.";
    setStatus(ai ? "Your results are ready." : "Your results are ready. They are OCR-only, with no AI description.", "ok");
    addHistory(data);
  }

  function reportText(d) {
    const det = d.details || {};
    return [
      "DRISHTI REPORT", `Image: ${currentFile ? currentFile.name : "unknown"}`, `Date: ${new Date().toLocaleString()}`,
      `Method: ${d.mode === "ai" ? "AI image understanding + OCR" : "OCR only (no AI description)"}`, "",
      "IMAGE DESCRIPTION" + (d.mode === "ai" ? " (AI-generated)" : " (basic, not AI)"), d.description, "",
      "SIMPLE EXPLANATION", d.simple, "",
      "IMPORTANT INFORMATION", (d.info || []).map((i) => "- " + i).join("\n") || "None found", "",
      det.uncertainty ? "UNCERTAINTY\n" + det.uncertainty + "\n" : "",
      "EXTRACTED TEXT (OCR)", d.text || "None",
    ].join("\n");
  }

  $("copyBtn").addEventListener("click", async () => {
    if (!current) return;
    try { await navigator.clipboard.writeText(reportText(current)); setStatus("Results copied to the clipboard.", "ok"); }
    catch { setStatus("Copying was blocked by the browser. Use Download instead.", "err"); }
  });
  $("downloadBtn").addEventListener("click", () => {
    if (!current) return;
    const url = URL.createObjectURL(new Blob([reportText(current)], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "drishti-report.txt" });
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    setStatus("Report downloaded as drishti-report.txt.", "ok");
  });

  /* Upload with progress (XMLHttpRequest exposes upload progress; fetch does not) */
  function analyzeImage(file, onProgress) {
    return new Promise((resolve, reject) => {
      const body = new FormData();
      body.append("image", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_URL);
      xhr.responseType = "json";
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 && xhr.response
        ? resolve(xhr.response) : reject(new Error((xhr.response && xhr.response.error) || "Image analysis failed.")));
      xhr.onerror = () => reject(new Error("Could not reach the Drishti server. Is it running?"));
      xhr.send(body);
    });
  }

  async function runAnalysis() {
    if (!currentFile) return;
    analyzeBtn.disabled = true; retryBtn.hidden = true;
    emptyState.hidden = results.hidden = notice.hidden = true; loading.hidden = false;
    const label = loading.querySelector("p");
    label.textContent = "Uploading…";
    setStatus("Uploading your image.");
    try {
      const data = await analyzeImage(currentFile, (p) => {
        label.textContent = p < 100 ? `Uploading… ${p}%` : "Reading and understanding your image…";
        if (p === 100) setStatus("Upload finished. Analysing your image. This may take a few seconds.");
      });
      renderResults(data);
    } catch (err) {
      loading.hidden = true; emptyState.hidden = false; retryBtn.hidden = false;
      setStatus(err.message + " You can try again.", "err");
    } finally {
      analyzeBtn.disabled = !currentFile;
    }
  }
  analyzeBtn.addEventListener("click", runAnalysis);
  retryBtn.addEventListener("click", runAnalysis);

  /* ---------- Session history ---------- */
  const history = []; // { file, url, data }
  function addHistory(data) {
    if (!currentFile) return;
    const existing = history.find((h) => h.file === currentFile);
    if (existing) existing.data = data; else history.unshift({ file: currentFile, url: objectUrl, data });
    history.length = Math.min(history.length, 5);
    drawHistory();
  }
  function drawHistory() {
    const ul = $("history");
    ul.replaceChildren(...history.map((h) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.textContent = h.file.name;
      if (h.file === currentFile) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => {
        stopSpeech(); currentFile = h.file; objectUrl = h.url;
        showPreview(h.file, h.url); analyzeBtn.disabled = false; renderResults(h.data); drawHistory();
        setStatus("Showing the earlier result for " + h.file.name + ".", "ok");
      });
      li.append(b); return li;
    }));
    $("historyBox").hidden = history.length === 0;
  }

  /* ---------- Text to speech (Web Speech API) ---------- */
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  const speakBtn = $("speakBtn"), pauseBtn = $("pauseBtn"), stopBtn = $("stopBtn");
  let speechToken = 0;

  function loadVoices() {
    if (!synth) return;
    const voices = synth.getVoices();
    const saved = store.get("drishti-voice") || "";
    voiceSel.replaceChildren(new Option("Automatic", ""),
      ...voices.map((v) => new Option(`${v.name} (${v.lang})`, v.voiceURI)));
    voiceSel.value = voices.some((v) => v.voiceURI === saved) ? saved : "";
    $("voiceHelp").textContent = voices.length ? "" : "No voices were found on this device.";
  }
  if (synth) { loadVoices(); synth.addEventListener("voiceschanged", loadVoices); }
  else {
    $("audioHelp").textContent = "Audio is not supported in this browser. Try Chrome, Edge or Safari.";
    $("voiceHelp").textContent = "Speech is not supported in this browser.";
  }

  function textToRead() {
    if (!current) return "";
    const pick = $("readSelect").value;
    if (pick === "description") return current.description;
    if (pick === "text") return current.text;
    if (pick === "info") return (current.info || []).join(". ");
    return current.simple;
  }
  const chunks = (t) => (t.replace(/\s*\n+\s*/g, ". ").match(/[^.!?]+[.!?]*\s*/g) || [t]).map((s) => s.trim()).filter(Boolean);

  function speechUi(state) { // "idle" | "playing" | "paused"
    document.body.classList.toggle("speaking", state === "playing");
    speakBtn.disabled = state !== "idle" || !current;
    pauseBtn.disabled = state === "idle";
    pauseBtn.textContent = state === "paused" ? "Resume" : "Pause";
    stopBtn.disabled = state === "idle";
  }
  function stopSpeech() {
    speechToken++;
    if (synth) synth.cancel();
    speechUi("idle");
  }

  speakBtn.addEventListener("click", () => {
    const text = textToRead();
    if (!text) { setStatus("There is nothing to read in that section.", "err"); return; }
    synth.cancel();
    const token = ++speechToken, parts = chunks(text);
    const voice = synth.getVoices().find((v) => v.voiceURI === voiceSel.value);
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.rate = Number(rateSel.value);
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      else if (/[\u0900-\u097F]/.test(part)) u.lang = "hi-IN"; // Hindi text: ask for a Hindi voice
      if (i === 0) u.onstart = () => { if (token === speechToken) { speechUi("playing"); setStatus("Reading aloud."); } };
      u.onend = () => { if (token === speechToken && i === parts.length - 1) { speechUi("idle"); setStatus("Finished reading."); } };
      u.onerror = (e) => { if (token === speechToken && e.error !== "interrupted" && e.error !== "canceled") {
        speechUi("idle"); setStatus("Audio could not play. Check your device volume and voices.", "err"); } };
      synth.speak(u);
    });
    speechUi("playing");
  });
  pauseBtn.addEventListener("click", () => {
    if (synth.paused) { synth.resume(); speechUi("playing"); setStatus("Reading aloud."); }
    else { synth.pause(); speechUi("paused"); setStatus("Paused."); }
  });
  stopBtn.addEventListener("click", () => { stopSpeech(); setStatus("Audio stopped."); });
  window.addEventListener("beforeunload", () => synth && synth.cancel());
})();
