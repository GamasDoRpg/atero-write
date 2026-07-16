"use strict";

(function attachAteroWriteCore(globalObject) {
  const SCHEMA_VERSION = 2;
  const WORKSPACE_FORMAT = "atero-write-workspace";
  const DOCUMENT_FORMAT = "atero-write-document";

  function createId(prefix = "item") {
    if (globalObject?.crypto?.randomUUID) return `${prefix}-${globalObject.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function clone(value, fallback = null) {
    try {
      return typeof structuredClone === "function"
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
    } catch {
      return fallback;
    }
  }

  function safeDate(value, fallback = new Date().toISOString()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
  }

  function cleanTitle(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Documento sem título";
  }

  function normalizeDocument(input = {}, options = {}) {
    const now = new Date().toISOString();
    const source = isPlainObject(input) ? input : {};
    const preserveId = options.preserveId !== false;
    const id = preserveId && typeof source.id === "string" && source.id.trim()
      ? source.id.trim()
      : createId("document");

    return {
      schemaVersion: SCHEMA_VERSION,
      id,
      projectId: typeof source.projectId === "string" && source.projectId.trim()
        ? source.projectId.trim()
        : null,
      type: source.type === "screenplay" ? "screenplay" : "document",
      name: cleanTitle(source.name ?? source.title),
      content: typeof source.content === "string" ? source.content : "",
      editorSettings: isPlainObject(source.editorSettings)
        ? clone(source.editorSettings, {})
        : {},
      screenplaySettings: isPlainObject(source.screenplaySettings)
        ? clone(source.screenplaySettings, {})
        : {},
      createdAt: safeDate(source.createdAt, now),
      updatedAt: safeDate(source.updatedAt, now),
      revision: Number.isInteger(source.revision) && source.revision >= 0
        ? source.revision
        : 0,
      metadata: isPlainObject(source.metadata) ? clone(source.metadata, {}) : {}
    };
  }

  function validateDocument(value) {
    const errors = [];
    if (!isPlainObject(value)) return { valid: false, errors: ["O documento não é um objeto válido."] };
    if (typeof value.id !== "string" || !value.id.trim()) errors.push("ID ausente.");
    if (typeof value.name !== "string") errors.push("Nome inválido.");
    if (typeof value.content !== "string") errors.push("Conteúdo inválido.");
    if (value.editorSettings != null && !isPlainObject(value.editorSettings)) errors.push("Configurações do editor inválidas.");
    if (value.screenplaySettings != null && !isPlainObject(value.screenplaySettings)) errors.push("Configurações de roteiro inválidas.");
    return { valid: errors.length === 0, errors };
  }

  function normalizeVersion(value = {}, documentId = null) {
    const now = new Date().toISOString();
    return {
      id: typeof value.id === "string" && value.id ? value.id : createId("version"),
      documentId: typeof value.documentId === "string" && value.documentId
        ? value.documentId
        : documentId,
      name: cleanTitle(value.name),
      content: typeof value.content === "string" ? value.content : "",
      settings: isPlainObject(value.settings) ? clone(value.settings, {}) : {},
      screenplaySettings: isPlainObject(value.screenplaySettings)
        ? clone(value.screenplaySettings, {})
        : {},
      createdAt: safeDate(value.createdAt, now)
    };
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function plainTextToHTML(text) {
    const normalized = String(text ?? "").replace(/\r\n?/g, "\n");
    if (!normalized) return "";
    return normalized
      .split(/\n{2,}/)
      .map(block => `<p>${escapeHTML(block).replaceAll("\n", "<br>")}</p>`)
      .join("");
  }

  function inlineMarkdown(value) {
    return escapeHTML(value)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  }

  function markdownToHTML(markdown) {
    const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    let listType = null;
    let paragraph = [];
    let inCode = false;
    let codeLines = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    };
    const closeList = () => {
      if (listType) output.push(`</${listType}>`);
      listType = null;
    };

    for (const line of lines) {
      if (/^```/.test(line)) {
        flushParagraph();
        closeList();
        if (inCode) {
          output.push(`<pre>${escapeHTML(codeLines.join("\n"))}</pre>`);
          codeLines = [];
        }
        inCode = !inCode;
        continue;
      }
      if (inCode) {
        codeLines.push(line);
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        output.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
        continue;
      }
      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        closeList();
        output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
        continue;
      }
      const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const nextType = ordered ? "ol" : "ul";
        if (listType !== nextType) {
          closeList();
          output.push(`<${nextType}>`);
          listType = nextType;
        }
        output.push(`<li>${inlineMarkdown((ordered || unordered)[1])}</li>`);
        continue;
      }
      paragraph.push(line.trim());
    }

    if (inCode && codeLines.length) output.push(`<pre>${escapeHTML(codeLines.join("\n"))}</pre>`);
    flushParagraph();
    closeList();
    return output.join("");
  }

  const SCREENPLAY_CLASS = {
    normal: "screenplay-normal",
    action: "screenplay-action",
    scene: "screenplay-scene-heading",
    character: "screenplay-character",
    parenthetical: "screenplay-parenthetical",
    dialogue: "screenplay-dialogue",
    transition: "screenplay-transition",
    shot: "screenplay-shot",
    centered: "screenplay-centered"
  };

  function screenplayParagraph(type, text) {
    const safeType = SCREENPLAY_CLASS[type] ? type : "action";
    const classes = safeType === "normal"
      ? SCREENPLAY_CLASS.normal
      : `screenplay-element ${SCREENPLAY_CLASS[safeType]}`;
    return `<p class="${classes}" data-screenplay-type="${safeType}">${escapeHTML(text) || "<br>"}</p>`;
  }

  function fountainToDocument(fountain) {
    const lines = String(fountain ?? "").replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    const titlePage = {};
    let titlePagePhase = true;
    let previousType = "action";

    for (let raw of lines) {
      const line = raw.trimEnd();
      if (titlePagePhase) {
        const meta = line.match(/^([A-Za-zÀ-ÿ ]+):\s*(.*)$/);
        if (meta) {
          titlePage[meta[1].trim().toLowerCase()] = meta[2].trim();
          continue;
        }
        if (!line.trim()) continue;
        titlePagePhase = false;
      }
      if (!line.trim()) {
        previousType = "action";
        continue;
      }
      if (line === "===") {
        output.push('<div class="manual-page-break" contenteditable="false"></div>');
        continue;
      }
      if (/^\.{1}(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.|EST\.)/i.test(line) || /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.|EST\.)/i.test(line)) {
        output.push(screenplayParagraph("scene", line.replace(/^\./, "").toLocaleUpperCase("pt-BR")));
        previousType = "scene";
        continue;
      }
      if (/^>.*<$/.test(line)) {
        output.push(screenplayParagraph("centered", line.slice(1, -1).trim()));
        previousType = "centered";
        continue;
      }
      if (/^[A-ZÀ-Ý0-9 ._'()\-]+:$/.test(line) || /^>/.test(line)) {
        output.push(screenplayParagraph("transition", line.replace(/^>/, "").trim().toLocaleUpperCase("pt-BR")));
        previousType = "transition";
        continue;
      }
      if (/^\(.+\)$/.test(line) && ["character", "dialogue", "parenthetical"].includes(previousType)) {
        output.push(screenplayParagraph("parenthetical", line));
        previousType = "parenthetical";
        continue;
      }
      const uppercaseCandidate = line.replace(/\([^)]*\)$/, "").trim();
      if (
        line.length <= 42 &&
        uppercaseCandidate.length > 0 &&
        uppercaseCandidate === uppercaseCandidate.toLocaleUpperCase("pt-BR") &&
        /[A-ZÀ-Ý]/.test(uppercaseCandidate) &&
        !/[.!?]$/.test(line)
      ) {
        output.push(screenplayParagraph("character", line));
        previousType = "character";
        continue;
      }
      if (["character", "parenthetical", "dialogue"].includes(previousType)) {
        output.push(screenplayParagraph("dialogue", line));
        previousType = "dialogue";
        continue;
      }
      output.push(screenplayParagraph("action", line));
      previousType = "action";
    }

    const title = titlePage.title || titlePage.título || "Roteiro importado";
    return {
      name: cleanTitle(title),
      content: output.join(""),
      screenplaySettings: {
        enabled: true,
        title,
        author: titlePage.author || titlePage.autor || "",
        contact: titlePage.contact || titlePage.contato || "",
        copyright: titlePage.copyright || ""
      }
    };
  }

  function normalizeWorkspaceBackup(payload) {
    if (!isPlainObject(payload)) throw new Error("Backup inválido.");

    if (payload.format === DOCUMENT_FORMAT && isPlainObject(payload.document)) {
      return {
        format: WORKSPACE_FORMAT,
        formatVersion: SCHEMA_VERSION,
        exportedAt: payload.exportedAt || new Date().toISOString(),
        documents: [normalizeDocument(payload.document, { preserveId: true })],
        versions: Array.isArray(payload.versions)
          ? payload.versions.map(item => normalizeVersion(item, payload.document.id))
          : [],
        preferences: [],
        recoveries: []
      };
    }

    if (payload.format !== WORKSPACE_FORMAT || !Array.isArray(payload.documents)) {
      throw new Error("O arquivo não é um backup reconhecido do Atero Write.");
    }

    return {
      format: WORKSPACE_FORMAT,
      formatVersion: SCHEMA_VERSION,
      exportedAt: safeDate(payload.exportedAt),
      documents: payload.documents.map(item => normalizeDocument(item, { preserveId: true })),
      versions: Array.isArray(payload.versions)
        ? payload.versions.map(item => normalizeVersion(item, item.documentId))
        : [],
      preferences: Array.isArray(payload.preferences) ? clone(payload.preferences, []) : [],
      recoveries: Array.isArray(payload.recoveries) ? clone(payload.recoveries, []) : []
    };
  }

  const API = {
    SCHEMA_VERSION,
    WORKSPACE_FORMAT,
    DOCUMENT_FORMAT,
    createId,
    clone,
    cleanTitle,
    normalizeDocument,
    validateDocument,
    normalizeVersion,
    normalizeWorkspaceBackup,
    plainTextToHTML,
    markdownToHTML,
    fountainToDocument,
    escapeHTML
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  globalObject.AteroWriteCore = API;
})(typeof window !== "undefined" ? window : globalThis);
