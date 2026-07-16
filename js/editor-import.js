"use strict";

(() => {
  const Core = window.AteroWriteCore;
  const Data = window.AteroWriteData;
  if (!Core || !Data) return;

  const MAMMOTH_PRIMARY = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";
  const MAMMOTH_FALLBACK = "https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js";
  let mammothPromise = null;

  const $ = selector => document.querySelector(selector);

  function downloadJSON(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeFilename(value) {
    return String(value || "documento")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 _.-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "documento";
  }

  function showToast(message, type = "info", timeout = 5200) {
    let host = $("#ateroDataToasts");
    if (!host) {
      host = document.createElement("div");
      host.id = "ateroDataToasts";
      host.className = "atero-data-toasts";
      document.body.append(host);
    }
    const toast = document.createElement("div");
    toast.className = `atero-data-toast is-${type}`;
    toast.textContent = message;
    host.append(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 220);
    }, timeout);
  }

  function sanitizeImportedHTML(html) {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(String(html || ""), "text/html");
    documentNode.querySelectorAll("script, style, iframe, object, embed, form, input, button, textarea, select, meta, link, base, noscript").forEach(node => node.remove());
    documentNode.querySelectorAll("*").forEach(node => {
      [...node.attributes].forEach(attribute => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith("on") || name === "contenteditable" || name === "id") node.removeAttribute(attribute.name);
        if ((name === "href" || name === "src") && value.startsWith("javascript:")) node.removeAttribute(attribute.name);
        if (name === "style") {
          node.style.removeProperty("position");
          node.style.removeProperty("inset");
          node.style.removeProperty("z-index");
          node.style.removeProperty("behavior");
        }
      });
      node.classList.remove("search-hit", "search-hit-current", "screenplay-active-element", "image-selected");
      if (!node.className) node.removeAttribute("class");
    });
    return documentNode.body.innerHTML;
  }

  function titleFromFilename(filename) {
    return Core.cleanTitle(String(filename || "Documento importado").replace(/\.(awrite\.json|docx|html?|md|markdown|txt|fountain|json)$/i, ""));
  }

  async function loadExternalScript(primary, fallback, readyCheck, marker) {
    if (readyCheck()) return;
    const load = source => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-atero-library="${marker}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = source;
      script.async = true;
      script.dataset.ateroLibrary = marker;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
    try { await load(primary); } catch { await load(fallback); }
    if (!readyCheck()) throw new Error(`A biblioteca ${marker} não foi inicializada.`);
  }

  function ensureMammoth() {
    if (window.mammoth?.convertToHtml) return Promise.resolve();
    mammothPromise ||= loadExternalScript(
      MAMMOTH_PRIMARY,
      MAMMOTH_FALLBACK,
      () => Boolean(window.mammoth?.convertToHtml),
      "mammoth"
    );
    return mammothPromise;
  }

  async function readFileAsText(file) {
    return file.text();
  }

  async function parseDOCX(file) {
    await ensureMammoth();
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.convertToHtml(
      { arrayBuffer },
      {
        includeDefaultStyleMap: true,
        styleMap: [
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh"
        ]
      }
    );
    return {
      name: titleFromFilename(file.name),
      content: sanitizeImportedHTML(result.value),
      warnings: result.messages?.map(item => item.message) || []
    };
  }

  async function parseHTML(file) {
    const text = await readFileAsText(file);
    const parsed = new DOMParser().parseFromString(text, "text/html");
    return {
      name: Core.cleanTitle(parsed.querySelector("title")?.textContent || titleFromFilename(file.name)),
      content: sanitizeImportedHTML(parsed.body?.innerHTML || text)
    };
  }

  async function parseMarkdown(file) {
    const text = await readFileAsText(file);
    return { name: titleFromFilename(file.name), content: Core.markdownToHTML(text) };
  }

  async function parseText(file) {
    const text = await readFileAsText(file);
    return { name: titleFromFilename(file.name), content: Core.plainTextToHTML(text) };
  }

  async function parseFountain(file) {
    const text = await readFileAsText(file);
    const documentRecord = Core.fountainToDocument(text);
    return {
      ...documentRecord,
      name: documentRecord.name || titleFromFilename(file.name),
      type: "screenplay"
    };
  }

  async function createImportedDocument(parsed) {
    const now = new Date().toISOString();
    const record = Core.normalizeDocument({
      ...parsed,
      id: null,
      createdAt: now,
      updatedAt: now,
      projectId: null,
      metadata: {
        importedAt: now,
        importedFormat: parsed.importedFormat || "unknown"
      }
    }, { preserveId: false });
    await Data.saveDocument(record);
    location.href = `editor.html?id=${encodeURIComponent(record.id)}`;
  }

  async function parseJSONImport(file, restoreMode) {
    const payload = JSON.parse(await readFileAsText(file));
    const backup = Core.normalizeWorkspaceBackup(payload);

    if (payload.format === Core.DOCUMENT_FORMAT && backup.documents.length === 1) {
      const imported = Core.normalizeDocument(backup.documents[0], { preserveId: false });
      imported.name = `${imported.name} — importado`;
      imported.metadata = { ...(imported.metadata || {}), importedAt: new Date().toISOString() };
      await Data.saveDocument(imported);
      if (backup.versions.length) {
        const importedVersions = backup.versions.map(version => ({
          ...version,
          id: Core.createId("version"),
          documentId: imported.id
        }));
        await Data.saveVersions(imported.id, importedVersions);
      }
      location.href = `editor.html?id=${encodeURIComponent(imported.id)}`;
      return;
    }

    await Data.importWorkspace(backup, { mode: restoreMode });
    showToast(`${backup.documents.length} documento(s) restaurado(s).`, "success");
    setTimeout(() => location.href = "index.html", 700);
  }

  function buildUI() {
    const actions = $(".editor-topbar-actions");
    const exportButton = $("#exportButton");
    if (!actions || $("#dataToolsButton")) return;

    const button = document.createElement("button");
    button.className = "editor-icon-button data-tools-button";
    button.id = "dataToolsButton";
    button.type = "button";
    button.title = "Importar e gerenciar backups";
    button.setAttribute("aria-label", "Importar e gerenciar backups");
    button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"></path><path d="M17 14v7M14 18l3 3 3-3"></path></svg>';
    actions.insertBefore(button, exportButton || actions.lastElementChild);

    const dialog = document.createElement("dialog");
    dialog.className = "editor-dialog atero-data-dialog";
    dialog.id = "dataToolsDialog";
    dialog.innerHTML = `
      <div class="dialog-head">
        <div><span class="dialog-label">DADOS</span><h2>Importar e proteger</h2></div>
        <button type="button" data-close-data-dialog>×</button>
      </div>
      <p class="dialog-muted">Importações criam um documento novo. O arquivo atual nunca é substituído silenciosamente.</p>
      <section class="atero-data-section">
        <h3>Importar arquivo</h3>
        <div class="atero-import-drop" id="ateroImportDrop" tabindex="0">
          <strong>Escolher ou soltar um arquivo</strong>
          <span>DOCX, TXT, HTML, Markdown, Fountain ou backup Atero Write</span>
          <input id="ateroImportInput" type="file" accept=".docx,.txt,.html,.htm,.md,.markdown,.fountain,.json,.awrite.json" hidden>
        </div>
        <label class="atero-data-field">Ao restaurar um backup completo
          <select id="ateroRestoreMode"><option value="merge">Mesclar com meus documentos</option><option value="replace">Substituir todos os dados</option></select>
        </label>
        <p class="atero-import-status" id="ateroImportStatus" aria-live="polite"></p>
      </section>
      <section class="atero-data-section">
        <h3>Backups</h3>
        <div class="atero-data-actions-grid">
          <button type="button" data-data-action="current">Baixar documento completo<span>Conteúdo, roteiro, página e versões</span></button>
          <button type="button" data-data-action="workspace">Baixar tudo<span>Todos os documentos e configurações</span></button>
        </div>
      </section>
      <section class="atero-data-section atero-storage-section">
        <h3>Armazenamento local</h3>
        <div class="atero-storage-meter"><span id="ateroStorageBar"></span></div>
        <p id="ateroStorageText">Calculando uso…</p>
      </section>`;
    document.body.append(dialog);

    const input = dialog.querySelector("#ateroImportInput");
    const drop = dialog.querySelector("#ateroImportDrop");
    const status = dialog.querySelector("#ateroImportStatus");
    const restoreMode = dialog.querySelector("#ateroRestoreMode");

    const updateStorage = async () => {
      const estimate = await Data.checkStoragePressure(true);
      if (!estimate) return;
      const percent = Math.min(100, Math.round(estimate.ratio * 100));
      dialog.querySelector("#ateroStorageBar").style.width = `${percent}%`;
      const usedMB = (estimate.usage / 1024 / 1024).toFixed(1);
      const quotaMB = (estimate.quota / 1024 / 1024).toFixed(0);
      dialog.querySelector("#ateroStorageText").textContent = `${usedMB} MB usados de aproximadamente ${quotaMB} MB (${percent}%).`;
    };

    const handleFile = async file => {
      if (!file) return;
      status.className = "atero-import-status is-working";
      status.textContent = `Importando ${file.name}…`;
      try {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".awrite.json") || lower.endsWith(".json")) {
          if (restoreMode.value === "replace") {
            const confirmed = confirm("Isso substituirá todos os documentos locais. Um backup completo é altamente recomendado. Continuar?");
            if (!confirmed) {
              status.textContent = "Restauração cancelada.";
              return;
            }
          }
          await parseJSONImport(file, restoreMode.value);
          return;
        }
        let parsed;
        if (lower.endsWith(".docx")) parsed = await parseDOCX(file);
        else if (/\.html?$/.test(lower)) parsed = await parseHTML(file);
        else if (/\.(md|markdown)$/.test(lower)) parsed = await parseMarkdown(file);
        else if (lower.endsWith(".fountain")) parsed = await parseFountain(file);
        else if (lower.endsWith(".txt")) parsed = await parseText(file);
        else throw new Error("Formato de arquivo não reconhecido.");
        parsed.importedFormat = lower.split(".").pop();
        status.className = "atero-import-status is-success";
        status.textContent = "Arquivo interpretado. Abrindo o novo documento…";
        await createImportedDocument(parsed);
      } catch (error) {
        console.error("Falha ao importar:", error);
        status.className = "atero-import-status is-error";
        status.textContent = error.message || "Não foi possível importar este arquivo.";
      } finally {
        input.value = "";
      }
    };

    button.addEventListener("click", async () => {
      dialog.showModal();
      await updateStorage();
    });
    dialog.querySelector("[data-close-data-dialog]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    drop.addEventListener("click", () => input.click());
    drop.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") input.click(); });
    input.addEventListener("change", () => handleFile(input.files?.[0]));
    ["dragenter", "dragover"].forEach(name => drop.addEventListener(name, event => {
      event.preventDefault();
      drop.classList.add("is-dragging");
    }));
    ["dragleave", "drop"].forEach(name => drop.addEventListener(name, event => {
      event.preventDefault();
      drop.classList.remove("is-dragging");
    }));
    drop.addEventListener("drop", event => handleFile(event.dataTransfer?.files?.[0]));

    dialog.addEventListener("click", async event => {
      const action = event.target.closest("[data-data-action]")?.dataset.dataAction;
      if (!action) return;
      try {
        window.AteroWriteEditor?.saveNow?.();
        if (action === "workspace") {
          const payload = await Data.exportWorkspace();
          downloadJSON(payload, `atero-write-backup-${new Date().toISOString().slice(0, 10)}.awrite.json`);
        } else {
          const record = window.AteroWriteEditor?.getCurrentDocument?.();
          if (!record) throw new Error("Documento atual não encontrado.");
          const payload = {
            format: Core.DOCUMENT_FORMAT,
            formatVersion: Core.SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            document: {
              ...record,
              content: window.AteroWriteEditor?.getCanonicalHTML?.() ?? record.content
            },
            versions: Data.getVersionsSync(record.id)
          };
          downloadJSON(payload, `${safeFilename(record.name)}.awrite.json`);
        }
        showToast("Backup baixado com sucesso.", "success");
      } catch (error) {
        showToast(error.message || "Falha ao gerar backup.", "error");
      }
    });
  }

  function showLockBanner() {
    if ($("#ateroLockBanner")) return;
    const banner = document.createElement("aside");
    banner.id = "ateroLockBanner";
    banner.className = "atero-lock-banner";
    banner.innerHTML = '<div><strong>Este documento está aberto em outra aba</strong><span>Esta aba ficou em modo somente leitura para impedir que uma versão sobrescreva a outra.</span></div><button type="button">Assumir controle nesta aba</button>';
    document.body.append(banner);
    banner.querySelector("button").addEventListener("click", () => {
      const id = window.AteroWriteEditor?.getCurrentDocumentId?.();
      if (!id) return;
      Data.forceDocumentLock(id);
      window.AteroWriteEditor?.setLockReadOnly?.(false);
      banner.remove();
      showToast("Esta aba agora controla o documento.", "success");
    });
  }

  document.addEventListener("atero:lock-conflict", showLockBanner);
  document.addEventListener("atero:lock-lost", showLockBanner);
  document.addEventListener("atero:lock-acquired", () => $("#ateroLockBanner")?.remove());
  document.addEventListener("atero:storage-warning", event => {
    const percent = Math.round((event.detail?.ratio || 0) * 100);
    showToast(`O armazenamento do navegador está ${percent}% ocupado. Baixe um backup completo.`, "warning", 9000);
  });
  document.addEventListener("atero:data-error", event => {
    const quota = event.detail?.error?.name === "QuotaExceededError";
    showToast(quota ? "O armazenamento está cheio. O documento não pôde ser salvo no IndexedDB." : "Ocorreu uma falha ao salvar os dados.", "error", 9000);
  });

  Data.ready.then(buildUI).catch(error => {
    console.warn("Ferramentas de dados iniciadas em modo limitado:", error);
    buildUI();
  });
})();
