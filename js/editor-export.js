"use strict";

/* =========================================================
   ATERO WRITE — EXPORTAÇÃO

   Formatos:
   - PDF gerado e baixado diretamente no navegador
   - DOCX real com docx.js carregado sob demanda
   - HTML autocontido
   - TXT
   - Markdown
   - RTF
   - Backup Atero Write em JSON
   ========================================================= */

(() => {
  const HTML2CANVAS_CDN =
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";

  const FALLBACK_HTML2CANVAS_CDN =
    "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js";

  const JSPDF_CDN =
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";

  const FALLBACK_JSPDF_CDN =
    "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js";

  const DOCX_CDN =
    "https://cdn.jsdelivr.net/npm/docx@9.7.1/dist/index.iife.js";

  const FALLBACK_DOCX_CDN =
    "https://unpkg.com/docx@9.7.1/dist/index.iife.js";

  const STORAGE_DOCUMENTS = "atero_write_documents";

  const DEFAULT_SETTINGS = {
    page: {
      preset: "A4",
      orientation: "portrait",
      width: 794,
      height: 1123,
      color: "#ffffff",
      marginTop: 86,
      marginRight: 82,
      marginBottom: 86,
      marginLeft: 82
    },
    headerFooter: {
      header: "",
      footer: "",
      showPageNumbers: true,
      pageNumberPosition: "footer-center",
      differentFirstPage: false,
      firstHeader: "",
      firstFooter: ""
    }
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const elements = {
    exportButton: $("#exportButton"),
    exportDialog: $("#exportDialog"),
    exportForm: $("#exportForm"),
    exportSubmitButton: $("#exportSubmitButton"),
    exportStatus: $("#exportStatus"),
    exportFormatHelp: $("#exportFormatHelp"),
    exportIncludeTitle: $("#exportIncludeTitle"),
    exportIncludeHeaderFooter: $("#exportIncludeHeaderFooter"),
    exportOpenAfter: $("#exportOpenAfter"),
    title: $("#documentTitle"),
    stage: $("#documentStage"),
    pageModeButton: $("#pageModeButton"),
    flowModeButton: $("#flowModeButton"),
    pagesContainer: $("#pagesContainer"),
    flowEditor: $("#flowEditor"),
    splitEditor: $("#splitEditor")
  };

  const FORMAT_HELP = {
    pdf:
      "Gera e baixa um PDF diretamente, preservando as páginas, imagens, cores, margens, cabeçalho e rodapé.",
    docx:
      "Cria um arquivo Word editável com títulos, estilos, listas, tabelas, imagens, margens, cabeçalho e rodapé.",
    html:
      "Cria uma página HTML autocontida, mantendo formatação e imagens incorporadas.",
    txt:
      "Exporta somente o texto, sem estilos, imagens ou configuração de página.",
    md:
      "Cria um arquivo Markdown com títulos, listas, links, citações, tabelas e imagens.",
    rtf:
      "Cria um arquivo Rich Text Format compatível com Word, LibreOffice e outros editores.",
    fountain:
      "Cria um roteiro em Fountain, formato aberto compatível com editores e ferramentas de roteiro.",
    awrite:
      "Cria um backup completo do Atero Write, incluindo conteúdo e configurações do documento."
  };

  let docxLoadPromise = null;
  let pdfLoadPromise = null;
  let exporting = false;

  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function safeJSONParse(value, fallback) {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function deepMerge(target, source) {
    const output = structuredClone(target);

    if (!source || typeof source !== "object") {
      return output;
    }

    Object.keys(source).forEach(key => {
      const sourceValue = source[key];
      const outputValue = output[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        outputValue &&
        typeof outputValue === "object" &&
        !Array.isArray(outputValue)
      ) {
        output[key] = deepMerge(outputValue, sourceValue);
      } else {
        output[key] = structuredClone(sourceValue);
      }
    });

    return output;
  }

  function currentDocumentId() {
    return new URLSearchParams(location.search).get("id");
  }

  function loadDocumentRecord() {
    const id = currentDocumentId();
    const managed = window.AteroWriteData?.getDocumentSync?.(id);
    if (managed) return managed;

    const documents = safeJSONParse(
      localStorage.getItem(STORAGE_DOCUMENTS),
      []
    );

    if (!Array.isArray(documents)) {
      return null;
    }

    return documents.find(item => item.id === id) || null;
  }

  function getDocumentSettings() {
    const record = loadDocumentRecord();
    const settings = deepMerge(
      DEFAULT_SETTINGS,
      record?.editorSettings || {}
    );

    const rootStyles = getComputedStyle(document.documentElement);

    const readNumberVariable = (name, fallback) => {
      const value = parseFloat(rootStyles.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };

    settings.page.width = readNumberVariable(
      "--editor-page-width",
      settings.page.width
    );

    settings.page.height = readNumberVariable(
      "--editor-page-height",
      settings.page.height
    );

    settings.page.marginTop = readNumberVariable(
      "--editor-margin-top",
      settings.page.marginTop
    );

    settings.page.marginRight = readNumberVariable(
      "--editor-margin-right",
      settings.page.marginRight
    );

    settings.page.marginBottom = readNumberVariable(
      "--editor-margin-bottom",
      settings.page.marginBottom
    );

    settings.page.marginLeft = readNumberVariable(
      "--editor-margin-left",
      settings.page.marginLeft
    );

    const pageColor = rootStyles
      .getPropertyValue("--editor-page-color")
      .trim();

    if (pageColor) {
      settings.page.color = pageColor;
    }

    const firstPage = $(".editor-page");
    const header = firstPage?.querySelector(".page-header")?.textContent;
    const footer = firstPage?.querySelector(".page-footer")?.textContent;

    if (
      header &&
      !/^\s*\d+\s*$/.test(header)
    ) {
      settings.headerFooter.header = header.trim();
    }

    if (
      footer &&
      !/^\s*\d+\s*$/.test(footer)
    ) {
      settings.headerFooter.footer = footer.trim();
    }

    return settings;
  }

  function normalizeFilename(value) {
    const normalized = (value || "Documento sem título")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim();

    return normalized || "Documento sem título";
  }

  function documentName() {
    return normalizeFilename(
      elements.title?.value ||
      loadDocumentRecord()?.name ||
      "Documento sem título"
    );
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";

    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function setExportStatus(message, state = "idle") {
    if (!elements.exportStatus) return;

    elements.exportStatus.textContent = message;
    elements.exportStatus.dataset.state = state;
  }

  function setExportBusy(busy) {
    exporting = busy;

    if (elements.exportSubmitButton) {
      elements.exportSubmitButton.disabled = busy;
      elements.exportSubmitButton.textContent = busy
        ? "Preparando…"
        : "Exportar";
    }

    elements.exportDialog?.classList.toggle(
      "is-exporting",
      busy
    );
  }

  function wait(milliseconds) {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }

  function nextFrame() {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  }

  function requestEditorSave() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "s",
        code: "KeyS",
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
    );
  }

  function cleanContentClone(root) {
    const clone = root.cloneNode(true);

    clone.querySelectorAll(".search-hit").forEach(mark => {
      mark.replaceWith(
        document.createTextNode(mark.textContent || "")
      );
    });

    clone
      .querySelectorAll(
        "[data-temporary], .image-toolbar, .image-resize-handle"
      )
      .forEach(node => node.remove());

    clone
      .querySelectorAll(".is-image-selected")
      .forEach(node => node.classList.remove("is-image-selected"));

    clone
      .querySelectorAll("[contenteditable]")
      .forEach(node => node.removeAttribute("contenteditable"));

    clone.querySelectorAll("[spellcheck]").forEach(node => {
      node.removeAttribute("spellcheck");
    });

    clone.normalize();
    return clone;
  }

  function getCurrentContentHTML() {
    const active = document.activeElement;

    if (
      elements.splitEditor &&
      !elements.splitEditor.hidden &&
      (elements.splitEditor === active ||
        elements.splitEditor.contains(active))
    ) {
      return cleanContentClone(elements.splitEditor).innerHTML;
    }

    if (
      elements.stage?.classList.contains("view-flow") &&
      elements.flowEditor
    ) {
      return cleanContentClone(elements.flowEditor).innerHTML;
    }

    const pageBodies = $$(".page-body");

    if (pageBodies.length) {
      const wrapper = document.createElement("div");

      pageBodies.forEach(body => {
        const clone = cleanContentClone(body);
        [...clone.childNodes].forEach(node => wrapper.append(node));
      });

      return wrapper.innerHTML;
    }

    return loadDocumentRecord()?.content || "";
  }

  function plainTextFromHTML(html) {
    const container = document.createElement("div");
    container.innerHTML = html;

    container.querySelectorAll("br").forEach(br => {
      br.replaceWith(document.createTextNode("\n"));
    });

    container
      .querySelectorAll(
        "p, div, h1, h2, h3, h4, h5, h6, blockquote, pre, li, tr, hr"
      )
      .forEach(element => {
        element.append(document.createTextNode("\n"));
      });

    return (container.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function stripTemporaryAttributes(html) {
    const container = document.createElement("div");
    container.innerHTML = html;

    container.querySelectorAll("*").forEach(element => {
      [...element.attributes].forEach(attribute => {
        if (
          attribute.name.startsWith("data-temporary") ||
          attribute.name === "contenteditable" ||
          attribute.name === "spellcheck"
        ) {
          element.removeAttribute(attribute.name);
        }
      });
    });

    return container.innerHTML;
  }

  /* =======================================================
     HTML AUTOCONTIDO
     ======================================================= */

  function documentContentCSS(settings) {
    const page = settings.page;

    return `
      :root {
        --page-width: ${page.width}px;
        --page-height: ${page.height}px;
        --margin-top: ${page.marginTop}px;
        --margin-right: ${page.marginRight}px;
        --margin-bottom: ${page.marginBottom}px;
        --margin-left: ${page.marginLeft}px;
        --page-color: ${page.color || "#ffffff"};
      }

      * { box-sizing: border-box; }

      html { color-scheme: light; }

      body {
        margin: 0;
        color: #151515;
        background: #ececec;
        font-family: Arial, sans-serif;
      }

      .document-shell {
        width: min(100%, var(--page-width));
        min-height: var(--page-height);
        margin: 36px auto;
        padding: var(--margin-top) var(--margin-right)
          var(--margin-bottom) var(--margin-left);
        background: var(--page-color);
        box-shadow: 0 18px 55px rgba(20,20,20,.13);
      }

      .document-title {
        margin: 0 0 30px;
        font-size: 1.8rem;
        line-height: 1.15;
      }

      p, div:not(.text-box):not(.columns-block) {
        margin-top: 0;
        margin-bottom: 8pt;
      }

      h1 { font-size: 2em; line-height: 1.15; }
      h2 { font-size: 1.55em; line-height: 1.2; }
      h3 { font-size: 1.2em; line-height: 1.3; }

      blockquote, .citation-block {
        margin: 1.15em 0;
        padding: .75em 1em;
        color: #555;
        background: #fafafa;
        border-left: 3px solid #e63946;
      }

      pre {
        padding: 13px;
        overflow-x: auto;
        background: #f5f5f5;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        white-space: pre-wrap;
      }

      img { max-width: 100%; height: auto; }

      .document-figure {
        max-width: 100%;
        margin-top: 1em;
        margin-bottom: 1em;
      }

      .document-figure > img {
        display: block;
        width: 100%;
      }

      figcaption, .table-caption {
        margin-top: 7px;
        color: #777;
        font-size: 9pt;
        font-style: italic;
        text-align: center;
      }

      table {
        width: 100%;
        margin: 1em 0;
        border-collapse: collapse;
        table-layout: fixed;
      }

      th, td {
        padding: 6px 8px;
        border: 1px solid #cfcfcf;
        vertical-align: top;
      }

      th { background: #f3f3f3; }

      .text-box {
        min-width: 150px;
        min-height: 70px;
        margin: 12px 0;
        padding: 12px;
        border: 1px solid #cfcfcf;
      }

      .columns-block {
        column-gap: 28px;
        column-rule: 1px solid #e4e4e4;
      }

      .manual-page-break {
        height: 0;
        border: 0;
        break-after: page;
        page-break-after: always;
      }

      .auto-toc {
        margin: 1em 0;
        padding: 14px;
        background: #fafafa;
        border: 1px solid #dedede;
      }

      .footnotes {
        margin-top: 28px;
        padding-top: 10px;
        border-top: 1px solid #bdbdbd;
        font-size: 9pt;
      }

      .screenplay-element {
        position: relative;
        font-family: "Courier New", Courier, monospace;
        font-size: 12pt;
        line-height: 1.05;
      }

      .screenplay-action { margin: 0 0 12pt; }
      .screenplay-scene-heading { margin: 12pt 0 6pt; padding: 0 34px; font-weight: 700; text-transform: uppercase; }
      .screenplay-character { margin: 12pt 1.15in 0 2.2in; text-transform: uppercase; }
      .screenplay-parenthetical { margin: 0 1.65in 0 1.55in; }
      .screenplay-dialogue { margin: 0 1.45in 12pt .95in; }
      .screenplay-transition { margin: 12pt 0 12pt 3.35in; text-align: right; text-transform: uppercase; }
      .screenplay-shot { margin: 12pt 0 6pt; font-weight: 700; text-transform: uppercase; }
      .screenplay-centered { margin: 12pt 0; text-align: center; }

      .screenplay-scene-heading[data-scene-number]::before,
      .screenplay-scene-heading[data-scene-number]::after {
        position: absolute;
        top: 0;
        color: #777;
        font-size: 9pt;
        font-weight: 400;
      }

      .screenplay-scene-heading[data-scene-number]::before { content: attr(data-scene-number); left: 0; }
      .screenplay-scene-heading[data-scene-number]::after { content: attr(data-scene-number); right: 0; }
      .screenplay-dialogue[data-screenplay-more="true"]::after { content: "(MORE)"; display: block; margin-top: 5pt; text-align: center; }
      .screenplay-dialogue[data-continued-character]::before { content: attr(data-continued-character); display: block; margin: 0 .2in 2pt 1.15in; text-transform: uppercase; }

      .screenplay-title-page {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: calc(var(--page-height) - var(--margin-top) - var(--margin-bottom));
        font-family: "Courier New", Courier, monospace;
      }

      @media (max-width: 850px) {
        .document-shell {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          box-shadow: none;
        }
      }

      @media print {
        @page {
          size: ${page.width}px ${page.height}px;
          margin: 0;
        }

        body { background: transparent; }

        .document-shell {
          width: var(--page-width);
          min-height: var(--page-height);
          margin: 0;
          box-shadow: none;
        }
      }
    `;
  }

  function makeStandaloneHTML({
    title,
    content,
    settings,
    includeTitle = true
  }) {
    const cleanContent = stripTemporaryAttributes(content);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Atero Write">
  <title>${escapeHTML(title)}</title>
  <style>${documentContentCSS(settings)}</style>
</head>
<body>
  <article class="document-shell">
    ${includeTitle ? `<h1 class="document-title">${escapeHTML(title)}</h1>` : ""}
    ${cleanContent}
  </article>
</body>
</html>`;
  }

  async function exportHTML(context) {
    const html = makeStandaloneHTML(context);

    downloadBlob(
      new Blob([html], { type: "text/html;charset=utf-8" }),
      `${context.title}.html`
    );
  }

  /* =======================================================
     TXT
     ======================================================= */

  async function exportTXT(context) {
    const parts = [];

    if (context.includeTitle) {
      parts.push(context.title, "");
    }

    parts.push(plainTextFromHTML(context.content));

    downloadBlob(
      new Blob([parts.join("\n")], {
        type: "text/plain;charset=utf-8"
      }),
      `${context.title}.txt`
    );
  }

  /* =======================================================
     MARKDOWN
     ======================================================= */

  function inlineMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.nodeValue || "")
        .replace(/\\/g, "\\\\")
        .replace(/([*_`[\]])/g, "\\$1");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tag = node.tagName.toLowerCase();
    const content = [...node.childNodes]
      .map(inlineMarkdown)
      .join("");

    switch (tag) {
      case "br":
        return "  \n";
      case "strong":
      case "b":
        return `**${content}**`;
      case "em":
      case "i":
        return `*${content}*`;
      case "s":
      case "strike":
      case "del":
        return `~~${content}~~`;
      case "code":
        return `\`${content.replace(/`/g, "\\`")}\``;
      case "a": {
        const href = node.getAttribute("href") || "";
        return href ? `[${content || href}](${href})` : content;
      }
      case "img": {
        const alt = node.getAttribute("alt") || "Imagem";
        const src = node.getAttribute("src") || "";
        return src ? `![${alt}](${src})` : `[Imagem: ${alt}]`;
      }
      case "sup":
        return `<sup>${content}</sup>`;
      case "sub":
        return `<sub>${content}</sub>`;
      default:
        return content;
    }
  }

  function listMarkdown(list, depth = 0) {
    const ordered = list.tagName.toLowerCase() === "ol";
    const lines = [];
    let index = 1;

    [...list.children]
      .filter(child => child.tagName?.toLowerCase() === "li")
      .forEach(item => {
        const childLists = [...item.children].filter(child =>
          ["ul", "ol"].includes(child.tagName.toLowerCase())
        );

        const clone = item.cloneNode(true);
        clone.querySelectorAll(":scope > ul, :scope > ol").forEach(child => {
          child.remove();
        });

        const marker = ordered ? `${index}.` : "-";
        const indentation = "  ".repeat(depth);
        const text = [...clone.childNodes]
          .map(inlineMarkdown)
          .join("")
          .trim();

        lines.push(`${indentation}${marker} ${text}`);

        childLists.forEach(child => {
          lines.push(listMarkdown(child, depth + 1));
        });

        index += 1;
      });

    return lines.join("\n");
  }

  function tableMarkdown(table) {
    const rows = [...table.querySelectorAll(":scope > thead > tr, :scope > tbody > tr, :scope > tr")];

    if (!rows.length) {
      return "";
    }

    const matrix = rows.map(row =>
      [...row.children]
        .filter(cell => ["td", "th"].includes(cell.tagName.toLowerCase()))
        .map(cell => inlineMarkdown(cell).replace(/\|/g, "\\|").trim())
    );

    const columnCount = Math.max(...matrix.map(row => row.length));
    const normalized = matrix.map(row => [
      ...row,
      ...Array(Math.max(0, columnCount - row.length)).fill("")
    ]);

    const header = normalized[0];
    const separator = Array(columnCount).fill("---");
    const body = normalized.slice(1);

    return [header, separator, ...body]
      .map(row => `| ${row.join(" | ")} |`)
      .join("\n");
  }

  function blockMarkdown(node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue?.trim();
      return text ? text : "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tag = node.tagName.toLowerCase();

    if (node.classList.contains("manual-page-break")) {
      return "\n<div style=\"page-break-after: always;\"></div>\n";
    }

    if (tag === "h1") return `# ${inlineMarkdown(node).trim()}`;
    if (tag === "h2") return `## ${inlineMarkdown(node).trim()}`;
    if (tag === "h3") return `### ${inlineMarkdown(node).trim()}`;
    if (tag === "h4") return `#### ${inlineMarkdown(node).trim()}`;
    if (tag === "h5") return `##### ${inlineMarkdown(node).trim()}`;
    if (tag === "h6") return `###### ${inlineMarkdown(node).trim()}`;

    if (tag === "p") {
      return inlineMarkdown(node).trim();
    }

    if (tag === "blockquote") {
      return inlineMarkdown(node)
        .trim()
        .split("\n")
        .map(line => `> ${line}`)
        .join("\n");
    }

    if (tag === "pre") {
      return `\`\`\`\n${node.textContent || ""}\n\`\`\``;
    }

    if (["ul", "ol"].includes(tag)) {
      return listMarkdown(node, depth);
    }

    if (tag === "table") {
      return tableMarkdown(node);
    }

    if (tag === "hr") {
      return "---";
    }

    if (tag === "figure") {
      const image = node.querySelector("img");
      const caption = node.querySelector("figcaption")?.textContent?.trim();
      const imageMarkdown = image ? inlineMarkdown(image) : "";
      return [imageMarkdown, caption ? `*${caption}*` : ""]
        .filter(Boolean)
        .join("\n\n");
    }

    if (node.classList.contains("text-box")) {
      return [...node.childNodes]
        .map(child => blockMarkdown(child, depth))
        .filter(Boolean)
        .join("\n\n");
    }

    return [...node.childNodes]
      .map(child => blockMarkdown(child, depth))
      .filter(Boolean)
      .join("\n\n");
  }

  function htmlToMarkdown(html) {
    const container = document.createElement("div");
    container.innerHTML = html;

    return [...container.childNodes]
      .map(node => blockMarkdown(node))
      .filter(Boolean)
      .join("\n\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  async function exportMarkdown(context) {
    const parts = [];

    if (context.includeTitle) {
      parts.push(`# ${context.title}`);
    }

    const markdown = htmlToMarkdown(context.content);
    if (markdown) parts.push(markdown);

    downloadBlob(
      new Blob([parts.join("\n\n")], {
        type: "text/markdown;charset=utf-8"
      }),
      `${context.title}.md`
    );
  }

  /* =======================================================
     FOUNTAIN — ROTEIRO ABERTO
     ======================================================= */

  function screenplayNodeText(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
    return (clone.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  }

  function fountainTitlePage(screenplay, fallbackTitle) {
    if (!screenplay) return "";

    const lines = [];
    const title = screenplay.title || fallbackTitle;
    if (title) lines.push(`Title: ${title}`);
    lines.push("Credit: Escrito por");
    if (screenplay.author) lines.push(`Author: ${screenplay.author}`);
    if (screenplay.draftName) lines.push(`Draft: ${screenplay.draftName}`);
    if (screenplay.draftDate) lines.push(`Draft date: ${screenplay.draftDate}`);
    if (screenplay.copyright) lines.push(`Copyright: ${screenplay.copyright}`);

    if (screenplay.contact) {
      lines.push("Contact:");
      screenplay.contact.split(/\r?\n/).forEach(line => {
        lines.push(`    ${line}`);
      });
    }

    return lines.join("\n");
  }

  function screenplayToFountain(html, screenplay = null, fallbackTitle = "") {
    const container = document.createElement("div");
    container.innerHTML = html;
    const output = [];

    const titlePage = fountainTitlePage(screenplay, fallbackTitle);
    if (titlePage) output.push(titlePage);

    for (const node of [...container.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue?.trim();
        if (text) output.push(text);
        continue;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      if (node.matches("[data-screenplay-title-page='true']")) continue;

      if (node.classList.contains("manual-page-break")) {
        output.push("===");
        continue;
      }

      const type = node.dataset.screenplayType || "";
      let text = screenplayNodeText(node);
      if (!text) {
        output.push("");
        continue;
      }

      if (type === "scene") {
        text = text.toUpperCase();
        if (!/^(INT\.?|EXT\.?|INT\.?\/EXT\.?|I\.?\/E\.?|EST\.?)/i.test(text)) {
          text = `.${text}`;
        }
      } else if (type === "character") {
        text = text.toUpperCase();
      } else if (type === "parenthetical") {
        if (!text.startsWith("(")) text = `(${text}`;
        if (!text.endsWith(")")) text = `${text})`;
      } else if (type === "transition") {
        text = `>${text.toUpperCase()}`;
      } else if (type === "centered") {
        text = `>${text}<`;
      } else if (type === "shot") {
        text = `!!${text.toUpperCase()}`;
      }

      output.push(text);
    }

    return output
      .join("\n\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  async function exportFountain(context) {
    const fountain = screenplayToFountain(
      context.content,
      context.screenplay,
      context.title
    );

    downloadBlob(
      new Blob([fountain], {
        type: "text/plain;charset=utf-8"
      }),
      `${context.title}.fountain`
    );
  }

  /* =======================================================
     RTF
     ======================================================= */

  function rtfEscape(value) {
    return [...String(value ?? "")]
      .map(character => {
        const code = character.charCodeAt(0);

        if (character === "\\") return "\\\\";
        if (character === "{") return "\\{";
        if (character === "}") return "\\}";
        if (character === "\n") return "\\line ";
        if (code >= 32 && code <= 126) return character;

        const signed = code > 32767 ? code - 65536 : code;
        return `\\u${signed}?`;
      })
      .join("");
  }

  function rtfInline(node, style = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
      const prefix = [
        style.bold ? "\\b " : "",
        style.italic ? "\\i " : "",
        style.underline ? "\\ul " : "",
        style.strike ? "\\strike " : "",
        style.superScript ? "\\super " : "",
        style.subScript ? "\\sub " : ""
      ].join("");

      const suffix = [
        style.subScript || style.superScript ? "\\nosupersub " : "",
        style.strike ? "\\strike0 " : "",
        style.underline ? "\\ul0 " : "",
        style.italic ? "\\i0 " : "",
        style.bold ? "\\b0 " : ""
      ].join("");

      return `${prefix}${rtfEscape(node.nodeValue || "")}${suffix}`;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();
    const nextStyle = {
      ...style,
      bold: style.bold || ["strong", "b"].includes(tag),
      italic: style.italic || ["em", "i"].includes(tag),
      underline: style.underline || tag === "u",
      strike: style.strike || ["s", "strike", "del"].includes(tag),
      superScript: style.superScript || tag === "sup",
      subScript: style.subScript || tag === "sub"
    };

    if (tag === "br") return "\\line ";

    if (tag === "img") {
      const alt = node.getAttribute("alt") || "Imagem";
      return `\\i [Imagem: ${rtfEscape(alt)}]\\i0 `;
    }

    return [...node.childNodes]
      .map(child => rtfInline(child, nextStyle))
      .join("");
  }

  function rtfBlock(node, listDepth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      return rtfEscape(node.nodeValue || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const tag = node.tagName.toLowerCase();

    if (node.classList.contains("manual-page-break")) {
      return "\\page\n";
    }

    if (["h1", "h2", "h3"].includes(tag)) {
      const sizes = { h1: 36, h2: 30, h3: 26 };
      return `\\pard\\sa180\\b\\fs${sizes[tag]} ${rtfInline(node)}\\b0\\par\n`;
    }

    const screenplayType = node.dataset.screenplayType;
    if (screenplayType) {
      const formats = {
        scene: "\\pard\\keepn\\sb240\\sa120\\f1\\fs24\\b ",
        action: "\\pard\\sa240\\f1\\fs24 ",
        character: "\\pard\\keepn\\li3168\\ri1656\\sb240\\sa0\\f1\\fs24 ",
        parenthetical: "\\pard\\li2232\\ri2376\\sa0\\f1\\fs24 ",
        dialogue: "\\pard\\li1368\\ri2088\\sa240\\f1\\fs24 ",
        transition: "\\pard\\qr\\li4824\\sb240\\sa240\\f1\\fs24 ",
        shot: "\\pard\\keepn\\sb240\\sa120\\f1\\fs24\\b ",
        centered: "\\pard\\qc\\sb240\\sa240\\f1\\fs24 ",
        normal: "\\pard\\sa120\\fs24 "
      };
      const prefix = formats[screenplayType] || formats.normal;
      const suffix = ["scene", "shot"].includes(screenplayType) ? "\\b0" : "";
      return `${prefix}${rtfInline(node)}${suffix}\\par\n`;
    }

    if (tag === "p" || tag === "div") {
      return `\\pard\\sa120\\fs24 ${rtfInline(node)}\\par\n`;
    }

    if (tag === "blockquote") {
      return `\\pard\\li720\\ri360\\sa160\\i ${rtfInline(node)}\\i0\\par\n`;
    }

    if (tag === "pre") {
      return `\\pard\\li360\\sa160\\f1\\fs20 ${rtfEscape(node.textContent || "")}\\f0\\fs24\\par\n`;
    }

    if (tag === "ul" || tag === "ol") {
      const ordered = tag === "ol";
      let index = 1;

      return [...node.children]
        .filter(child => child.tagName?.toLowerCase() === "li")
        .map(item => {
          const marker = ordered ? `${index}.` : "•";
          index += 1;

          const nested = [...item.children]
            .filter(child => ["ul", "ol"].includes(child.tagName.toLowerCase()))
            .map(child => rtfBlock(child, listDepth + 1))
            .join("");

          const clone = item.cloneNode(true);
          clone.querySelectorAll("ul, ol").forEach(child => child.remove());

          return `\\pard\\li${720 + listDepth * 360}\\fi-360\\sa80 ${rtfEscape(marker)}\\tab ${rtfInline(clone)}\\par\n${nested}`;
        })
        .join("");
    }

    if (tag === "table") {
      const rows = [...node.querySelectorAll("tr")];
      return rows
        .map(row => {
          const cells = [...row.children]
            .filter(cell => ["td", "th"].includes(cell.tagName.toLowerCase()));

          if (!cells.length) return "";

          const width = Math.floor(9000 / cells.length);
          const cellDefinitions = cells
            .map((_, index) => `\\cellx${width * (index + 1)}`)
            .join("");

          const cellContent = cells
            .map(cell => `${rtfInline(cell)}\\cell `)
            .join("");

          return `\\trowd${cellDefinitions}${cellContent}\\row\n`;
        })
        .join("");
    }

    if (tag === "hr") {
      return "\\pard\\brdrb\\brdrs\\brdrw10\\sa160\\par\n";
    }

    if (tag === "figure") {
      const image = node.querySelector("img");
      const caption = node.querySelector("figcaption")?.textContent?.trim();
      const alt = image?.getAttribute("alt") || "Imagem";
      return `\\pard\\qc\\i [Imagem: ${rtfEscape(alt)}]\\i0\\par\n${caption ? `\\pard\\qc\\i ${rtfEscape(caption)}\\i0\\par\n` : ""}`;
    }

    return [...node.childNodes]
      .map(child => rtfBlock(child, listDepth))
      .join("");
  }

  function htmlToRTF(html, title, includeTitle) {
    const container = document.createElement("div");
    container.innerHTML = html;

    const body = [...container.childNodes]
      .map(node => rtfBlock(node))
      .join("");

    const titleBlock = includeTitle
      ? `\\pard\\qc\\b\\fs40 ${rtfEscape(title)}\\b0\\fs24\\par\\par\n`
      : "";

    return `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}{\\f1 Courier New;}}
\\viewkind4\\uc1
${titleBlock}${body}
}`;
  }

  async function exportRTF(context) {
    const rtf = htmlToRTF(
      context.content,
      context.title,
      context.includeTitle
    );

    downloadBlob(
      new Blob([rtf], {
        type: "application/rtf;charset=utf-8"
      }),
      `${context.title}.rtf`
    );
  }

  /* =======================================================
     BACKUP ATERO WRITE
     ======================================================= */

  async function exportAteroBackup(context) {
    const record = loadDocumentRecord();
    const documentId = record?.id || currentDocumentId();
    const completeRecord = {
      ...(record || {}),
      schemaVersion: window.AteroWriteData?.schemaVersion || 2,
      id: documentId,
      projectId: record?.projectId || null,
      type: context.screenplay?.enabled ? "screenplay" : (record?.type || "document"),
      name: context.title,
      content: context.content,
      editorSettings: context.settings,
      screenplaySettings: context.screenplay || record?.screenplaySettings || {},
      createdAt: record?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: Number(record?.revision || 0),
      metadata: record?.metadata || {}
    };

    const payload = {
      format: "atero-write-document",
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      document: completeRecord,
      versions: window.AteroWriteData?.getVersionsSync?.(documentId) || []
    };

    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8"
      }),
      `${context.title}.awrite.json`
    );
  }

  /* =======================================================
     PDF — DOWNLOAD DIRETO
     ======================================================= */

  async function ensurePagesReady() {
    const wasFlow = elements.stage?.classList.contains("view-flow");

    if (wasFlow) {
      elements.pageModeButton?.click();
      await nextFrame();
      await wait(250);
    }

    return () => {
      if (wasFlow) {
        elements.flowModeButton?.click();
      }
    };
  }

  function loadPDFScript(source, readyCheck, marker) {
    return new Promise((resolve, reject) => {
      if (readyCheck()) {
        resolve();
        return;
      }

      const existing = document.querySelector(
        `script[data-atero-pdf-library="${marker}"]`
      );

      if (existing) {
        existing.addEventListener("load", () => {
          readyCheck()
            ? resolve()
            : reject(new Error(`A biblioteca ${marker} não foi inicializada.`));
        }, { once: true });

        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = source;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.ateroPdfLibrary = marker;

      script.addEventListener("load", () => {
        readyCheck()
          ? resolve()
          : reject(new Error(`A biblioteca ${marker} não foi inicializada.`));
      }, { once: true });

      script.addEventListener("error", () => {
        script.remove();
        reject(new Error(`Não foi possível carregar ${marker}.`));
      }, { once: true });

      document.head.append(script);
    });
  }

  async function loadWithFallback(primary, fallback, readyCheck, marker) {
    try {
      await loadPDFScript(primary, readyCheck, marker);
    } catch {
      document
        .querySelector(`script[data-atero-pdf-library="${marker}"]`)
        ?.remove();

      await loadPDFScript(fallback, readyCheck, marker);
    }
  }

  function ensurePDFLibraries() {
    if (
      typeof window.html2canvas === "function" &&
      typeof window.jspdf?.jsPDF === "function"
    ) {
      return Promise.resolve();
    }

    if (!pdfLoadPromise) {
      pdfLoadPromise = (async () => {
        await loadWithFallback(
          HTML2CANVAS_CDN,
          FALLBACK_HTML2CANVAS_CDN,
          () => typeof window.html2canvas === "function",
          "html2canvas"
        );

        await loadWithFallback(
          JSPDF_CDN,
          FALLBACK_JSPDF_CDN,
          () => typeof window.jspdf?.jsPDF === "function",
          "jspdf"
        );
      })().catch(error => {
        pdfLoadPromise = null;
        throw error;
      });
    }

    return pdfLoadPromise;
  }

  async function waitForCaptureImages(root) {
    const images = [...root.querySelectorAll("img")];

    await Promise.all(images.map(async image => {
      if (!image.complete) {
        await new Promise(resolve => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }

      if (typeof image.decode === "function") {
        try {
          await image.decode();
        } catch {
          // Uma imagem inválida não deve impedir a exportação inteira.
        }
      }
    }));
  }

  function buildPDFCaptureHost(context) {
    const { page } = context.settings;
    const sourcePages = $$(".editor-page");

    if (!sourcePages.length) {
      throw new Error("Não foi possível encontrar páginas para gerar o PDF.");
    }

    const style = document.createElement("style");
    style.dataset.ateroPdfTemporary = "true";
    style.textContent = `
      .atero-pdf-capture-host {
        position: fixed !important;
        top: 0 !important;
        left: -100000px !important;
        z-index: -100000 !important;
        display: block !important;
        width: ${page.width}px !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 1 !important;
        pointer-events: none !important;
        background: transparent !important;
      }

      .atero-pdf-capture-host .atero-pdf-capture-page {
        position: relative !important;
        inset: auto !important;
        display: block !important;
        width: ${page.width}px !important;
        height: ${page.height}px !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: ${page.color || "#ffffff"} !important;
        border: 0 !important;
        box-shadow: none !important;
        transform: none !important;
        transform-origin: top left !important;
      }

      .atero-pdf-capture-host .page-body:empty::before {
        content: none !important;
      }

      .atero-pdf-capture-host .page-number-badge,
      .atero-pdf-capture-host .image-toolbar,
      .atero-pdf-capture-host .image-resize-handle,
      .atero-pdf-capture-host [data-temporary] {
        display: none !important;
      }

      .atero-pdf-capture-host .is-image-selected {
        outline: none !important;
      }
    `;

    document.head.append(style);

    const host = document.createElement("div");
    host.className = "atero-pdf-capture-host";
    host.dataset.ateroPdfTemporary = "true";
    host.setAttribute("aria-hidden", "true");

    host.style.setProperty("--editor-page-width", `${page.width}px`);
    host.style.setProperty("--editor-page-height", `${page.height}px`);
    host.style.setProperty("--editor-margin-top", `${page.marginTop}px`);
    host.style.setProperty("--editor-margin-right", `${page.marginRight}px`);
    host.style.setProperty("--editor-margin-bottom", `${page.marginBottom}px`);
    host.style.setProperty("--editor-margin-left", `${page.marginLeft}px`);
    host.style.setProperty("--editor-page-color", page.color || "#ffffff");
    host.style.setProperty("--editor-zoom", "1");

    sourcePages.forEach(sourcePage => {
      const sourceSurface = sourcePage.querySelector(".page-surface");

      if (!sourceSurface) {
        return;
      }

      const clone = cleanContentClone(sourceSurface);
      clone.classList.add("atero-pdf-capture-page");

      clone.removeAttribute("style");
      clone.style.width = `${page.width}px`;
      clone.style.height = `${page.height}px`;
      clone.style.background = page.color || "#ffffff";
      clone.style.transform = "none";

      clone.querySelector(".page-number-badge")?.remove();

      if (!context.includeHeaderFooter) {
        clone.querySelector(".page-header")?.remove();
        clone.querySelector(".page-footer")?.remove();
      }

      const body = clone.querySelector(".page-body");
      if (body && !body.hasChildNodes()) {
        body.append(document.createTextNode("\u200B"));
      }

      host.append(clone);
    });

    document.body.append(host);

    return {
      host,
      pages: [...host.querySelectorAll(".atero-pdf-capture-page")],
      cleanup() {
        host.remove();
        style.remove();
      }
    };
  }

  function pdfRenderScale(pageCount) {
    if (pageCount >= 60) return 1.15;
    if (pageCount >= 35) return 1.3;
    if (pageCount >= 18) return 1.55;
    return 2;
  }

  async function exportPDF(context) {
    const restoreMode = await ensurePagesReady();
    let capture = null;

    try {
      setExportStatus("Carregando o gerador de PDF…", "working");
      await ensurePDFLibraries();

      capture = buildPDFCaptureHost(context);

      if (!capture.pages.length) {
        throw new Error("Não foi possível montar as páginas do PDF.");
      }

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await waitForCaptureImages(capture.host);
      await nextFrame();

      const { page } = context.settings;
      const widthPt = page.width * 72 / 96;
      const heightPt = page.height * 72 / 96;
      const orientation = widthPt > heightPt ? "landscape" : "portrait";
      const scale = pdfRenderScale(capture.pages.length);
      const { jsPDF } = window.jspdf;

      const pdf = new jsPDF({
        orientation,
        unit: "pt",
        format: [widthPt, heightPt],
        compress: true,
        putOnlyUsedFonts: true
      });

      for (let index = 0; index < capture.pages.length; index += 1) {
        const pageNode = capture.pages[index];

        setExportStatus(
          `Renderizando página ${index + 1} de ${capture.pages.length}…`,
          "working"
        );

        const canvas = await window.html2canvas(pageNode, {
          backgroundColor: page.color || "#ffffff",
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 15000,
          width: page.width,
          height: page.height,
          windowWidth: page.width,
          windowHeight: page.height,
          scrollX: 0,
          scrollY: 0,
          removeContainer: true
        });

        if (index > 0) {
          pdf.addPage([widthPt, heightPt], orientation);
        }

        const imageData = canvas.toDataURL("image/jpeg", 0.94);

        pdf.addImage(
          imageData,
          "JPEG",
          0,
          0,
          widthPt,
          heightPt,
          undefined,
          "FAST"
        );

        canvas.width = 1;
        canvas.height = 1;

        await nextFrame();
      }

      setExportStatus("Finalizando o PDF…", "working");

      const blob = pdf.output("blob");
      downloadBlob(blob, `${context.title}.pdf`);
    } catch (error) {
      if (
        /carregar|biblioteca|html2canvas|jspdf/i.test(
          error?.message || ""
        )
      ) {
        throw new Error(
          "Não foi possível carregar o gerador de PDF. Verifique sua conexão e tente novamente."
        );
      }

      throw error;
    } finally {
      capture?.cleanup();
      restoreMode();
    }
  }

  /* =======================================================
     DOCX
     ======================================================= */

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        `script[data-atero-export-source="${source}"]`
      );

      if (existing) {
        if (window.docx) {
          resolve();
        } else {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
        }
        return;
      }

      const script = document.createElement("script");
      script.src = source;
      script.async = true;
      script.dataset.ateroExportSource = source;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    });
  }

  async function ensureDocxLibrary() {
    if (window.docx?.Document && window.docx?.Packer) {
      return window.docx;
    }

    if (!docxLoadPromise) {
      docxLoadPromise = (async () => {
        try {
          await loadScript(DOCX_CDN);
        } catch {
          await loadScript(FALLBACK_DOCX_CDN);
        }

        if (!window.docx?.Document || !window.docx?.Packer) {
          throw new Error("A biblioteca de exportação DOCX não foi carregada.");
        }

        return window.docx;
      })();
    }

    return docxLoadPromise;
  }

  function pxToTwip(value) {
    return Math.round((Number(value) || 0) * 15);
  }

  function ptToHalfPoint(value) {
    return Math.max(2, Math.round((Number(value) || 12) * 2));
  }

  function parseCSSLength(value, defaultUnit = "px") {
    if (value == null || value === "") return 0;

    if (typeof value === "number") {
      return defaultUnit === "pt" ? value * 20 : value * 15;
    }

    const text = String(value).trim();
    const number = parseFloat(text);
    if (!Number.isFinite(number)) return 0;

    if (text.endsWith("pt")) return Math.round(number * 20);
    if (text.endsWith("px")) return Math.round(number * 15);
    if (text.endsWith("cm")) return Math.round(number * 567);
    if (text.endsWith("mm")) return Math.round(number * 56.7);
    if (text.endsWith("in")) return Math.round(number * 1440);
    if (text.endsWith("em") || text.endsWith("rem")) {
      return Math.round(number * 12 * 20);
    }

    return defaultUnit === "pt"
      ? Math.round(number * 20)
      : Math.round(number * 15);
  }

  function cssColor(value) {
    if (!value) return undefined;

    const text = String(value).trim();

    if (/^#[0-9a-f]{3}$/i.test(text)) {
      return text
        .slice(1)
        .split("")
        .map(character => character + character)
        .join("")
        .toUpperCase();
    }

    if (/^#[0-9a-f]{6}$/i.test(text)) {
      return text.slice(1).toUpperCase();
    }

    const match = text.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i
    );

    if (match) {
      return [match[1], match[2], match[3]]
        .map(valuePart =>
          Number(valuePart).toString(16).padStart(2, "0")
        )
        .join("")
        .toUpperCase();
    }

    return undefined;
  }

  function docxAlignment(value, docx) {
    const alignment = String(value || "").toLowerCase();

    if (alignment === "center") return docx.AlignmentType.CENTER;
    if (alignment === "right" || alignment === "end") return docx.AlignmentType.RIGHT;
    if (alignment === "justify") return docx.AlignmentType.JUSTIFIED;
    return docx.AlignmentType.LEFT;
  }

  function nodeTextStyle(node, inherited = {}) {
    const style = node.nodeType === Node.ELEMENT_NODE
      ? node.style
      : null;

    const tag = node.nodeType === Node.ELEMENT_NODE
      ? node.tagName.toLowerCase()
      : "";

    const textDecoration = style?.textDecoration || "";
    const fontWeight = style?.fontWeight || "";
    const numericWeight = parseInt(fontWeight, 10);

    return {
      ...inherited,
      bold:
        inherited.bold ||
        ["b", "strong"].includes(tag) ||
        fontWeight === "bold" ||
        (Number.isFinite(numericWeight) && numericWeight >= 600),
      italics:
        inherited.italics ||
        ["i", "em"].includes(tag) ||
        style?.fontStyle === "italic",
      underline:
        inherited.underline ||
        tag === "u" ||
        textDecoration.includes("underline"),
      strike:
        inherited.strike ||
        ["s", "strike", "del"].includes(tag) ||
        textDecoration.includes("line-through"),
      superScript:
        inherited.superScript ||
        tag === "sup" ||
        style?.verticalAlign === "super",
      subScript:
        inherited.subScript ||
        tag === "sub" ||
        style?.verticalAlign === "sub",
      color: cssColor(style?.color) || inherited.color,
      backgroundColor:
        cssColor(style?.backgroundColor) || inherited.backgroundColor,
      font:
        style?.fontFamily
          ?.split(",")[0]
          ?.replace(/["']/g, "")
          ?.trim() || inherited.font,
      size:
        style?.fontSize
          ? ptToHalfPoint(
              style.fontSize.endsWith("px")
                ? parseFloat(style.fontSize) * 0.75
                : parseFloat(style.fontSize)
            )
          : inherited.size
    };
  }

  function textRunOptions(text, style, docx) {
    const options = {
      text,
      bold: Boolean(style.bold),
      italics: Boolean(style.italics),
      strike: Boolean(style.strike),
      superScript: Boolean(style.superScript),
      subScript: Boolean(style.subScript)
    };

    if (style.underline) {
      options.underline = {
        type: docx.UnderlineType.SINGLE
      };
    }

    if (style.color) options.color = style.color;
    if (style.font) options.font = style.font;
    if (style.size) options.size = style.size;

    if (style.backgroundColor) {
      options.shading = {
        type: docx.ShadingType.CLEAR,
        color: "auto",
        fill: style.backgroundColor
      };
    }

    return options;
  }

  async function dataURLToBytes(source) {
    if (!source) return null;

    if (source.startsWith("data:")) {
      const comma = source.indexOf(",");
      const metadata = source.slice(0, comma);
      const data = source.slice(comma + 1);

      if (metadata.includes(";base64")) {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }

        return bytes;
      }

      return new TextEncoder().encode(decodeURIComponent(data));
    }

    const response = await fetch(source);
    if (!response.ok) throw new Error("Não foi possível carregar uma imagem.");
    return new Uint8Array(await response.arrayBuffer());
  }

  function imageDimensions(source) {
    return new Promise(resolve => {
      const image = new Image();

      image.addEventListener("load", () => {
        resolve({
          width: image.naturalWidth || image.width || 640,
          height: image.naturalHeight || image.height || 360
        });
      }, { once: true });

      image.addEventListener("error", () => {
        resolve({ width: 640, height: 360 });
      }, { once: true });

      image.src = source;
    });
  }

  function imageWidthInDocument(node, pageContentWidth) {
    const figure = node.closest("figure.document-figure");
    const styleWidth = figure?.style.width || node.style.width || "";

    if (styleWidth.endsWith("%")) {
      return Math.max(
        40,
        pageContentWidth * parseFloat(styleWidth) / 100
      );
    }

    if (styleWidth.endsWith("px")) {
      return Math.max(40, parseFloat(styleWidth));
    }

    if (node.width) {
      return Math.min(pageContentWidth, node.width);
    }

    return pageContentWidth * 0.7;
  }

  async function imageRunFromNode(node, context, docx) {
    const source = node.getAttribute("src") || "";
    const bytes = await dataURLToBytes(source);

    if (!bytes) {
      return new docx.TextRun({
        text: `[Imagem: ${node.getAttribute("alt") || "Imagem"}]`,
        italics: true,
        color: "666666"
      });
    }

    const natural = await imageDimensions(source);
    const width = Math.min(
      context.pageContentWidth,
      imageWidthInDocument(node, context.pageContentWidth)
    );

    const height = Math.max(
      1,
      width * natural.height / Math.max(1, natural.width)
    );

    return new docx.ImageRun({
      data: bytes,
      transformation: {
        width: Math.round(width),
        height: Math.round(height)
      },
      altText: {
        title: node.getAttribute("alt") || "Imagem",
        description: node.getAttribute("alt") || "Imagem",
        name: node.getAttribute("alt") || "Imagem"
      }
    });
  }

  async function inlineDocxRuns(node, inherited, context, docx) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || "";
      return text
        ? [new docx.TextRun(textRunOptions(text, inherited, docx))]
        : [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const tag = node.tagName.toLowerCase();
    const style = nodeTextStyle(node, inherited);

    if (tag === "br") {
      return [new docx.TextRun({ break: 1 })];
    }

    if (tag === "img") {
      return [await imageRunFromNode(node, context, docx)];
    }

    const childRuns = [];

    for (const child of node.childNodes) {
      childRuns.push(
        ...(await inlineDocxRuns(child, style, context, docx))
      );
    }

    if (tag === "a") {
      const href = node.getAttribute("href") || "";

      if (href && !href.startsWith("#")) {
        const runs = childRuns.filter(run =>
          run instanceof docx.TextRun
        );

        if (runs.length) {
          return [new docx.ExternalHyperlink({
            link: href,
            children: runs
          })];
        }
      }
    }

    return childRuns;
  }

  function paragraphOptionsFromNode(node, docx) {
    const style = node.style || {};
    const options = {
      alignment: docxAlignment(style.textAlign, docx),
      spacing: {}
    };

    const tag = node.tagName?.toLowerCase();

    if (tag === "h1") options.heading = docx.HeadingLevel.HEADING_1;
    if (tag === "h2") options.heading = docx.HeadingLevel.HEADING_2;
    if (tag === "h3") options.heading = docx.HeadingLevel.HEADING_3;

    const before = parseCSSLength(style.marginTop, "pt");
    const after = parseCSSLength(style.marginBottom, "pt");

    if (before) options.spacing.before = before;
    if (after) options.spacing.after = after;

    const lineHeight = parseFloat(style.lineHeight);
    if (Number.isFinite(lineHeight)) {
      options.spacing.line = Math.round(lineHeight * 240);
    }

    const left = parseCSSLength(style.marginLeft || style.paddingLeft);
    const right = parseCSSLength(style.marginRight || style.paddingRight);
    const firstLine = parseCSSLength(style.textIndent);

    if (left || right || firstLine) {
      options.indent = {};
      if (left) options.indent.left = left;
      if (right) options.indent.right = right;
      if (firstLine) options.indent.firstLine = firstLine;
    }

    if (node.classList?.contains("citation-block") || tag === "blockquote") {
      options.indent = {
        ...(options.indent || {}),
        left: options.indent?.left || 540,
        right: options.indent?.right || 240
      };

      options.border = {
        left: {
          color: "E63946",
          size: 12,
          style: docx.BorderStyle.SINGLE,
          space: 12
        }
      };

      options.shading = {
        type: docx.ShadingType.CLEAR,
        fill: "FAFAFA"
      };
    }

    if (tag === "pre") {
      options.shading = {
        type: docx.ShadingType.CLEAR,
        fill: "F5F5F5"
      };

      options.border = {
        top: { style: docx.BorderStyle.SINGLE, color: "E5E5E5", size: 4 },
        right: { style: docx.BorderStyle.SINGLE, color: "E5E5E5", size: 4 },
        bottom: { style: docx.BorderStyle.SINGLE, color: "E5E5E5", size: 4 },
        left: { style: docx.BorderStyle.SINGLE, color: "E5E5E5", size: 4 }
      };
    }

    return options;
  }

  async function paragraphFromElement(node, context, docx, extra = {}) {
    const baseStyle = {};

    if (node.tagName?.toLowerCase() === "pre") {
      baseStyle.font = "Courier New";
      baseStyle.size = 20;
    }

    let runs = await inlineDocxRuns(node, baseStyle, context, docx);
    const paragraphOptions = paragraphOptionsFromNode(node, docx);

    if (node.classList?.contains("screenplay-scene-heading")) {
      paragraphOptions.keepNext = true;
      paragraphOptions.keepLines = true;
      const number = node.dataset.sceneNumber;
      if (number) {
        runs = [
          new docx.TextRun({ text: `${number}  `, font: "Courier New", size: 24 }),
          ...runs,
          new docx.TextRun({ text: `  ${number}`, font: "Courier New", size: 24 })
        ];
      }
    }

    if (node.classList?.contains("screenplay-character")) {
      paragraphOptions.keepNext = true;
    }

    return new docx.Paragraph({
      ...paragraphOptions,
      ...extra,
      children: runs.length
        ? runs
        : [new docx.TextRun("")]
    });
  }

  async function listToDocx(node, context, docx, level = 0) {
    const ordered = node.tagName.toLowerCase() === "ol";
    const output = [];

    for (const item of [...node.children]) {
      if (item.tagName?.toLowerCase() !== "li") continue;

      const clone = item.cloneNode(true);
      clone.querySelectorAll(":scope > ul, :scope > ol").forEach(list => {
        list.remove();
      });

      const extra = ordered
        ? {
            numbering: {
              reference: "atero-numbered-list",
              level: Math.min(level, 5)
            }
          }
        : {
            bullet: {
              level: Math.min(level, 5)
            }
          };

      output.push(
        await paragraphFromElement(clone, context, docx, extra)
      );

      const nestedLists = [...item.children].filter(child =>
        ["ul", "ol"].includes(child.tagName.toLowerCase())
      );

      for (const nested of nestedLists) {
        output.push(
          ...(await listToDocx(nested, context, docx, level + 1))
        );
      }
    }

    return output;
  }

  async function tableCellChildren(cell, context, docx) {
    const children = [];

    for (const node of cell.childNodes) {
      children.push(...await blockToDocx(node, context, docx));
    }

    if (!children.length) {
      children.push(new docx.Paragraph(""));
    }

    return children;
  }

  async function tableToDocx(table, context, docx) {
    const rows = [...table.querySelectorAll(":scope > thead > tr, :scope > tbody > tr, :scope > tr")];
    const tableRows = [];

    for (const row of rows) {
      const cells = [...row.children].filter(cell =>
        ["td", "th"].includes(cell.tagName.toLowerCase())
      );

      const tableCells = [];

      for (const cell of cells) {
        const isHeader = cell.tagName.toLowerCase() === "th";

        tableCells.push(new docx.TableCell({
          children: await tableCellChildren(cell, context, docx),
          shading: isHeader
            ? {
                type: docx.ShadingType.CLEAR,
                fill: "F3F3F3"
              }
            : undefined,
          margins: {
            top: 90,
            right: 110,
            bottom: 90,
            left: 110
          }
        }));
      }

      if (tableCells.length) {
        tableRows.push(new docx.TableRow({
          children: tableCells,
          tableHeader: row.parentElement?.tagName?.toLowerCase() === "thead"
        }));
      }
    }

    if (!tableRows.length) return [];

    return [new docx.Table({
      rows: tableRows,
      width: {
        size: 100,
        type: docx.WidthType.PERCENTAGE
      },
      layout: docx.TableLayoutType.AUTOFIT
    })];
  }

  async function figureToDocx(figure, context, docx) {
    const output = [];
    const image = figure.querySelector("img");
    const caption = figure.querySelector("figcaption")?.textContent?.trim();
    const align = figure.dataset.imageAlign || figure.style.textAlign || "center";

    if (image) {
      const run = await imageRunFromNode(image, context, docx);
      output.push(new docx.Paragraph({
        alignment: docxAlignment(align, docx),
        children: [run],
        spacing: { before: 120, after: caption ? 40 : 120 }
      }));
    }

    if (caption) {
      output.push(new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        children: [new docx.TextRun({
          text: caption,
          italics: true,
          color: "777777",
          size: 18
        })],
        spacing: { after: 120 }
      }));
    }

    return output;
  }

  async function blockToDocx(node, context, docx) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || "";
      if (!text.trim()) return [];

      return [new docx.Paragraph({
        children: [new docx.TextRun(text)]
      })];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const tag = node.tagName.toLowerCase();

    if (node.classList.contains("manual-page-break")) {
      return [new docx.Paragraph({
        children: [new docx.PageBreak()]
      })];
    }

    if (tag === "figure") {
      return figureToDocx(node, context, docx);
    }

    if (tag === "table") {
      return tableToDocx(node, context, docx);
    }

    if (["ul", "ol"].includes(tag)) {
      return listToDocx(node, context, docx);
    }

    if (tag === "hr") {
      return [new docx.Paragraph({
        border: {
          bottom: {
            style: docx.BorderStyle.SINGLE,
            color: "999999",
            size: 8,
            space: 1
          }
        },
        spacing: { before: 120, after: 120 },
        children: [new docx.TextRun("")]
      })];
    }

    if (
      ["p", "h1", "h2", "h3", "blockquote", "pre"].includes(tag) ||
      node.matches?.(".screenplay-title-name, .screenplay-title-credit, .screenplay-title-author, .screenplay-title-draft, .screenplay-title-contact, .screenplay-title-copyright")
    ) {
      return [await paragraphFromElement(node, context, docx)];
    }

    if (node.classList.contains("text-box")) {
      const output = [];

      for (const child of node.childNodes) {
        const blocks = await blockToDocx(child, context, docx);

        blocks.forEach(block => {
          if (block instanceof docx.Paragraph) {
            block.options = block.options || {};
          }
        });

        output.push(...blocks);
      }

      return output.length
        ? output
        : [new docx.Paragraph("")];
    }

    const children = [];

    for (const child of node.childNodes) {
      children.push(...await blockToDocx(child, context, docx));
    }

    if (children.length) return children;

    return [await paragraphFromElement(node, context, docx)];
  }

  function makeNumberingConfig(docx) {
    const formats = [
      docx.LevelFormat.DECIMAL,
      docx.LevelFormat.LOWER_LETTER,
      docx.LevelFormat.LOWER_ROMAN,
      docx.LevelFormat.DECIMAL,
      docx.LevelFormat.LOWER_LETTER,
      docx.LevelFormat.LOWER_ROMAN
    ];

    return {
      config: [{
        reference: "atero-numbered-list",
        levels: formats.map((format, level) => ({
          level,
          format,
          text: `%${level + 1}.`,
          alignment: docx.AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: {
                left: 720 + level * 360,
                hanging: 360
              }
            }
          }
        }))
      }]
    };
  }

  function headerParagraph(text, alignment, docx) {
    return new docx.Paragraph({
      alignment,
      children: [new docx.TextRun({
        text: text || "",
        size: 18,
        color: "666666"
      })]
    });
  }

  function pageNumberParagraph(position, leadingText, docx) {
    const alignment = position.endsWith("right")
      ? docx.AlignmentType.RIGHT
      : docx.AlignmentType.CENTER;

    const children = [];

    if (leadingText) {
      children.push(new docx.TextRun({
        text: `${leadingText} `,
        size: 18,
        color: "666666"
      }));
    }

    children.push(new docx.TextRun({
      children: [docx.PageNumber.CURRENT],
      size: 18,
      color: "666666"
    }));

    return new docx.Paragraph({ alignment, children });
  }

  function buildDocxHeadersFooters(context, docx) {
    if (!context.includeHeaderFooter) {
      return {};
    }

    const hf = context.settings.headerFooter;
    const headers = {};
    const footers = {};

    const headerChildren = [];
    const footerChildren = [];

    if (hf.header) {
      headerChildren.push(
        headerParagraph(hf.header, docx.AlignmentType.LEFT, docx)
      );
    }

    if (hf.footer) {
      footerChildren.push(
        headerParagraph(hf.footer, docx.AlignmentType.LEFT, docx)
      );
    }

    if (hf.showPageNumbers) {
      if (hf.pageNumberPosition === "header-right") {
        headerChildren.push(
          pageNumberParagraph("header-right", "", docx)
        );
      } else {
        footerChildren.push(
          pageNumberParagraph(hf.pageNumberPosition, "", docx)
        );
      }
    }

    if (headerChildren.length) {
      headers.default = new docx.Header({ children: headerChildren });
    }

    if (footerChildren.length) {
      footers.default = new docx.Footer({ children: footerChildren });
    }

    if (hf.differentFirstPage) {
      const firstHeaderChildren = hf.firstHeader
        ? [headerParagraph(hf.firstHeader, docx.AlignmentType.LEFT, docx)]
        : [new docx.Paragraph("")];

      const firstFooterChildren = hf.firstFooter
        ? [headerParagraph(hf.firstFooter, docx.AlignmentType.LEFT, docx)]
        : [new docx.Paragraph("")];

      headers.first = new docx.Header({ children: firstHeaderChildren });
      footers.first = new docx.Footer({ children: firstFooterChildren });
    }

    return { headers, footers };
  }

  async function exportDOCX(context) {
    const docx = await ensureDocxLibrary();
    const container = document.createElement("div");
    container.innerHTML = context.content;

    const page = context.settings.page;
    const pageContentWidth = Math.max(
      100,
      page.width - page.marginLeft - page.marginRight
    );

    const converterContext = {
      pageContentWidth
    };

    const children = [];

    if (context.includeTitle) {
      children.push(new docx.Paragraph({
        heading: docx.HeadingLevel.TITLE,
        children: [new docx.TextRun({
          text: context.title,
          bold: true
        })],
        spacing: { after: 300 }
      }));
    }

    for (const node of container.childNodes) {
      children.push(
        ...(await blockToDocx(node, converterContext, docx))
      );
    }

    if (!children.length) {
      children.push(new docx.Paragraph(""));
    }

    const headerFooter = buildDocxHeadersFooters(context, docx);

    const documentFile = new docx.Document({
      creator: "Atero Write",
      title: context.title,
      description: "Documento exportado pelo Atero Write",
      numbering: makeNumberingConfig(docx),
      sections: [{
        properties: {
          titlePage: Boolean(
            context.settings.headerFooter.differentFirstPage &&
            context.includeHeaderFooter
          ),
          page: {
            size: {
              width: pxToTwip(page.width),
              height: pxToTwip(page.height),
              orientation: page.orientation === "landscape"
                ? docx.PageOrientation.LANDSCAPE
                : docx.PageOrientation.PORTRAIT
            },
            margin: {
              top: pxToTwip(page.marginTop),
              right: pxToTwip(page.marginRight),
              bottom: pxToTwip(page.marginBottom),
              left: pxToTwip(page.marginLeft),
              header: 420,
              footer: 420
            }
          }
        },
        ...headerFooter,
        children
      }]
    });

    const blob = await docx.Packer.toBlob(documentFile);
    downloadBlob(blob, `${context.title}.docx`);
  }

  /* =======================================================
     ORQUESTRAÇÃO
     ======================================================= */

  async function buildExportContext() {
    requestEditorSave();
    await wait(60);

    return {
      title: documentName(),
      content: getCurrentContentHTML(),
      settings: getDocumentSettings(),
      screenplay: loadDocumentRecord()?.screenplaySettings || window.AteroWriteScreenplay?.getSettings?.() || null,
      includeTitle: Boolean(elements.exportIncludeTitle?.checked),
      includeHeaderFooter: Boolean(
        elements.exportIncludeHeaderFooter?.checked
      ),
      openAfter: Boolean(elements.exportOpenAfter?.checked)
    };
  }

  async function exportDocument(format) {
    const context = await buildExportContext();

    const handlers = {
      pdf: exportPDF,
      docx: exportDOCX,
      html: exportHTML,
      txt: exportTXT,
      md: exportMarkdown,
      rtf: exportRTF,
      fountain: exportFountain,
      awrite: exportAteroBackup
    };

    const handler = handlers[format];

    if (!handler) {
      throw new Error("Formato de exportação desconhecido.");
    }

    await handler(context);
  }

  function selectedFormat() {
    return elements.exportForm
      ?.querySelector('input[name="exportFormat"]:checked')
      ?.value || "pdf";
  }

  function updateFormatHelp() {
    const format = selectedFormat();

    if (elements.exportFormatHelp) {
      elements.exportFormatHelp.textContent =
        FORMAT_HELP[format] || "";
    }

    $$(".export-format-card").forEach(card => {
      const input = card.querySelector('input[name="exportFormat"]');
      card.classList.toggle("is-selected", Boolean(input?.checked));
    });
  }

  function openExportDialog() {
    if (!elements.exportDialog) return;

    setExportStatus("", "idle");
    updateFormatHelp();
    elements.exportDialog.showModal();
  }

  async function handleExportSubmit(event) {
    event.preventDefault();

    if (exporting) return;

    const format = selectedFormat();

    setExportBusy(true);
    setExportStatus(
      format === "docx"
        ? "Preparando o documento Word…"
        : format === "pdf"
          ? "Gerando o arquivo PDF…"
          : "Preparando o arquivo…",
      "working"
    );

    try {
      await exportDocument(format);

      setExportStatus(
        format === "pdf"
          ? "PDF baixado com sucesso."
          : "Arquivo exportado com sucesso.",
        "success"
      );

      setTimeout(() => {
        if (elements.exportDialog?.open) {
          elements.exportDialog.close();
        }
      }, 700);
    } catch (error) {
      console.error("Falha na exportação:", error);

      setExportStatus(
        error?.message || "Não foi possível exportar o documento.",
        "error"
      );
    } finally {
      setExportBusy(false);
    }
  }

  function initializeExport() {
    if (
      !elements.exportButton ||
      !elements.exportDialog ||
      !elements.exportForm
    ) {
      console.warn(
        "A interface de exportação do Atero Write não foi encontrada."
      );
      return;
    }

    elements.exportButton.addEventListener("click", openExportDialog);
    elements.exportForm.addEventListener("submit", handleExportSubmit);

    elements.exportForm
      .querySelectorAll('input[name="exportFormat"]')
      .forEach(input => {
        input.addEventListener("change", updateFormatHelp);
      });

    elements.exportDialog.addEventListener("close", () => {
      if (!exporting) {
        setExportStatus("", "idle");
      }
    });

    updateFormatHelp();
  }

  window.AteroWriteExport = {
    exportDocument,
    getCurrentContentHTML,
    getDocumentSettings,
    htmlToMarkdown,
    htmlToRTF,
    screenplayToFountain
  };

  initializeExport();
})();
