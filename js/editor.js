"use strict";

/* =========================================================
   ATERO WRITE — EDITOR 2
   ========================================================= */

const STORAGE_KEYS = {
  documents: "atero_write_documents",
  preferences: "atero_write_editor_preferences_v2",
  versions: "atero_write_versions",
  recovery: "atero_write_recovery"
};

const AUTOSAVE_DELAY = 750;
const RECOVERY_DELAY = 250;
const VERSION_INTERVAL = 5 * 60 * 1000;
const MAX_VERSIONS = 25;
const MAX_UNDO = 100;

const PAGE_PRESETS = {
  A4: { width: 794, height: 1123 },
  Letter: { width: 816, height: 1056 },
  Legal: { width: 816, height: 1344 }
};

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
  },
  ruler: {
    visible: true,
    leftIndent: 0,
    rightIndent: 0,
    firstLineIndent: 0,
    tabs: []
  },
  view: {
    mode: "pages",
    zoom: 100,
    sidebarHidden: false,
    split: false,
    read: false
  }
};

const SYMBOLS = [
  "—", "–", "…", "“", "”", "‘", "’", "•", "·", "°",
  "±", "×", "÷", "≈", "≠", "≤", "≥", "∞", "√", "∑",
  "∫", "∂", "∆", "π", "α", "β", "γ", "δ", "λ", "μ",
  "σ", "φ", "Ω", "→", "←", "↔", "↑", "↓", "©", "®",
  "™", "€", "£", "¥", "§", "¶", "†", "‡", "‰", "¼",
  "½", "¾", "¹", "²", "³", "₀", "₁", "₂", "₃", "₄",
  "₅", "₆", "₇", "₈", "₉", "₊", "₋", "₌", "ℓ", "Å"
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const elements = {
  body: document.body,
  title: $("#documentTitle"),
  saveStatus: $("#saveStatus"),
  saveStatusText: $("#saveStatusText"),
  sidebarDocumentName: $("#sidebarDocumentName"),
  wordCount: $("#wordCount"),
  characterCount: $("#characterCount"),
  pageCount: $("#pageCount"),
  readingTime: $("#readingTime"),
  bottomWordCount: $("#bottomWordCount"),
  bottomPageCount: $("#bottomPageCount"),
  selectionCount: $("#selectionCount"),
  workspace: $("#editorWorkspace"),
  stage: $("#documentStage"),
  primaryPane: $("#primaryPane"),
  secondaryPane: $("#secondaryPane"),
  pagesContainer: $("#pagesContainer"),
  flowEditor: $("#flowEditor"),
  splitEditor: $("#splitEditor"),
  editorRuler: $("#editorRuler"),
  rulerInner: $("#rulerInner"),
  rulerScale: $("#rulerScale"),
  rulerTabs: $("#rulerTabs"),
  firstIndentMarker: $("#firstIndentMarker"),
  leftIndentMarker: $("#leftIndentMarker"),
  rightIndentMarker: $("#rightIndentMarker"),
  pageModeButton: $("#pageModeButton"),
  flowModeButton: $("#flowModeButton"),
  toggleSidebarButton: $("#toggleSidebarButton"),
  zoomRange: $("#zoomRange"),
  zoomValue: $("#zoomValue"),
  zoomOutButton: $("#zoomOutButton"),
  zoomInButton: $("#zoomInButton"),
  undoButton: $("#undoButton"),
  redoButton: $("#redoButton"),
  findButton: $("#findButton"),
  versionsButton: $("#versionsButton"),
  readModeButton: $("#readModeButton"),
  focusModeButton: $("#focusModeButton"),
  viewReadModeButton: $("#viewReadModeButton"),
  viewFocusModeButton: $("#viewFocusModeButton"),
  blockFormat: $("#blockFormat"),
  fontFamily: $("#fontFamily"),
  fontSize: $("#fontSize"),
  textColor: $("#textColor"),
  highlightColor: $("#highlightColor"),
  listStyle: $("#listStyle"),
  lineHeight: $("#lineHeight"),
  spaceBefore: $("#spaceBefore"),
  spaceAfter: $("#spaceAfter"),
  firstLineIndent: $("#firstLineIndent"),
  caseTransform: $("#caseTransform"),
  formatPainterButton: $("#formatPainterButton"),
  pageBreakButton: $("#pageBreakButton"),
  horizontalRuleButton: $("#horizontalRuleButton"),
  textBoxButton: $("#textBoxButton"),
  tocButton: $("#tocButton"),
  insertLinkButton: $("#insertLinkButton"),
  bookmarkButton: $("#bookmarkButton"),
  footnoteButton: $("#footnoteButton"),
  citationButton: $("#citationButton"),
  tableButton: $("#tableButton"),
  imageButton: $("#imageButton"),
  captionButton: $("#captionButton"),
  specialCharsButton: $("#specialCharsButton"),
  imageInput: $("#imageInput"),
  pageSetupButton: $("#pageSetupButton"),
  headerFooterButton: $("#headerFooterButton"),
  columnsSelect: $("#columnsSelect"),
  applyColumnsButton: $("#applyColumnsButton"),
  pageMarginLeft: $("#pageMarginLeft"),
  pageMarginRight: $("#pageMarginRight"),
  pageMarginTop: $("#pageMarginTop"),
  pageMarginBottom: $("#pageMarginBottom"),
  toggleRulerButton: $("#toggleRulerButton"),
  splitViewButton: $("#splitViewButton"),
  goToPageButton: $("#goToPageButton"),
  sidebarGoToPage: $("#sidebarGoToPage"),
  sidebarPageSetup: $("#sidebarPageSetup"),
  statusPageButton: $("#statusPageButton"),
  findPanel: $("#findPanel"),
  findInput: $("#findInput"),
  replaceInput: $("#replaceInput"),
  findCounter: $("#findCounter"),
  findPrevious: $("#findPrevious"),
  findNext: $("#findNext"),
  replaceCurrent: $("#replaceCurrent"),
  replaceAll: $("#replaceAll"),
  matchCase: $("#matchCase"),
  closeFindPanel: $("#closeFindPanel"),
  contextMenu: $("#contextMenu"),
  pastePopover: $("#pastePopover"),
  linkDialog: $("#linkDialog"),
  linkForm: $("#linkForm"),
  linkType: $("#linkType"),
  linkUrlField: $("#linkUrlField"),
  linkBookmarkField: $("#linkBookmarkField"),
  linkUrl: $("#linkUrl"),
  linkBookmark: $("#linkBookmark"),
  closeLinkDialog: $("#closeLinkDialog"),
  cancelLinkDialog: $("#cancelLinkDialog"),
  bookmarkDialog: $("#bookmarkDialog"),
  bookmarkForm: $("#bookmarkForm"),
  bookmarkName: $("#bookmarkName"),
  footnoteDialog: $("#footnoteDialog"),
  footnoteForm: $("#footnoteForm"),
  footnoteText: $("#footnoteText"),
  citationDialog: $("#citationDialog"),
  citationForm: $("#citationForm"),
  citationAuthor: $("#citationAuthor"),
  citationYear: $("#citationYear"),
  citationSource: $("#citationSource"),
  citationFormat: $("#citationFormat"),
  tableDialog: $("#tableDialog"),
  tableForm: $("#tableForm"),
  tableRows: $("#tableRows"),
  tableColumns: $("#tableColumns"),
  tableHeader: $("#tableHeader"),
  specialCharsDialog: $("#specialCharsDialog"),
  symbolsGrid: $("#symbolsGrid"),
  pageSetupDialog: $("#pageSetupDialog"),
  pageSetupForm: $("#pageSetupForm"),
  pagePreset: $("#pagePreset"),
  pageOrientation: $("#pageOrientation"),
  customPageWidth: $("#customPageWidth"),
  customPageHeight: $("#customPageHeight"),
  marginPreset: $("#marginPreset"),
  pageColor: $("#pageColor"),
  setupMarginTop: $("#setupMarginTop"),
  setupMarginRight: $("#setupMarginRight"),
  setupMarginBottom: $("#setupMarginBottom"),
  setupMarginLeft: $("#setupMarginLeft"),
  headerFooterDialog: $("#headerFooterDialog"),
  headerFooterForm: $("#headerFooterForm"),
  headerText: $("#headerText"),
  footerText: $("#footerText"),
  showPageNumbers: $("#showPageNumbers"),
  pageNumberPosition: $("#pageNumberPosition"),
  differentFirstPage: $("#differentFirstPage"),
  firstHeaderText: $("#firstHeaderText"),
  firstFooterText: $("#firstFooterText"),
  goToPageDialog: $("#goToPageDialog"),
  goToPageForm: $("#goToPageForm"),
  goToPageInput: $("#goToPageInput"),
  versionsDialog: $("#versionsDialog"),
  versionsList: $("#versionsList"),
  recoveryDialog: $("#recoveryDialog"),
  restoreRecovery: $("#restoreRecovery"),
  discardRecovery: $("#discardRecovery")
};

let currentDocumentId = null;
let settings = cloneValue(DEFAULT_SETTINGS);
let canonicalHTML = "";
let saveTimer = null;
let recoveryTimer = null;
let isDirty = false;
let lastVersionAt = 0;
let savedRange = null;
let searchMatches = [];
let searchIndex = -1;
let pendingPaste = null;
let formatPainter = null;
let formatPainterArmed = false;
let undoStack = [];
let redoStack = [];
let lastUndoCapture = 0;
let applyingHistory = false;
let currentSource = "pages";
let repaginationTimer = null;
let selectedImage = null;
let imageToolbar = null;
let imageResizeSession = null;
let documentReadOnlyBecauseLock = false;
let documentWriteQueue = Promise.resolve();
let mutationGeneration = 0;
let saveGeneration = 0;

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    try { return structuredClone(value); } catch { /* Usa o fallback abaixo. */ }
  }

  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepMerge(target, source) {
  if (Array.isArray(target)) {
    return Array.isArray(source) ? cloneValue(source) : cloneValue(target);
  }

  if (!isPlainObject(target)) {
    return source !== undefined && typeof source === typeof target
      ? cloneValue(source)
      : cloneValue(target);
  }

  const output = cloneValue(target);
  if (!isPlainObject(source)) return output;

  Object.keys(target).forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return;
    const targetValue = target[key];
    const sourceValue = source[key];

    if (isPlainObject(targetValue)) {
      output[key] = deepMerge(targetValue, sourceValue);
    } else if (Array.isArray(targetValue)) {
      output[key] = Array.isArray(sourceValue) ? cloneValue(sourceValue) : cloneValue(targetValue);
    } else if (
      typeof sourceValue === typeof targetValue &&
      !(typeof sourceValue === "number" && !Number.isFinite(sourceValue))
    ) {
      output[key] = cloneValue(sourceValue);
    }
  });

  return output;
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch (error) {
    console.error("Não foi possível interpretar os dados salvos:", error);
    return fallback;
  }
}

function storageGet(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    console.warn(`Não foi possível ler "${key}" do armazenamento local:`, error);
    return fallback;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Não foi possível gravar "${key}" no armazenamento local:`, error);
    return false;
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Não foi possível remover "${key}" do armazenamento local:`, error);
    return false;
  }
}

function createId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTitle(value) {
  return value.replace(/\s+/g, " ").trim() || "Documento sem título";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounceRepagination(callback, delay = 35) {
  clearTimeout(repaginationTimer);
  repaginationTimer = setTimeout(callback, delay);
}

function textToWords(text) {
  return text.trim() ? text.trim().split(/\s+/u).filter(Boolean) : [];
}

function getPlainTextFromHTML(html) {
  const box = document.createElement("div");
  box.innerHTML = html;
  return (box.innerText || "").replace(/\u00a0/g, " ").trim();
}

function setSaveStatus(state, message) {
  if (elements.saveStatus) elements.saveStatus.className = `save-status is-${state}`;
  if (elements.saveStatusText) elements.saveStatusText.textContent = message;
}

function validateEditorInterface() {
  const missing = Object.entries(elements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`A interface do editor está incompleta. Elementos ausentes: ${missing.join(", ")}.`);
  }
}

function openDialog(dialog, focusElement = null) {
  saveSelection();
  dialog?.showModal();
  requestAnimationFrame(() => focusElement?.focus());
}

function closeDialog(dialog) {
  if (dialog?.open) {
    dialog.close();
  }
  restoreSelection();
}

/* =========================================================
   ARMAZENAMENTO
   ========================================================= */

function loadDocuments() {
  const managed = window.AteroWriteData?.getDocumentsSync?.();
  if (Array.isArray(managed)) return managed;
  const value = safeParse(storageGet(STORAGE_KEYS.documents, "[]"), []);
  return Array.isArray(value) ? value : [];
}

function saveDocuments(documents) {
  const snapshot = cloneValue(documents);
  storageSet(STORAGE_KEYS.documents, JSON.stringify(snapshot));

  const write = () => Promise.resolve(
    window.AteroWriteData?.saveDocuments?.(snapshot)
  );

  // Serializa as gravações para impedir que uma escrita antiga termine depois
  // de uma nova e volte o documento para um estado anterior.
  const operation = documentWriteQueue
    .catch(() => undefined)
    .then(write);

  documentWriteQueue = operation;
  operation.catch(error => {
    console.error("Falha ao sincronizar documentos com IndexedDB:", error);
    setSaveStatus("error", "Falha no armazenamento");
  });
  return operation;
}

function createFallbackDocument(documents) {
  const now = new Date().toISOString();
  const item = {
    schemaVersion: window.AteroWriteData?.schemaVersion || 2,
    id: createId("document"),
    projectId: null,
    type: "document",
    name: "Documento sem título",
    content: "",
    editorSettings: cloneValue(DEFAULT_SETTINGS),
    screenplaySettings: {},
    createdAt: now,
    updatedAt: now,
    revision: 0,
    metadata: {}
  };

  documents.push(item);
  saveDocuments(documents);

  history.replaceState(null, "", `editor.html?id=${encodeURIComponent(item.id)}`);
  return item;
}

function preferencesKey() {
  return `${STORAGE_KEYS.preferences}_${currentDocumentId || "global"}`;
}

function savePreferences() {
  if (!currentDocumentId) return;
  storageSet(preferencesKey(), JSON.stringify(settings.view));
  Promise.resolve(window.AteroWriteData?.savePreference?.(currentDocumentId, settings.view)).catch(error => {
    console.warn("Não foi possível salvar preferências no IndexedDB:", error);
  });
}

function loadPreferences() {
  const managed = window.AteroWriteData?.getPreferenceSync?.(currentDocumentId);
  const stored = managed || safeParse(storageGet(preferencesKey()), null);
  if (stored) {
    settings.view = deepMerge(DEFAULT_SETTINGS.view, stored);
  }
}

/* =========================================================
   CONTEÚDO E SELEÇÃO
   ========================================================= */

function pageBodies() {
  return $$(".page-body");
}

function activeEditor() {
  if (elements.splitEditor.contains(document.activeElement)) {
    return elements.splitEditor;
  }

  if (settings.view.mode === "flow") {
    return elements.flowEditor;
  }

  return document.activeElement?.classList?.contains("page-body")
    ? document.activeElement
    : pageBodies()[0] || null;
}

function cleanEditorClone(root) {
  const clone = root.cloneNode(true);

  clone.querySelectorAll(".search-hit").forEach(mark => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });

  clone.querySelectorAll("[data-temporary]").forEach(node => node.remove());
  clone.querySelectorAll(".is-image-selected").forEach(node => node.classList.remove("is-image-selected"));
  clone.normalize();
  return clone;
}

function collectPagesHTML() {
  const wrapper = document.createElement("div");

  pageBodies().forEach(body => {
    const clone = cleanEditorClone(body);
    [...clone.childNodes].forEach(node => wrapper.append(node));
  });

  return wrapper.innerHTML;
}

function serializeContent() {
  if (currentSource === "split") {
    return cleanEditorClone(elements.splitEditor).innerHTML;
  }

  if (currentSource === "flow") {
    return cleanEditorClone(elements.flowEditor).innerHTML;
  }

  return collectPagesHTML();
}

function updateCanonicalFromSource(source = currentSource) {
  currentSource = source;
  canonicalHTML = serializeContent();
  return canonicalHTML;
}

function syncInactiveEditors() {
  if (currentSource !== "flow") {
    elements.flowEditor.innerHTML = canonicalHTML;
  }

  if (currentSource !== "split") {
    elements.splitEditor.innerHTML = canonicalHTML;
  }
}

function saveSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const root = activeEditor();

  if (root?.contains(range.commonAncestorContainer) || root === range.commonAncestorContainer) {
    savedRange = range.cloneRange();
  }

  updateSelectionStatistics();
}

function restoreSelection() {
  if (!savedRange) {
    activeEditor()?.focus();
    return;
  }

  try {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
  } catch {
    activeEditor()?.focus();
  }
}

function boundaryTextOffset(root, container, offset) {
  try {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(container, offset);
    return range.toString().length;
  } catch {
    return 0;
  }
}

function captureSelectionBookmark() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || settings.view.mode !== "pages") return null;

  const range = selection.getRangeAt(0);
  const bodies = pageBodies();
  const startBodyIndex = bodies.findIndex(body => body.contains(range.startContainer) || body === range.startContainer);
  const endBodyIndex = bodies.findIndex(body => body.contains(range.endContainer) || body === range.endContainer);

  if (startBodyIndex < 0 || endBodyIndex < 0) return null;

  const prefixStart = bodies.slice(0, startBodyIndex).reduce((sum, body) => sum + body.textContent.length, 0);
  const prefixEnd = bodies.slice(0, endBodyIndex).reduce((sum, body) => sum + body.textContent.length, 0);

  return {
    start: prefixStart + boundaryTextOffset(bodies[startBodyIndex], range.startContainer, range.startOffset),
    end: prefixEnd + boundaryTextOffset(bodies[endBodyIndex], range.endContainer, range.endOffset)
  };
}

function locateTextOffset(roots, targetOffset) {
  let remaining = Math.max(0, targetOffset);

  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      if (remaining <= node.nodeValue.length) {
        return { node, offset: remaining };
      }
      remaining -= node.nodeValue.length;
    }
  }

  const lastRoot = roots.at(-1);
  return { node: lastRoot || elements.flowEditor, offset: lastRoot?.childNodes.length || 0 };
}

function restoreSelectionBookmark(bookmark) {
  if (!bookmark) return;

  const roots = pageBodies();
  if (!roots.length) return;

  const start = locateTextOffset(roots, bookmark.start);
  const end = locateTextOffset(roots, bookmark.end);
  const range = document.createRange();

  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  } catch {
    roots[0].focus();
  }
}


function sourceFromRoot(root) {
  if (root === elements.flowEditor) return "flow";
  if (root === elements.splitEditor) return "split";
  return "pages";
}

function selectionBelongsToRoot(selection, root) {
  if (!selection || !root || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  return root === range.commonAncestorContainer || root.contains(range.commonAncestorContainer);
}

function plantSelectionMarkers() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || settings.view.mode !== "pages") return null;

  const range = selection.getRangeAt(0);
  const root = pageBodies().find(body => body === range.commonAncestorContainer || body.contains(range.commonAncestorContainer));
  if (!root) return null;

  const token = createId("selection");
  const collapsed = range.collapsed;
  const makeMarker = type => {
    const marker = document.createElement("span");
    marker.dataset.selectionMarker = `${token}-${type}`;
    marker.contentEditable = "false";
    marker.setAttribute("aria-hidden", "true");
    marker.style.cssText = "display:inline-block;width:0;height:0;overflow:hidden;line-height:0;pointer-events:none";
    return marker;
  };

  const startMarker = makeMarker("start");
  let endMarker = null;

  if (!collapsed) {
    endMarker = makeMarker("end");
    const endRange = range.cloneRange();
    endRange.collapse(false);
    endRange.insertNode(endMarker);
  }

  const startRange = range.cloneRange();
  startRange.collapse(true);
  startRange.insertNode(startMarker);

  return { token, collapsed };
}

function restoreSelectionFromMarkers(markerState) {
  if (!markerState) return false;

  const start = elements.pagesContainer.querySelector(
    `[data-selection-marker="${CSS.escape(`${markerState.token}-start`)}"]`
  );
  const end = markerState.collapsed
    ? null
    : elements.pagesContainer.querySelector(
        `[data-selection-marker="${CSS.escape(`${markerState.token}-end`)}"]`
      );

  if (!start || (!markerState.collapsed && !end)) {
    elements.pagesContainer.querySelectorAll("[data-selection-marker]").forEach(marker => marker.remove());
    return false;
  }

  const range = document.createRange();
  const selection = window.getSelection();

  try {
    range.setStartBefore(start);
    if (markerState.collapsed) {
      range.collapse(true);
    } else {
      range.setEndBefore(end);
    }

    const targetRoot = start.closest(".page-body");
    targetRoot?.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);
    start.remove();
    end?.remove();
    savedRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    return true;
  } catch {
    start.remove();
    end?.remove();
    return false;
  }
}

function placeCaretAtStart(root) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange = range.cloneRange();
}

function placeCaretAtEnd(root) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange = range.cloneRange();
}

function scrollCaretPageIntoView() {
  requestAnimationFrame(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const node = selection.anchorNode;
    const element = node?.nodeType === Node.ELEMENT_NODE
      ? node
      : node?.parentElement;
    const body = element?.closest?.('.page-body');
    const page = body?.closest?.('.editor-page');

    page?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'auto'
    });
  });
}

/* =========================================================
   PAGINAÇÃO
   ========================================================= */

function pageOverflows(body) {
  return body.scrollHeight > body.clientHeight + 1;
}

function createPage(manualStart = false) {
  const page = document.createElement("section");
  page.className = "editor-page";
  if (manualStart) page.dataset.manualStart = "true";

  const surface = document.createElement("div");
  surface.className = "page-surface";

  const header = document.createElement("div");
  header.className = "page-header";

  const body = document.createElement("div");
  body.className = "page-body";
  body.contentEditable = String(!settings.view.read);
  body.spellcheck = true;
  body.setAttribute("aria-label", "Conteúdo da página");

  const footer = document.createElement("div");
  footer.className = "page-footer";

  const badge = document.createElement("span");
  badge.className = "page-number-badge";

  surface.append(header, body, footer, badge);
  page.append(surface);
  elements.pagesContainer.append(page);

  bindEditorRoot(body, "pages");
  return body;
}

function findTextBoundary(root, targetOffset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, targetOffset);
  let node;
  let last = null;

  while ((node = walker.nextNode())) {
    last = node;
    if (remaining <= node.nodeValue.length) {
      return { node, offset: remaining };
    }
    remaining -= node.nodeValue.length;
  }

  return last
    ? { node: last, offset: last.nodeValue.length }
    : { node: root, offset: root.childNodes.length };
}

function cloneElementTextRange(element, startOffset, endOffset) {
  const shell = element.cloneNode(false);
  const range = document.createRange();
  const start = findTextBoundary(element, startOffset);
  const end = findTextBoundary(element, endOffset);

  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    shell.append(range.cloneContents());
    return shell;
  } catch {
    return null;
  }
}

function splitNodeToFit(body, node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue;
    if (!text.trim()) return null;

    let low = 1;
    let high = text.length - 1;
    let best = 0;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const test = document.createTextNode(text.slice(0, middle));
      body.append(test);
      const fits = !pageOverflows(body);
      test.remove();

      if (fits) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    if (!best) return null;
    const wordBreak = text.lastIndexOf(" ", best);
    const cut = wordBreak > Math.max(0, best - 80) ? wordBreak + 1 : best;
    return [document.createTextNode(text.slice(0, cut)), document.createTextNode(text.slice(cut))];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  if (node.matches("table, figure, .text-box, .auto-toc, .footnotes, hr")) return null;

  const total = node.textContent.length;
  if (total < 2) return null;

  let low = 1;
  let high = total - 1;
  let best = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const prefix = cloneElementTextRange(node, 0, middle);
    if (!prefix) break;
    body.append(prefix);
    const fits = !pageOverflows(body);
    prefix.remove();

    if (fits) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  if (!best) return null;

  const text = node.textContent;
  const wordBreak = text.lastIndexOf(" ", best);
  const cut = wordBreak > Math.max(0, best - 80) ? wordBreak + 1 : best;
  const prefix = cloneElementTextRange(node, 0, cut);
  const suffix = cloneElementTextRange(node, cut, total);

  if (!prefix || !suffix) return null;
  prefix.dataset.splitContinuation = "end";
  suffix.dataset.splitContinuation = "start";
  return [prefix, suffix];
}

function screenplayCarryNodes(body, incomingNode) {
  if (incomingNode?.nodeType !== Node.ELEMENT_NODE) return [];
  const incomingType = incomingNode.dataset?.screenplayType;
  const children = [...body.children].filter(child => !child.matches(".manual-page-break"));
  const carry = [];

  if (incomingType !== "scene" && children.at(-1)?.dataset?.screenplayType === "scene") {
    carry.push(children.at(-1));
  } else if (["parenthetical", "dialogue"].includes(incomingType)) {
    let index = children.length - 1;
    if (incomingType === "dialogue" && children[index]?.dataset?.screenplayType === "parenthetical") {
      carry.unshift(children[index]);
      index -= 1;
    }
    if (children[index]?.dataset?.screenplayType === "character") {
      carry.unshift(children[index]);
    }
  }

  return carry;
}

function appendNodeWithPagination(node, state) {
  if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains("manual-page-break")) {
    state.body = createPage(true);
    state.body.append(node);
    return;
  }

  state.body.append(node);

  if (!pageOverflows(state.body)) return;

  node.remove();
  const bodyHadContent = [...state.body.childNodes].some(child => {
    if (child.nodeType === Node.TEXT_NODE) return child.nodeValue.trim();
    return !child.classList?.contains("manual-page-break");
  });

  if (bodyHadContent) {
    const carry = screenplayCarryNodes(state.body, node);
    carry.forEach(item => item.remove());
    state.body = createPage(false);
    carry.forEach(item => state.body.append(item));
    state.body.append(node);
  } else {
    state.body.append(node);
  }

  while (pageOverflows(state.body)) {
    const currentNode = state.body.lastChild;
    currentNode.remove();
    const split = splitNodeToFit(state.body, currentNode);

    if (!split) {
      state.body.append(currentNode);
      break;
    }

    const [prefix, suffix] = split;
    state.body.append(prefix);
    state.body = createPage(false);
    state.body.append(suffix);
  }
}

function pageBodyHasIntentionalContent(body) {
  if (!body) return false;

  const visibleText = (body.textContent || "")
    .replaceAll("\u200B", "")
    .replaceAll("\u00A0", " ")
    .trim();

  if (visibleText) return true;

  // Parágrafos vazios e <br> também contam: eles podem ter sido criados
  // pelo usuário pressionando Enter até alcançar uma página nova.
  return Boolean(body.querySelector(
    "p, div, h1, h2, h3, blockquote, pre, ul, ol, li, br, " +
    "img, figure, table, hr, .text-box, .manual-page-break, [data-screenplay-type]"
  ));
}

function buildPagesFromHTML(html, bookmark = null) {
  elements.pagesContainer.replaceChildren();
  const temporary = document.createElement("div");
  temporary.innerHTML = html || "<p><br></p>";

  const state = { body: createPage(false) };
  [...temporary.childNodes].forEach(node => appendNodeWithPagination(node, state));

  const bodies = pageBodies();
  const lastBody = bodies.at(-1);

  // Remove somente uma página realmente vazia e acidental. Uma página que
  // contenha parágrafos vazios deve permanecer, pois pode ter sido criada
  // deliberadamente apenas com Enter.
  if (lastBody && bodies.length > 1 && !pageBodyHasIntentionalContent(lastBody)) {
    lastBody.closest(".editor-page")?.remove();
  }

  renderPageChrome();
  refreshMetrics();
  updateRuler();
  restoreSelectionBookmark(bookmark);
}

function repaginate({ preserveSelection = true } = {}) {
  if (settings.view.mode !== "pages") return;

  clearSearchHighlights(false);
  const selectedImageId = selectedImage?.closest("figure.document-figure")?.dataset.imageId || null;
  clearImageSelection();

  const fallbackBookmark = preserveSelection ? captureSelectionBookmark() : null;
  const markerState = preserveSelection ? plantSelectionMarkers() : null;

  canonicalHTML = collectPagesHTML();
  buildPagesFromHTML(canonicalHTML, null);

  const restoredByMarker = restoreSelectionFromMarkers(markerState);
  if (!restoredByMarker && fallbackBookmark) {
    restoreSelectionBookmark(fallbackBookmark);
  }

  canonicalHTML = collectPagesHTML();
  currentSource = "pages";
  syncInactiveEditors();

  if (selectedImageId) {
    requestAnimationFrame(() => {
      const image = elements.pagesContainer.querySelector(
        `figure[data-image-id="${CSS.escape(selectedImageId)}"] img`
      );
      if (image) selectImage(image);
    });
  }
}

function renderPageChrome() {
  const pages = $$(".editor-page");
  const total = pages.length;
  const hf = settings.headerFooter;

  pages.forEach((page, index) => {
    const number = index + 1;
    const first = index === 0 && hf.differentFirstPage;
    const header = page.querySelector(".page-header");
    const footer = page.querySelector(".page-footer");
    const badge = page.querySelector(".page-number-badge");

    header.className = "page-header";
    footer.className = "page-footer";
    header.textContent = first ? hf.firstHeader : hf.header;
    footer.textContent = first ? hf.firstFooter : hf.footer;
    badge.textContent = String(number);

    if (hf.showPageNumbers) {
      if (hf.pageNumberPosition === "header-right") {
        header.textContent = [header.textContent, number].filter(Boolean).join("  ·  ");
        header.classList.add("page-header-right");
      } else if (hf.pageNumberPosition === "footer-right") {
        footer.textContent = [footer.textContent, number].filter(Boolean).join("  ·  ");
        footer.classList.add("page-footer-right");
      } else {
        footer.textContent = [footer.textContent, number].filter(Boolean).join("  ·  ");
        footer.classList.add("page-footer-center");
      }
    }

    badge.hidden = hf.showPageNumbers;
    page.dataset.page = String(number);
    page.setAttribute("aria-label", `Página ${number} de ${total}`);
  });
}

/* =========================================================
   CARREGAMENTO, SALVAMENTO E RECUPERAÇÃO
   ========================================================= */

function applyCSSSettings() {
  const page = settings.page;
  const root = document.documentElement;

  root.style.setProperty("--editor-page-width", `${page.width}px`);
  root.style.setProperty("--editor-page-height", `${page.height}px`);
  root.style.setProperty("--editor-margin-top", `${page.marginTop}px`);
  root.style.setProperty("--editor-margin-right", `${page.marginRight}px`);
  root.style.setProperty("--editor-margin-bottom", `${page.marginBottom}px`);
  root.style.setProperty("--editor-margin-left", `${page.marginLeft}px`);
  root.style.setProperty("--editor-page-color", page.color);
  root.style.setProperty("--editor-zoom", String(settings.view.zoom / 100));

  elements.pageMarginLeft.value = page.marginLeft;
  elements.pageMarginRight.value = page.marginRight;
  elements.pageMarginTop.value = page.marginTop;
  elements.pageMarginBottom.value = page.marginBottom;
  elements.zoomRange.value = settings.view.zoom;
  elements.zoomValue.textContent = `${settings.view.zoom}%`;
}

function applyViewSettings() {
  elements.stage.classList.toggle("view-pages", settings.view.mode === "pages");
  elements.stage.classList.toggle("view-flow", settings.view.mode === "flow");
  elements.stage.classList.toggle("split-view", settings.view.split);
  elements.secondaryPane.hidden = !settings.view.split;
  elements.workspace.classList.toggle("sidebar-hidden", settings.view.sidebarHidden);
  elements.editorRuler.classList.toggle("is-hidden", !settings.ruler.visible || settings.view.mode !== "pages");
  elements.body.classList.toggle("read-mode", settings.view.read);

  elements.pageModeButton.classList.toggle("is-active", settings.view.mode === "pages");
  elements.flowModeButton.classList.toggle("is-active", settings.view.mode === "flow");
  elements.splitViewButton.classList.toggle("is-active", settings.view.split);
  elements.toggleRulerButton.classList.toggle("is-active", settings.ruler.visible);
  elements.readModeButton.classList.toggle("is-active", settings.view.read);
  elements.viewReadModeButton.classList.toggle("is-active", settings.view.read);
  elements.toggleSidebarButton.textContent = settings.view.sidebarHidden ? "Mostrar painel" : "Ocultar painel";

  setEditorsReadOnly(settings.view.read || documentReadOnlyBecauseLock);
}

function setDocumentLockState(readOnly) {
  documentReadOnlyBecauseLock = Boolean(readOnly);
  setEditorsReadOnly(documentReadOnlyBecauseLock || settings.view.read);
  elements.body.classList.toggle("document-lock-readonly", documentReadOnlyBecauseLock);
  elements.title.readOnly = documentReadOnlyBecauseLock || settings.view.read;

  if (documentReadOnlyBecauseLock) {
    setSaveStatus("error", "Aberto em outra aba — somente leitura");
  } else if (!isDirty) {
    setSaveStatus("saved", "Salvo neste dispositivo");
  }
}

function setDocumentContent(html) {
  canonicalHTML = sanitizeHTML(String(html || ""), false);
  elements.flowEditor.innerHTML = canonicalHTML;
  elements.splitEditor.innerHTML = canonicalHTML;
  buildPagesFromHTML(canonicalHTML);
  currentSource = settings.view.mode === "flow" ? "flow" : "pages";
}

function loadCurrentDocument() {
  const documents = loadDocuments();
  const requestedId = new URLSearchParams(location.search).get("id");
  const corrupted = requestedId
    ? window.AteroWriteData?.getCorruptDocumentSync?.(requestedId)
    : null;

  if (corrupted) {
    window.AteroWriteData?.showCorruptionScreen?.({
      record: corrupted.record,
      errors: corrupted.errors,
      onCreateCopy: async () => {
        const recovered = window.AteroWriteData.normalizeDocument(corrupted.record, { preserveId: false });
        recovered.name = `${recovered.name} — recuperado`;
        recovered.metadata = { ...(recovered.metadata || {}), recoveredFrom: requestedId };
        await window.AteroWriteData.saveDocument(recovered);
        location.replace(`editor.html?id=${encodeURIComponent(recovered.id)}`);
      }
    });
    return false;
  }

  let item = documents.find(documentItem => documentItem.id === requestedId);
  if (!item) item = createFallbackDocument(documents);

  currentDocumentId = item.id;
  settings = deepMerge(DEFAULT_SETTINGS, item.editorSettings || {});
  loadPreferences();
  applyCSSSettings();
  applyViewSettings();

  elements.title.value = item.name || "Documento sem título";
  elements.sidebarDocumentName.textContent = elements.title.value;
  document.title = `${elements.title.value} — Atero Write`;

  setDocumentContent(item.content || "");
  setSaveStatus("saved", "Salvo neste dispositivo");
  lastVersionAt = Date.now();
  refreshMetrics();
  populatePageSetupForm();
  populateHeaderFooterForm();
  maybeShowRecovery(item);
  return true;
}

function markDirty() {
  if (documentReadOnlyBecauseLock) {
    setSaveStatus("error", "Outra aba controla este documento");
    return;
  }
  isDirty = true;
  mutationGeneration += 1;
  setSaveStatus("saving", "Alterações não salvas");

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveCurrentDocument(false), AUTOSAVE_DELAY);

  clearTimeout(recoveryTimer);
  recoveryTimer = setTimeout(saveRecovery, RECOVERY_DELAY);

  refreshMetrics();
}

function saveCurrentDocument(forceVersion = false) {
  clearTimeout(saveTimer);
  clearTimeout(recoveryTimer);

  if (documentReadOnlyBecauseLock || (window.AteroWriteData && !window.AteroWriteData.canWrite(currentDocumentId))) {
    setDocumentLockState(true);
    return false;
  }

  try {
    updateCanonicalFromSource(currentSource);
    const documents = loadDocuments();
    const index = documents.findIndex(item => item.id === currentDocumentId);
    if (index < 0) throw new Error("Documento não encontrado.");

    const name = normalizeTitle(elements.title.value);
    const now = new Date().toISOString();

    elements.title.value = name;
    elements.sidebarDocumentName.textContent = name;
    document.title = `${name} — Atero Write`;

    const liveScreenplaySettings = window.AteroWriteScreenplay?.getSettings?.();
    const screenplaySettings = cloneValue(
      liveScreenplaySettings || documents[index].screenplaySettings || {}
    );

    documents[index] = {
      ...documents[index],
      schemaVersion: window.AteroWriteData?.schemaVersion || 2,
      projectId: documents[index].projectId || null,
      type: screenplaySettings.enabled ? "screenplay" : "document",
      name,
      content: canonicalHTML,
      editorSettings: cloneValue(settings),
      screenplaySettings,
      updatedAt: now,
      revision: Number(documents[index].revision || 0) + 1,
      metadata: cloneValue(documents[index].metadata || {})
    };

    const operationId = ++saveGeneration;
    const contentGeneration = mutationGeneration;
    const savedDocument = cloneValue(documents[index]);
    const persistence = saveDocuments(documents);
    savePreferences();
    isDirty = false;
    setSaveStatus("saving", "Salvando neste dispositivo");

    persistence.then(() => {
      if (operationId !== saveGeneration || contentGeneration !== mutationGeneration || isDirty) return;
      clearRecovery();
      setSaveStatus("saved", "Salvo neste dispositivo");
      document.dispatchEvent(new CustomEvent("atero:document-saved", {
        detail: { document: savedDocument }
      }));
    }).catch(() => {
      if (operationId !== saveGeneration || contentGeneration !== mutationGeneration) return;
      isDirty = true;
      saveRecovery();
    });

    if (forceVersion || Date.now() - lastVersionAt >= VERSION_INTERVAL) {
      createVersion(name, canonicalHTML);
      lastVersionAt = Date.now();
    }
    return true;
  } catch (error) {
    console.error("Não foi possível salvar o documento:", error);
    setSaveStatus("error", "Erro ao salvar");
    return false;
  }
}

function canMutateDocument() {
  const ownsLock = !window.AteroWriteData || !currentDocumentId || window.AteroWriteData.canWrite(currentDocumentId);
  if (!documentReadOnlyBecauseLock && !settings.view.read && ownsLock) return true;

  if (!ownsLock) setDocumentLockState(true);
  setSaveStatus("error", documentReadOnlyBecauseLock
    ? "Outra aba controla este documento"
    : "O modo de leitura está ativo");
  return false;
}

function saveRecovery() {
  if (!currentDocumentId) return;
  updateCanonicalFromSource(currentSource);

  const recovery = {
    documentId: currentDocumentId,
    name: elements.title.value,
    content: canonicalHTML,
    settings,
    savedAt: new Date().toISOString()
  };
  storageSet(STORAGE_KEYS.recovery, JSON.stringify(recovery));
  Promise.resolve(window.AteroWriteData?.saveRecovery?.(recovery)).catch(error => {
    console.warn("Falha ao salvar recuperação no IndexedDB:", error);
  });
}

function clearRecovery() {
  storageRemove(STORAGE_KEYS.recovery);
  if (currentDocumentId) {
    Promise.resolve(window.AteroWriteData?.clearRecovery?.(currentDocumentId)).catch(error => {
      console.warn("Falha ao limpar recuperação no IndexedDB:", error);
    });
  }
}

function maybeShowRecovery(documentItem) {
  const managedRecovery = window.AteroWriteData?.getRecoverySync?.(documentItem.id);
  const localRecovery = safeParse(storageGet(STORAGE_KEYS.recovery), null);
  const candidates = [managedRecovery, localRecovery]
    .filter(item => item?.documentId === documentItem.id)
    .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  const recovery = candidates[0] || null;
  if (!recovery) return;

  const recoveryTime = new Date(recovery.savedAt).getTime();
  const savedTime = new Date(documentItem.updatedAt || documentItem.createdAt).getTime();

  if (recoveryTime <= savedTime || recovery.content === documentItem.content) return;
  elements.recoveryDialog.showModal();

  elements.restoreRecovery.onclick = () => {
    settings = deepMerge(DEFAULT_SETTINGS, recovery.settings || settings);
    applyCSSSettings();
    applyViewSettings();
    elements.title.value = recovery.name || elements.title.value;
    setDocumentContent(recovery.content || "");
    elements.recoveryDialog.close();
    markDirty();
  };

  elements.discardRecovery.onclick = () => {
    clearRecovery();
    elements.recoveryDialog.close();
  };
}

/* =========================================================
   HISTÓRICO DE VERSÕES E DESFAZER
   ========================================================= */

function versionKey() {
  return `${STORAGE_KEYS.versions}_${currentDocumentId}`;
}

function loadVersions() {
  const managed = window.AteroWriteData?.getVersionsSync?.(currentDocumentId);
  if (Array.isArray(managed) && managed.length) return managed;
  const versions = safeParse(storageGet(versionKey(), "[]"), []);
  return Array.isArray(versions) ? versions : [];
}

function createVersion(name, content) {
  const versions = loadVersions();
  if (versions[0]?.content === content) return;

  versions.unshift({
    id: createId("version"),
    name,
    content,
    settings: cloneValue(settings),
    screenplaySettings: cloneValue(
      window.AteroWriteScreenplay?.getSettings?.()
      || loadDocuments().find(item => item.id === currentDocumentId)?.screenplaySettings
      || {}
    ),
    createdAt: new Date().toISOString()
  });

  const trimmed = versions.slice(0, MAX_VERSIONS);
  storageSet(versionKey(), JSON.stringify(trimmed));
  Promise.resolve(window.AteroWriteData?.saveVersions?.(currentDocumentId, trimmed)).catch(error => {
    console.warn("Falha ao salvar versões no IndexedDB:", error);
  });
}

function renderVersions() {
  const versions = loadVersions();
  elements.versionsList.replaceChildren();

  if (!versions.length) {
    elements.versionsList.innerHTML = '<p class="dialog-muted">Nenhuma versão automática criada ainda.</p>';
    return;
  }

  versions.forEach(version => {
    const row = document.createElement("div");
    row.className = "version-item";
    const info = document.createElement("div");
    const words = textToWords(getPlainTextFromHTML(version.content)).length;
    info.innerHTML = `<strong>${new Date(version.createdAt).toLocaleString("pt-BR")}</strong><span>${words.toLocaleString("pt-BR")} palavras</span>`;

    const preview = document.createElement("button");
    preview.type = "button";
    preview.textContent = "Visualizar";
    preview.addEventListener("click", () => {
      const previewWindow = window.open("", "_blank", "noopener");
      if (!previewWindow) return;
      const safeContent = sanitizeHTML(String(version.content || ""), false);
      previewWindow.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Versão — Atero Write</title><style>body{max-width:780px;margin:50px auto;padding:0 24px;font:16px Arial,sans-serif;line-height:1.6}img{max-width:100%}table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px}</style></head><body>${safeContent}</body></html>`);
      previewWindow.document.close();
    });

    const restore = document.createElement("button");
    restore.type = "button";
    restore.textContent = "Restaurar";
    restore.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Restaurar esta versão? A versão atual será preservada no histórico antes da restauração."
      );
      if (!confirmed) return;

      createVersion(elements.title.value, canonicalHTML);
      settings = deepMerge(DEFAULT_SETTINGS, version.settings || settings);
      applyCSSSettings();
      applyViewSettings();
      setDocumentContent(version.content);
      window.AteroWriteScreenplay?.setSettings?.(version.screenplaySettings || {}, { persist: false });
      elements.versionsDialog.close();
      markDirty();
      saveCurrentDocument(false);
    });

    row.append(info, preview, restore);
    elements.versionsList.append(row);
  });
}

function snapshot() {
  updateCanonicalFromSource(currentSource);
  return { html: canonicalHTML, settings: cloneValue(settings) };
}

function pushUndoSnapshot(force = false) {
  if (applyingHistory) return;
  const now = Date.now();
  if (!force && now - lastUndoCapture < 650) return;

  const state = snapshot();
  if (undoStack.at(-1)?.html === state.html) return;
  undoStack.push(state);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
  lastUndoCapture = now;
}

function applySnapshot(state) {
  if (!state) return;
  applyingHistory = true;
  settings = deepMerge(DEFAULT_SETTINGS, state.settings || settings);
  applyCSSSettings();
  applyViewSettings();
  setDocumentContent(state.html);
  applyingHistory = false;
  markDirty();
}

function undo() {
  if (!undoStack.length || !canMutateDocument()) return;
  redoStack.push(snapshot());
  applySnapshot(undoStack.pop());
}

function redo() {
  if (!redoStack.length || !canMutateDocument()) return;
  undoStack.push(snapshot());
  applySnapshot(redoStack.pop());
}

/* =========================================================
   MÉTRICAS
   ========================================================= */

function refreshMetrics() {
  const html = canonicalHTML || serializeContent();
  const text = getPlainTextFromHTML(html);
  const words = textToWords(text).length;
  const characters = text.length;
  const pages = settings.view.mode === "pages"
    ? Math.max(1, pageBodies().length)
    : Math.max(1, Math.ceil((elements.flowEditor.scrollHeight || 1) / 950));
  const minutes = words ? Math.max(1, Math.ceil(words / 220)) : 0;

  elements.wordCount.textContent = words.toLocaleString("pt-BR");
  elements.characterCount.textContent = characters.toLocaleString("pt-BR");
  elements.pageCount.textContent = pages.toLocaleString("pt-BR");
  elements.readingTime.textContent = `${minutes} min`;
  elements.bottomWordCount.textContent = `${words.toLocaleString("pt-BR")} ${words === 1 ? "palavra" : "palavras"}`;
  elements.bottomPageCount.textContent = `${pages.toLocaleString("pt-BR")} ${pages === 1 ? "página" : "páginas"}`;
  elements.goToPageInput.max = String(pages);
}

function updateSelectionStatistics() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    elements.selectionCount.textContent = "Nenhuma seleção";
    return;
  }

  const text = selection.toString();
  const words = textToWords(text).length;
  const chars = text.length;
  elements.selectionCount.textContent = `${words.toLocaleString("pt-BR")} palavras selecionadas · ${chars.toLocaleString("pt-BR")} caracteres`;
}

/* =========================================================
   EDIÇÃO E FORMATAÇÃO
   ========================================================= */

function afterMutation(source = currentSource, { repaginatePages = true } = {}) {
  clearSearchHighlights(false);
  updateCanonicalFromSource(source);
  syncInactiveEditors();

  if (source === "pages" && repaginatePages) {
    debounceRepagination(() => repaginate({ preserveSelection: true }));
  } else if (source !== "pages") {
    canonicalHTML = serializeContent();
  }

  markDirty();
}

function execCommand(command, value = null) {
  if (!canMutateDocument()) return false;
  pushUndoSnapshot(true);
  restoreSelection();
  activeEditor()?.focus();
  document.execCommand("styleWithCSS", false, true);
  document.execCommand(command, false, value);
  saveSelection();
  afterMutation(currentSource);
  refreshToolbarState();
  return true;
}

function refreshToolbarState() {
  const stateful = [
    "bold", "italic", "underline", "strikeThrough", "superscript", "subscript",
    "justifyLeft", "justifyCenter", "justifyRight", "justifyFull",
    "insertUnorderedList", "insertOrderedList"
  ];

  $$('[data-command]').forEach(button => {
    const command = button.dataset.command;
    if (!stateful.includes(command)) return;
    let active = false;
    try { active = document.queryCommandState(command); } catch { active = false; }
    button.classList.toggle("is-active", active);
  });
}

function selectedBlocks() {
  const selection = window.getSelection();
  const root = activeEditor();
  if (!selection || !root || selection.rangeCount === 0) return [];
  const range = selection.getRangeAt(0);
  const selector = "p, div, h1, h2, h3, blockquote, pre, li, td, th";

  const blocks = [...root.querySelectorAll(selector)].filter(block => {
    try { return range.intersectsNode(block); } catch { return false; }
  });

  if (blocks.length) return blocks;

  let node = range.startContainer.nodeType === Node.TEXT_NODE
    ? range.startContainer.parentElement
    : range.startContainer;

  while (node && node !== root && !node.matches?.(selector)) node = node.parentElement;
  return node && node !== root ? [node] : [];
}

function applyStyleToBlocks(styles) {
  pushUndoSnapshot(true);
  restoreSelection();
  const blocks = selectedBlocks();
  if (!blocks.length) return;
  blocks.forEach(block => Object.assign(block.style, styles));
  saveSelection();
  afterMutation(currentSource);
}

function applyFontSize() {
  pushUndoSnapshot(true);
  restoreSelection();
  const size = Math.max(6, Math.min(96, Number(elements.fontSize.value) || 12));
  document.execCommand("fontSize", false, "7");

  activeEditor()?.querySelectorAll('font[size="7"]').forEach(font => {
    font.removeAttribute("size");
    font.style.fontSize = `${size}pt`;
  });

  afterMutation(currentSource);
}

function transformCase(mode) {
  if (!mode) return;
  restoreSelection();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  let text = selection.toString();
  if (!text) {
    const blocks = selectedBlocks();
    if (!blocks.length) return;
    text = blocks[0].textContent;
    const range = document.createRange();
    range.selectNodeContents(blocks[0]);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  const transforms = {
    lower: value => value.toLocaleLowerCase("pt-BR"),
    upper: value => value.toLocaleUpperCase("pt-BR"),
    sentence: value => value.toLocaleLowerCase("pt-BR").replace(/(^|[.!?]\s+)(\p{L})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase("pt-BR")),
    title: value => value.toLocaleLowerCase("pt-BR").replace(/\b\p{L}/gu, letter => letter.toLocaleUpperCase("pt-BR")),
    toggle: value => [...value].map(char => char === char.toLocaleUpperCase("pt-BR") ? char.toLocaleLowerCase("pt-BR") : char.toLocaleUpperCase("pt-BR")).join("")
  };

  pushUndoSnapshot(true);
  document.execCommand("insertText", false, transforms[mode](text));
  afterMutation(currentSource);
  elements.caseTransform.value = "";
}

function captureFormatPainter() {
  restoreSelection();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const node = selection.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode;
  if (!node || !activeEditor()?.contains(node)) return;

  const computed = getComputedStyle(node);
  const block = selectedBlocks()[0];
  const blockComputed = block ? getComputedStyle(block) : computed;

  formatPainter = {
    inline: {
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      fontStyle: computed.fontStyle,
      textDecoration: computed.textDecoration,
      color: computed.color,
      backgroundColor: computed.backgroundColor
    },
    block: {
      textAlign: blockComputed.textAlign,
      lineHeight: blockComputed.lineHeight,
      marginTop: blockComputed.marginTop,
      marginBottom: blockComputed.marginBottom,
      marginLeft: blockComputed.marginLeft,
      marginRight: blockComputed.marginRight,
      textIndent: blockComputed.textIndent
    }
  };

  formatPainterArmed = true;
  elements.formatPainterButton.classList.add("is-armed");
}

function applyFormatPainter() {
  if (!formatPainterArmed || !formatPainter) return;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  pushUndoSnapshot(true);
  const range = selection.getRangeAt(0);
  const span = document.createElement("span");
  Object.assign(span.style, formatPainter.inline);

  try {
    span.append(range.extractContents());
    range.insertNode(span);
  } catch {
    document.execCommand("styleWithCSS", false, true);
  }

  selectedBlocks().forEach(block => Object.assign(block.style, formatPainter.block));
  formatPainterArmed = false;
  elements.formatPainterButton.classList.remove("is-armed");
  afterMutation(currentSource);
}

function applyListStyle() {
  const selection = window.getSelection();
  const node = selection?.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection?.anchorNode;
  const list = node?.closest?.("ul, ol");
  if (!list) return;
  pushUndoSnapshot(true);
  list.style.listStyleType = elements.listStyle.value;
  afterMutation(currentSource);
}

function applyColumns() {
  const count = Math.max(1, Math.min(3, Number(elements.columnsSelect.value) || 1));
  const blocks = selectedBlocks();
  if (!blocks.length) return;
  pushUndoSnapshot(true);
  blocks.forEach(block => {
    block.classList.add("columns-block");
    block.style.columnCount = String(count);
  });
  afterMutation(currentSource);
}

/* =========================================================
   TABULAÇÃO E RÉGUA
   ========================================================= */

function updateRuler() {
  const page = settings.page;
  const ruler = settings.ruler;
  const width = elements.rulerInner.clientWidth || page.width;
  const scale = width / page.width;

  elements.leftIndentMarker.style.left = `${(page.marginLeft + ruler.leftIndent) * scale}px`;
  elements.firstIndentMarker.style.left = `${(page.marginLeft + ruler.leftIndent + ruler.firstLineIndent) * scale}px`;
  elements.rightIndentMarker.style.left = `${(page.width - page.marginRight - ruler.rightIndent) * scale}px`;

  elements.rulerTabs.replaceChildren();
  ruler.tabs.forEach(tab => {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "ruler-tab-marker";
    marker.style.left = `${(page.marginLeft + tab) * scale}px`;
    marker.title = "Clique duas vezes para remover a tabulação";
    marker.dataset.tab = String(tab);
    marker.addEventListener("dblclick", event => {
      event.stopPropagation();
      if (!canMutateDocument()) return;
      settings.ruler.tabs = settings.ruler.tabs.filter(value => value !== tab);
      updateRuler();
      markDirty();
    });
    elements.rulerTabs.append(marker);
  });
}

function applyRulerToSelection() {
  applyStyleToBlocks({
    marginLeft: `${settings.ruler.leftIndent}px`,
    marginRight: `${settings.ruler.rightIndent}px`,
    textIndent: `${settings.ruler.firstLineIndent}px`
  });
  elements.firstLineIndent.value = settings.ruler.firstLineIndent;
}

function beginMarkerDrag(markerType, event) {
  event.preventDefault();
  if (!canMutateDocument()) return;
  const page = settings.page;
  const rect = elements.rulerInner.getBoundingClientRect();
  const scale = page.width / rect.width;

  const move = moveEvent => {
    const x = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left)) * scale;

    if (markerType === "left") {
      settings.ruler.leftIndent = Math.max(0, Math.min(page.width - page.marginLeft - page.marginRight - 80, x - page.marginLeft));
    } else if (markerType === "first") {
      settings.ruler.firstLineIndent = Math.max(-settings.ruler.leftIndent, Math.min(240, x - page.marginLeft - settings.ruler.leftIndent));
    } else {
      settings.ruler.rightIndent = Math.max(0, Math.min(page.width - page.marginLeft - page.marginRight - 80, page.width - page.marginRight - x));
    }

    updateRuler();
  };

  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    applyRulerToSelection();
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
}

function addTabStop(event) {
  if (!canMutateDocument()) return;
  if (event.target.closest(".ruler-marker, .ruler-tab-marker")) return;
  const page = settings.page;
  const rect = elements.rulerInner.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (page.width / rect.width) - page.marginLeft;
  const max = page.width - page.marginLeft - page.marginRight;
  const tab = Math.round(Math.max(0, Math.min(max, x)) / 6) * 6;
  if (!settings.ruler.tabs.includes(tab)) settings.ruler.tabs.push(tab);
  settings.ruler.tabs.sort((a, b) => a - b);
  updateRuler();
  markDirty();
}

function findTableCell(node) {
  const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return element?.closest?.("td, th") || null;
}

function moveBetweenTableCells(root, backwards = false) {
  const selection = window.getSelection();
  const cell = findTableCell(selection?.anchorNode);
  if (!cell) return false;

  const cells = [...root.querySelectorAll("td, th")];
  const index = cells.indexOf(cell);
  const target = cells[index + (backwards ? -1 : 1)];
  if (!target) return false;

  target.focus?.();
  placeCaretAtStart(target);
  target.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}

function calculateTabWidth(root, range) {
  let width = 48;

  if (range && settings.ruler.tabs.length && settings.view.mode === "pages") {
    const bodyRect = root.getBoundingClientRect();
    const caretRect = range.getBoundingClientRect();
    const zoom = Math.max(0.1, settings.view.zoom / 100);
    const x = Math.max(0, (caretRect.left - bodyRect.left) / zoom);
    const next = settings.ruler.tabs.find(tab => tab > x + 2) ?? Math.ceil((x + 1) / 48) * 48;
    width = Math.max(18, next - x);
  }

  return Math.round(width);
}

function removePreviousTab(range) {
  if (!range?.collapsed) return false;

  let node = range.startContainer;
  let offset = range.startOffset;
  let candidate = null;

  if (node.nodeType === Node.TEXT_NODE && offset === 0) {
    candidate = node.previousSibling;
  } else if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
    candidate = node.childNodes[offset - 1];
  }

  if (!candidate?.classList?.contains("editor-tab")) return false;

  const parent = candidate.parentNode;
  const nextOffset = [...parent.childNodes].indexOf(candidate);
  candidate.remove();
  range.setStart(parent, Math.max(0, nextOffset));
  range.collapse(true);
  return true;
}

function insertTab(backwards = false, rootHint = null) {
  const root = rootHint || activeEditor();
  if (!root) return;

  root.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selectionBelongsToRoot(selection, root)) {
    placeCaretAtEnd(root);
  }

  const liveSelection = window.getSelection();
  const node = liveSelection?.anchorNode?.nodeType === Node.TEXT_NODE
    ? liveSelection.anchorNode.parentElement
    : liveSelection?.anchorNode;

  if (moveBetweenTableCells(root, backwards)) return;

  if (node?.closest?.("li")) {
    pushUndoSnapshot(true);
    document.execCommand(backwards ? "outdent" : "indent", false, null);
    saveSelection();
    afterMutation(sourceFromRoot(root));
    return;
  }

  const range = liveSelection?.rangeCount ? liveSelection.getRangeAt(0) : null;
  if (!range) return;

  pushUndoSnapshot(true);

  if (backwards) {
    const removed = removePreviousTab(range);
    if (!removed) {
      document.execCommand("outdent", false, null);
    }
  } else {
    range.deleteContents();

    const tab = document.createElement("span");
    tab.className = "editor-tab";
    tab.contentEditable = "false";
    tab.setAttribute("aria-label", "Tabulação");
    tab.style.display = "inline-block";
    tab.style.width = `${calculateTabWidth(root, range)}px`;
    tab.style.minWidth = "18px";
    tab.style.height = "1em";
    tab.innerHTML = "&nbsp;";

    range.insertNode(tab);
    range.setStartAfter(tab);
    range.collapse(true);
  }

  liveSelection.removeAllRanges();
  liveSelection.addRange(range);
  savedRange = range.cloneRange();
  currentSource = sourceFromRoot(root);
  afterMutation(currentSource);
}

/* =========================================================
   INSERÇÕES
   ========================================================= */

function insertHTML(html) {
  if (!canMutateDocument()) return false;
  pushUndoSnapshot(true);
  restoreSelection();
  activeEditor()?.focus();
  document.execCommand("insertHTML", false, html);
  afterMutation(currentSource);
  return true;
}

function insertText(text) {
  if (!canMutateDocument()) return false;
  pushUndoSnapshot(true);
  restoreSelection();
  activeEditor()?.focus();
  document.execCommand("insertText", false, text);
  afterMutation(currentSource);
  return true;
}

function insertManualPageBreak() {
  restoreSelection();
  const selection = window.getSelection();
  const root = activeEditor();
  if (!selection || !root || selection.rangeCount === 0) return;

  pushUndoSnapshot(true);
  let block = selection.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode;
  while (block && block.parentElement !== root) block = block.parentElement;

  const marker = document.createElement("div");
  marker.className = "manual-page-break";
  marker.contentEditable = "false";
  marker.dataset.pageBreak = "true";

  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";

  if (block && block.parentElement === root) {
    block.after(marker, paragraph);
  } else {
    root.append(marker, paragraph);
  }

  currentSource = root === elements.flowEditor ? "flow" : root === elements.splitEditor ? "split" : "pages";
  afterMutation(currentSource, { repaginatePages: false });

  if (settings.view.mode === "pages" && currentSource === "pages") {
    repaginate({ preserveSelection: false });
    const target = pageBodies().find(body => body.querySelector(".manual-page-break") && body.lastElementChild);
    target?.focus();
    placeCaretAtEnd(target || pageBodies().at(-1));
  }
}

function insertHorizontalRule() {
  execCommand("insertHorizontalRule");
}

function insertTextBox() {
  insertHTML('<div class="text-box" contenteditable="true">Caixa de texto</div><p><br></p>');
}

function insertTable(rows, columns, header) {
  let html = '<table class="document-table"><tbody>';

  for (let row = 0; row < rows; row += 1) {
    html += "<tr>";
    for (let column = 0; column < columns; column += 1) {
      const tag = header && row === 0 ? "th" : "td";
      html += `<${tag}><br></${tag}>`;
    }
    html += "</tr>";
  }

  html += "</tbody></table><p><br></p>";
  insertHTML(html);
}

function injectEditorInteractionStyles() {
  if (document.querySelector("#atero-editor-interaction-styles")) return;

  const style = document.createElement("style");
  style.id = "atero-editor-interaction-styles";
  style.textContent = `
    .editor-tab{display:inline-block;min-width:18px;height:1em;vertical-align:baseline}
    .document-figure{position:relative;max-width:100%;box-sizing:border-box}
    .document-figure>img{display:block;width:100%;height:auto;max-width:100%;user-select:none}
    .document-figure.is-image-selected{outline:2px solid var(--write-red,#e63946);outline-offset:3px}
    .image-resize-handle{position:absolute;z-index:20;width:12px;height:12px;padding:0;background:#fff;border:2px solid var(--write-red,#e63946);border-radius:50%;box-shadow:0 2px 7px rgba(20,20,20,.16)}
    .image-resize-handle[data-corner="nw"]{top:-8px;left:-8px;cursor:nwse-resize}
    .image-resize-handle[data-corner="ne"]{top:-8px;right:-8px;cursor:nesw-resize}
    .image-resize-handle[data-corner="sw"]{bottom:-8px;left:-8px;cursor:nesw-resize}
    .image-resize-handle[data-corner="se"]{right:-8px;bottom:-8px;cursor:nwse-resize}
    .image-toolbar{position:fixed;z-index:1500;display:flex;align-items:center;gap:3px;padding:5px;background:rgba(255,255,255,.97);border:1px solid rgba(20,20,20,.1);border-radius:11px;box-shadow:0 14px 38px rgba(20,20,20,.18);backdrop-filter:blur(12px)}
    .image-toolbar button{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:30px;padding:0 8px;color:#656565;background:transparent;border:0;border-radius:7px;font:700 11px/1 Arial,sans-serif;cursor:pointer}
    .image-toolbar button:hover{color:var(--write-red,#e63946);background:var(--write-red-soft,#fff1f2)}
    .image-toolbar .image-toolbar-danger:hover{color:#fff;background:var(--write-red,#e63946)}
  `;
  document.head.append(style);
}

function imageEditorRoot(figure) {
  return figure?.closest?.(".page-body, #flowEditor, #splitEditor") || null;
}

function clearImageSelection() {
  if (selectedImage) {
    selectedImage.closest("figure.document-figure")?.classList.remove("is-image-selected");
  }

  document.querySelectorAll(".image-resize-handle[data-temporary]").forEach(handle => handle.remove());
  imageToolbar?.remove();
  imageToolbar = null;
  selectedImage = null;
  imageResizeSession = null;
}

function imageWidthPercent(figure) {
  const root = imageEditorRoot(figure);
  if (!root) return 100;
  const rootWidth = root.getBoundingClientRect().width || 1;
  const width = figure.getBoundingClientRect().width;
  return Math.max(10, Math.min(100, width / rootWidth * 100));
}

function applyImageWidth(figure, percent) {
  const value = Math.max(10, Math.min(100, Number(percent) || 100));
  figure.style.width = `${value.toFixed(1)}%`;
  figure.style.maxWidth = "100%";
  const image = figure.querySelector("img");
  if (image) {
    image.style.width = "100%";
    image.style.height = "auto";
    image.style.maxWidth = "100%";
  }
}

function applyImageAlignment(figure, alignment) {
  figure.dataset.imageAlign = alignment;
  figure.style.display = "block";

  if (alignment === "left") {
    figure.style.marginLeft = "0";
    figure.style.marginRight = "auto";
  } else if (alignment === "right") {
    figure.style.marginLeft = "auto";
    figure.style.marginRight = "0";
  } else {
    figure.style.marginLeft = "auto";
    figure.style.marginRight = "auto";
  }
}

function positionImageToolbar() {
  if (!selectedImage || !imageToolbar || !selectedImage.isConnected) {
    clearImageSelection();
    return;
  }

  const rect = selectedImage.getBoundingClientRect();
  const toolbarRect = imageToolbar.getBoundingClientRect();
  const left = Math.max(8, Math.min(window.innerWidth - toolbarRect.width - 8, rect.left + rect.width / 2 - toolbarRect.width / 2));
  const preferredTop = rect.top - toolbarRect.height - 10;
  const top = preferredTop >= 8 ? preferredTop : Math.min(window.innerHeight - toolbarRect.height - 8, rect.bottom + 10);

  imageToolbar.style.left = `${left}px`;
  imageToolbar.style.top = `${top}px`;
}

function mutateSelectedImage(action) {
  const figure = selectedImage?.closest("figure.document-figure");
  const root = imageEditorRoot(figure);
  if (!figure || !root) return;

  pushUndoSnapshot(true);

  if (action === "smaller") {
    applyImageWidth(figure, imageWidthPercent(figure) - 10);
  } else if (action === "larger") {
    applyImageWidth(figure, imageWidthPercent(figure) + 10);
  } else if (action === "fit") {
    applyImageWidth(figure, 100);
  } else if (action === "natural") {
    const rootWidth = root.getBoundingClientRect().width || 1;
    const natural = Math.min(100, (selectedImage.naturalWidth || rootWidth) / rootWidth * 100);
    applyImageWidth(figure, natural);
  } else if (["left", "center", "right"].includes(action)) {
    applyImageAlignment(figure, action);
  } else if (action === "alt") {
    const next = window.prompt("Texto alternativo da imagem:", selectedImage.alt || "");
    if (next === null) return;
    selectedImage.alt = next.trim();
  } else if (action === "remove") {
    const next = figure.nextElementSibling;
    figure.remove();
    clearImageSelection();
    next?.focus?.();
    currentSource = sourceFromRoot(root);
    afterMutation(currentSource);
    return;
  }

  currentSource = sourceFromRoot(root);
  afterMutation(currentSource);
  requestAnimationFrame(positionImageToolbar);
}

function createImageToolbar() {
  const toolbar = document.createElement("div");
  toolbar.className = "image-toolbar";
  toolbar.dataset.temporary = "true";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Ferramentas da imagem");
  toolbar.innerHTML = `
    <button type="button" data-image-action="smaller" title="Diminuir 10%">−</button>
    <button type="button" data-image-action="larger" title="Aumentar 10%">+</button>
    <button type="button" data-image-action="natural" title="Tamanho natural">1:1</button>
    <button type="button" data-image-action="fit" title="Ajustar à largura">100%</button>
    <button type="button" data-image-action="left" title="Alinhar à esquerda">←</button>
    <button type="button" data-image-action="center" title="Centralizar">↔</button>
    <button type="button" data-image-action="right" title="Alinhar à direita">→</button>
    <button type="button" data-image-action="alt" title="Editar texto alternativo">Alt</button>
    <button type="button" class="image-toolbar-danger" data-image-action="remove" title="Excluir imagem">×</button>
  `;

  toolbar.addEventListener("pointerdown", event => event.preventDefault());
  toolbar.addEventListener("click", event => {
    const button = event.target.closest("button[data-image-action]");
    if (button) mutateSelectedImage(button.dataset.imageAction);
  });

  document.body.append(toolbar);
  return toolbar;
}

function beginImageResize(event, corner) {
  event.preventDefault();
  event.stopPropagation();

  const figure = selectedImage?.closest("figure.document-figure");
  const root = imageEditorRoot(figure);
  if (!figure || !root) return;

  pushUndoSnapshot(true);

  const rootRect = root.getBoundingClientRect();
  const startPercent = imageWidthPercent(figure);
  const direction = corner.endsWith("e") ? 1 : -1;
  const startX = event.clientX;

  imageResizeSession = { figure, root, rootRect, startPercent, direction, startX };

  const move = moveEvent => {
    if (!imageResizeSession) return;
    const delta = (moveEvent.clientX - startX) * direction;
    const next = startPercent + delta / Math.max(1, rootRect.width) * 100;
    applyImageWidth(figure, next);
    positionImageToolbar();
  };

  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    imageResizeSession = null;
    currentSource = sourceFromRoot(root);
    afterMutation(currentSource);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up, { once: true });
}

function selectImage(image) {
  if (!image?.isConnected) return;
  if (selectedImage === image) {
    positionImageToolbar();
    return;
  }

  clearImageSelection();
  selectedImage = image;

  const figure = image.closest("figure.document-figure");
  if (!figure) return;

  figure.classList.add("is-image-selected");
  figure.dataset.imageId ||= createId("image");
  figure.style.position = "relative";
  if (!figure.style.width) applyImageWidth(figure, 70);
  if (!figure.dataset.imageAlign) applyImageAlignment(figure, "center");

  ["nw", "ne", "sw", "se"].forEach(corner => {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "image-resize-handle";
    handle.dataset.corner = corner;
    handle.dataset.temporary = "true";
    handle.setAttribute("aria-label", "Redimensionar imagem");
    handle.addEventListener("pointerdown", event => beginImageResize(event, corner));
    figure.append(handle);
  });

  imageToolbar = createImageToolbar();
  requestAnimationFrame(positionImageToolbar);
}

function handleImageClick(event) {
  const image = event.target.closest("figure.document-figure img");
  if (image) {
    event.preventDefault();
    selectImage(image);
    return true;
  }

  if (selectedImage && !event.target.closest("figure.document-figure, .image-toolbar")) {
    clearImageSelection();
  }

  return false;
}

function insertImage(file) {
  if (!file) return;

  const allowedTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);
  const allowedExtension = /\.(?:png|jpe?g|gif|webp|avif)$/i.test(file.name || "");
  if ((!allowedTypes.has(file.type) && !(file.type === "" && allowedExtension)) || file.size <= 0) {
    window.alert("Escolha uma imagem PNG, JPEG, GIF, WebP ou AVIF válida.");
    elements.imageInput.value = "";
    return;
  }

  if (file.size > 12_000_000) {
    window.alert("A imagem ultrapassa o limite de 12 MB. Comprima o arquivo antes de inseri-lo.");
    elements.imageInput.value = "";
    return;
  }

  if (file.size > 2_000_000 && !window.confirm("Esta imagem é grande e será salva dentro do navegador. Continuar?")) {
    elements.imageInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) {
      window.alert("Não foi possível interpretar esta imagem.");
      elements.imageInput.value = "";
      return;
    }
    const alt = escapeHTML(file.name.replace(/\.[^.]+$/, ""));
    const imageId = createId("image");
    insertHTML(`<figure class="document-figure" data-image-id="${imageId}" data-image-align="center" style="width:70%;max-width:100%;margin-left:auto;margin-right:auto"><img src="${reader.result}" alt="${alt}" style="display:block;width:100%;height:auto;max-width:100%"><figcaption contenteditable="true">Legenda da imagem</figcaption></figure><p><br></p>`);
    elements.imageInput.value = "";

    requestAnimationFrame(() => {
      const root = activeEditor();
      const images = root ? [...root.querySelectorAll("figure.document-figure img")] : [];
      selectImage(images.at(-1));
    });
  });
  reader.addEventListener("error", () => {
    console.error("Falha ao ler a imagem:", reader.error);
    window.alert("Não foi possível ler a imagem selecionada.");
    elements.imageInput.value = "";
  });
  reader.addEventListener("abort", () => {
    elements.imageInput.value = "";
  });
  reader.readAsDataURL(file);
}

function addCaption() {
  const selection = window.getSelection();
  let node = selection?.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection?.anchorNode;
  const figure = node?.closest?.("figure");
  const table = node?.closest?.("table");

  if (figure) {
    let caption = figure.querySelector("figcaption");
    if (!caption) {
      caption = document.createElement("figcaption");
      caption.contentEditable = "true";
      caption.textContent = "Legenda";
      figure.append(caption);
    }
    caption.focus();
    return;
  }

  if (table) {
    pushUndoSnapshot(true);
    let caption = table.nextElementSibling;
    if (!caption?.classList.contains("table-caption")) {
      caption = document.createElement("div");
      caption.className = "table-caption";
      caption.contentEditable = "true";
      caption.textContent = "Legenda da tabela";
      table.after(caption);
    }
    caption.focus();
    afterMutation(currentSource);
    return;
  }

  alert("Selecione uma imagem ou tabela para adicionar uma legenda.");
}

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || createId("marcador");
}

function listBookmarks() {
  const box = document.createElement("div");
  box.innerHTML = canonicalHTML;
  return [...box.querySelectorAll(".bookmark-anchor[id]")].map(node => ({ id: node.id, name: node.dataset.name || node.id }));
}

function createBookmark(name) {
  const id = `bookmark-${slugify(name)}`;
  insertHTML(`<span class="bookmark-anchor" id="${escapeHTML(id)}" data-name="${escapeHTML(name)}"></span>`);
}

function insertLink(value, internal = false) {
  restoreSelection();
  const selection = window.getSelection();
  if (!selection) return;
  const href = normalizeLinkTarget(value, internal);
  if (!href) {
    window.alert("O endereço informado não é válido ou usa um protocolo não permitido.");
    return;
  }
  pushUndoSnapshot(true);

  if (!selection.isCollapsed) {
    document.execCommand("createLink", false, href);
    const anchor = selection.anchorNode?.parentElement?.closest?.("a");
    if (anchor && !internal) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
  } else {
    const text = internal ? value.replace(/^bookmark-/, "") : value;
    document.execCommand("insertHTML", false, `<a href="${escapeHTML(href)}"${internal ? "" : ' target="_blank" rel="noopener noreferrer"'}>${escapeHTML(text)}</a>`);
  }

  afterMutation(currentSource);
}

function insertFootnote(text) {
  restoreSelection();
  const root = activeEditor();
  if (!root) return;
  const existing = root.querySelectorAll(".footnote-ref").length + 1;
  const id = createId("footnote");
  pushUndoSnapshot(true);
  document.execCommand("insertHTML", false, `<sup class="footnote-ref"><a href="#${id}" id="ref-${id}">${existing}</a></sup>`);

  let section = root.querySelector(".footnotes");
  if (!section) {
    section = document.createElement("section");
    section.className = "footnotes";
    section.innerHTML = "<ol></ol>";
    root.append(section);
  }

  const item = document.createElement("li");
  item.id = id;
  item.innerHTML = `${escapeHTML(text)} <a href="#ref-${id}">↩</a>`;
  section.querySelector("ol").append(item);
  afterMutation(currentSource);
}

function insertCitation() {
  const author = elements.citationAuthor.value.trim();
  const year = elements.citationYear.value.trim();
  const source = elements.citationSource.value.trim();
  const format = elements.citationFormat.value;
  if (!author) return;

  const label = year ? `${author}, ${year}` : author;
  const title = source ? ` title="${escapeHTML(source)}"` : "";

  if (format === "quote") {
    insertHTML(`<blockquote class="citation-block"${title}><p><br></p><footer>— ${escapeHTML(label)}</footer></blockquote><p><br></p>`);
  } else if (format === "narrative") {
    insertHTML(`<span class="citation-inline"${title}>${escapeHTML(author)}${year ? ` (${escapeHTML(year)})` : ""}</span>`);
  } else {
    insertHTML(`<span class="citation-inline"${title}>(${escapeHTML(label)})</span>`);
  }
}

function insertAutomaticTOC() {
  updateCanonicalFromSource(currentSource);
  const box = document.createElement("div");
  box.innerHTML = canonicalHTML;
  const headings = [...box.querySelectorAll("h1, h2, h3")];

  if (!headings.length) {
    alert("Use Título 1, Título 2 ou Título 3 para gerar o índice.");
    return;
  }

  const existingIds = new Set();
  headings.forEach((heading, index) => {
    let id = heading.id || `titulo-${slugify(heading.textContent)}-${index + 1}`;
    while (existingIds.has(id)) id = `${id}-${index + 1}`;
    existingIds.add(id);
    heading.id = id;
  });

  canonicalHTML = box.innerHTML;
  setDocumentContent(canonicalHTML);

  const links = headings.map(heading => `<li class="toc-level-${heading.tagName.slice(1)}"><a href="#${escapeHTML(heading.id)}">${escapeHTML(heading.textContent)}</a></li>`).join("");
  insertHTML(`<nav class="auto-toc" contenteditable="false"><strong>Índice</strong><ul>${links}</ul></nav><p><br></p>`);
}

/* =========================================================
   PÁGINA, CABEÇALHO E VISUALIZAÇÃO
   ========================================================= */

function populatePageSetupForm() {
  const page = settings.page;
  elements.pagePreset.value = page.preset;
  elements.pageOrientation.value = page.orientation;
  elements.customPageWidth.value = page.width;
  elements.customPageHeight.value = page.height;
  elements.pageColor.value = page.color;
  elements.setupMarginTop.value = page.marginTop;
  elements.setupMarginRight.value = page.marginRight;
  elements.setupMarginBottom.value = page.marginBottom;
  elements.setupMarginLeft.value = page.marginLeft;
}

function populateHeaderFooterForm() {
  const hf = settings.headerFooter;
  elements.headerText.value = hf.header;
  elements.footerText.value = hf.footer;
  elements.showPageNumbers.checked = hf.showPageNumbers;
  elements.pageNumberPosition.value = hf.pageNumberPosition;
  elements.differentFirstPage.checked = hf.differentFirstPage;
  elements.firstHeaderText.value = hf.firstHeader;
  elements.firstFooterText.value = hf.firstFooter;
}

function applyPageSetup() {
  if (!canMutateDocument()) return false;
  const preset = elements.pagePreset.value;
  const orientation = elements.pageOrientation.value;
  let width;
  let height;

  if (preset === "Custom") {
    width = Math.max(400, Math.min(1800, Number(elements.customPageWidth.value) || 794));
    height = Math.max(500, Math.min(2400, Number(elements.customPageHeight.value) || 1123));
  } else {
    ({ width, height } = PAGE_PRESETS[preset] || PAGE_PRESETS.A4);
  }

  if (orientation === "landscape" && height > width) [width, height] = [height, width];
  if (orientation === "portrait" && width > height) [width, height] = [height, width];

  settings.page = {
    preset,
    orientation,
    width,
    height,
    color: elements.pageColor.value,
    marginTop: Math.max(20, Number(elements.setupMarginTop.value) || 86),
    marginRight: Math.max(20, Number(elements.setupMarginRight.value) || 82),
    marginBottom: Math.max(20, Number(elements.setupMarginBottom.value) || 86),
    marginLeft: Math.max(20, Number(elements.setupMarginLeft.value) || 82)
  };

  applyCSSSettings();
  populatePageSetupForm();
  closeDialog(elements.pageSetupDialog);
  repaginate({ preserveSelection: false });
  markDirty();
  return true;
}

function applyHeaderFooter() {
  if (!canMutateDocument()) return false;
  settings.headerFooter = {
    header: elements.headerText.value,
    footer: elements.footerText.value,
    showPageNumbers: elements.showPageNumbers.checked,
    pageNumberPosition: elements.pageNumberPosition.value,
    differentFirstPage: elements.differentFirstPage.checked,
    firstHeader: elements.firstHeaderText.value,
    firstFooter: elements.firstFooterText.value
  };

  renderPageChrome();
  closeDialog(elements.headerFooterDialog);
  markDirty();
  return true;
}

function updateQuickMargins() {
  if (!canMutateDocument()) return false;
  settings.page.marginLeft = Math.max(20, Number(elements.pageMarginLeft.value) || 82);
  settings.page.marginRight = Math.max(20, Number(elements.pageMarginRight.value) || 82);
  settings.page.marginTop = Math.max(20, Number(elements.pageMarginTop.value) || 86);
  settings.page.marginBottom = Math.max(20, Number(elements.pageMarginBottom.value) || 86);
  applyCSSSettings();
  populatePageSetupForm();
  repaginate({ preserveSelection: true });
  markDirty();
  return true;
}

function setViewMode(mode) {
  if (mode === settings.view.mode) return;
  updateCanonicalFromSource(currentSource);
  clearSearchHighlights(false);
  settings.view.mode = mode === "flow" ? "flow" : "pages";

  if (settings.view.mode === "flow") {
    elements.flowEditor.innerHTML = canonicalHTML;
    currentSource = "flow";
  } else {
    buildPagesFromHTML(canonicalHTML);
    currentSource = "pages";
  }

  applyViewSettings();
  updateRuler();
  refreshMetrics();
  savePreferences();
}

function setZoom(value) {
  settings.view.zoom = Math.max(70, Math.min(140, Number(value) || 100));
  applyCSSSettings();
  updateRuler();
  savePreferences();
}

function toggleSidebar() {
  settings.view.sidebarHidden = !settings.view.sidebarHidden;
  applyViewSettings();
  savePreferences();
}

function toggleRuler() {
  settings.ruler.visible = !settings.ruler.visible;
  applyViewSettings();
  savePreferences();
}

function toggleSplitView() {
  updateCanonicalFromSource(currentSource);
  settings.view.split = !settings.view.split;
  elements.splitEditor.innerHTML = canonicalHTML;
  applyViewSettings();
  savePreferences();
}

function setEditorsReadOnly(readOnly) {
  elements.flowEditor.contentEditable = String(!readOnly);
  elements.splitEditor.contentEditable = String(!readOnly);
  pageBodies().forEach(body => { body.contentEditable = String(!readOnly); });

  const editingSelector = [
    "[data-command]", "[data-screenplay-element]", "[data-screenplay-scene-prefix]",
    "[data-screenplay-scene-time]", "[data-screenplay-character-modifier]",
    "#blockFormat", "#fontFamily", "#fontSize", "#textColor", "#highlightColor",
    "#listStyle", "#lineHeight", "#spaceBefore", "#spaceAfter", "#firstLineIndent",
    "#caseTransform", "#formatPainterButton", "#pageBreakButton", "#horizontalRuleButton",
    "#textBoxButton", "#tocButton", "#insertLinkButton", "#bookmarkButton", "#footnoteButton",
    "#citationButton", "#tableButton", "#imageButton", "#captionButton", "#specialCharsButton",
    "#columnsSelect", "#applyColumnsButton", "#imageInput", "#undoButton", "#redoButton",
    "#replaceCurrent", "#replaceAll", "#pageSetupButton", "#headerFooterButton", "#sidebarPageSetup",
    "#pageMarginLeft", "#pageMarginRight", "#pageMarginTop", "#pageMarginBottom",
    "#screenplayToggleButton", "#screenplayTitlePageButton", "#screenplayElementSelect",
    "#screenplayPagePreset", "#screenplaySceneNumbersButton", "#screenplaySidebarTitlePage",
    "#screenplayInsertTitlePage"
  ].join(",");
  document.querySelectorAll(editingSelector).forEach(control => {
    if ("disabled" in control) control.disabled = Boolean(readOnly);
  });
}

function toggleReadMode() {
  settings.view.read = !settings.view.read;
  applyViewSettings();
  savePreferences();
}

function toggleFocusMode() {
  elements.body.classList.toggle("focus-mode");
  const active = elements.body.classList.contains("focus-mode");
  elements.focusModeButton.classList.toggle("is-active", active);
  elements.viewFocusModeButton.classList.toggle("is-active", active);
  if (active) activeEditor()?.focus();
}

function goToPage(number) {
  const pages = $$(".editor-page");
  const target = pages[Math.max(0, Math.min(pages.length - 1, Number(number) - 1))];
  if (!target) return;
  if (settings.view.mode !== "pages") setViewMode("pages");
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.querySelector(".page-body")?.focus({ preventScroll: true });
}

/* =========================================================
   BUSCA E SUBSTITUIÇÃO
   ========================================================= */

function clearSearchHighlights(updateSource = true) {
  const roots = [elements.flowEditor, elements.splitEditor, ...pageBodies()];
  roots.forEach(root => {
    root.querySelectorAll?.(".search-hit").forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent)));
    root.normalize?.();
  });
  searchMatches = [];
  searchIndex = -1;
  if (updateSource) updateCanonicalFromSource(currentSource);
}

function searchRoot() {
  if (settings.view.split && elements.splitEditor.contains(document.activeElement)) return elements.splitEditor;
  if (settings.view.mode === "flow") return elements.flowEditor;
  return elements.pagesContainer;
}

function performSearch() {
  clearSearchHighlights(false);
  const term = elements.findInput.value;
  if (!term) {
    elements.findCounter.textContent = "0 de 0";
    return;
  }

  const root = searchRoot();
  const matchCase = elements.matchCase.checked;
  const needle = matchCase ? term : term.toLocaleLowerCase("pt-BR");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.parentElement?.closest(".page-header, .page-footer, .page-number-badge, script, style")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    const original = node.nodeValue;
    const haystack = matchCase ? original : original.toLocaleLowerCase("pt-BR");
    let cursor = 0;
    let foundAt;
    let changed = false;
    const fragment = document.createDocumentFragment();

    while ((foundAt = haystack.indexOf(needle, cursor)) !== -1) {
      fragment.append(document.createTextNode(original.slice(cursor, foundAt)));
      const mark = document.createElement("mark");
      mark.className = "search-hit";
      mark.textContent = original.slice(foundAt, foundAt + term.length);
      fragment.append(mark);
      searchMatches.push(mark);
      changed = true;
      cursor = foundAt + term.length;
    }

    if (changed) {
      fragment.append(document.createTextNode(original.slice(cursor)));
      node.replaceWith(fragment);
    }
  });

  searchIndex = searchMatches.length ? 0 : -1;
  focusSearchMatch();
}

function focusSearchMatch() {
  searchMatches.forEach((mark, index) => mark.classList.toggle("search-hit-current", index === searchIndex));
  elements.findCounter.textContent = searchMatches.length ? `${searchIndex + 1} de ${searchMatches.length}` : "0 de 0";
  searchMatches[searchIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function moveSearch(direction) {
  if (!searchMatches.length) return;
  searchIndex = (searchIndex + direction + searchMatches.length) % searchMatches.length;
  focusSearchMatch();
}

function replaceCurrentMatch() {
  const mark = searchMatches[searchIndex];
  if (!mark || !canMutateDocument()) return;
  pushUndoSnapshot(true);
  mark.replaceWith(document.createTextNode(elements.replaceInput.value));
  afterMutation(currentSource, { repaginatePages: false });
  if (currentSource === "pages") repaginate({ preserveSelection: false });
  performSearch();
}

function replaceAllMatches() {
  if (!searchMatches.length || !canMutateDocument()) return;
  pushUndoSnapshot(true);
  const replacement = elements.replaceInput.value;
  searchMatches.forEach(mark => mark.replaceWith(document.createTextNode(replacement)));
  afterMutation(currentSource, { repaginatePages: false });
  if (currentSource === "pages") repaginate({ preserveSelection: false });
  performSearch();
}

function openFind(replace = false) {
  elements.findPanel.hidden = false;
  elements.replaceInput.hidden = !replace;
  elements.replaceCurrent.hidden = !replace;
  elements.replaceAll.hidden = !replace;
  elements.findInput.focus();
  elements.findInput.select();
  performSearch();
}

function closeFind() {
  clearSearchHighlights(true);
  elements.findPanel.hidden = true;
}

/* =========================================================
   COLAGEM INTELIGENTE E MENU DE CONTEXTO
   ========================================================= */

function sanitizeHTML(html, merge = false) {
  const parser = new DOMParser();
  const documentValue = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = documentValue.body.firstElementChild;
  if (!root) return "";

  const allowedTags = new Set([
    "A", "ARTICLE", "B", "BIG", "BLOCKQUOTE", "BR", "CITE", "CODE", "COL", "COLGROUP",
    "DD", "DEL", "DETAILS", "DIV", "DL", "DT", "EM", "FIGCAPTION", "FIGURE", "FONT",
    "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "I", "IMG", "INS",
    "KBD", "LI", "MAIN", "MARK", "NAV", "OL", "P", "PRE", "Q", "S", "SAMP", "SECTION",
    "SMALL", "SPAN", "STRIKE", "STRONG", "SUB", "SUMMARY", "SUP", "TABLE", "TBODY", "TD",
    "TFOOT", "TH", "THEAD", "TR", "U", "UL", "VAR"
  ]);
  const allowedAttributes = new Set([
    "alt", "class", "colspan", "contenteditable", "dir", "height", "href", "id", "lang", "name",
    "rel", "reversed", "role", "rowspan", "scope", "spellcheck", "src", "start", "style", "target",
    "title", "type", "width"
  ]);
  const blockedTags = "script, style, iframe, object, embed, meta, link, base, form, input, button, textarea, select, option, svg";
  root.querySelectorAll(blockedTags).forEach(node => node.remove());

  [...root.querySelectorAll("*")].forEach(node => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }

    [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const isDataOrAria = name.startsWith("data-") || name.startsWith("aria-");
      if (
        name.startsWith("on") ||
        (!allowedAttributes.has(name) && !isDataOrAria) ||
        (merge && !["href", "src", "alt", "colspan", "rowspan"].includes(name))
      ) {
        node.removeAttribute(attribute.name);
      }
    });

    if (node.hasAttribute("style") && /(?:expression\s*\(|url\s*\(|@import|-moz-binding|behavior\s*:)/i.test(node.getAttribute("style"))) {
      node.removeAttribute("style");
    }

    if (node.tagName === "A") {
      const safeHref = sanitizeURLAttribute(node.getAttribute("href"), "href");
      if (safeHref) node.setAttribute("href", safeHref);
      else node.removeAttribute("href");

      if (node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer");
      } else {
        node.removeAttribute("target");
        node.removeAttribute("rel");
      }
    }

    if (node.tagName === "IMG") {
      const safeSrc = sanitizeURLAttribute(node.getAttribute("src"), "src");
      if (safeSrc) node.setAttribute("src", safeSrc);
      else node.removeAttribute("src");
    }
  });

  return root.innerHTML;
}

function sanitizeURLAttribute(value, kind = "href") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const compact = trimmed.replace(/[\u0000-\u0020\u007f]+/g, "");
  if (/^(?:javascript|vbscript|file|filesystem):/i.test(compact)) return "";

  if (kind === "src" && /^data:/i.test(compact)) {
    return /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(compact) ? trimmed : "";
  }

  if (/^(?:https?:|mailto:|tel:|blob:)/i.test(compact)) return trimmed;
  if (/^(?:#|\/|\.\/|\.\.\/)/.test(trimmed)) return trimmed;
  return /^[a-z][a-z0-9+.-]*:/i.test(compact) ? "" : trimmed;
}

function normalizeLinkTarget(value, internal = false) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (internal) {
    const id = trimmed.replace(/^#/, "");
    return /^[A-Za-z][\w:.-]*$/.test(id) ? `#${id}` : "";
  }

  if (/^(?:javascript|vbscript|data|file|filesystem):/i.test(trimmed.replace(/[\u0000-\u0020\u007f]+/g, ""))) {
    return "";
  }
  if (/^(?:https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(trimmed)) return trimmed;
  if (/^(?:www\.|[^\s/]+\.[A-Za-z]{2,}(?:\/|$))/.test(trimmed)) return `https://${trimmed}`;
  return "";
}

function showPasteOptions(event) {
  event.preventDefault();
  if (!canMutateDocument()) return;
  saveSelection();
  const transfer = event.clipboardData || event.dataTransfer;
  pendingPaste = {
    html: transfer?.getData("text/html") || "",
    text: transfer?.getData("text/plain") || ""
  };

  if (!pendingPaste.html && !pendingPaste.text) return;

  const selection = window.getSelection();
  const rect = selection?.rangeCount ? selection.getRangeAt(0).getBoundingClientRect() : null;
  elements.pastePopover.hidden = false;
  elements.pastePopover.style.left = `${Math.min(innerWidth - 220, Math.max(8, rect?.left || 20))}px`;
  elements.pastePopover.style.top = `${Math.min(innerHeight - 170, Math.max(8, (rect?.bottom || 20) + 8))}px`;
}

function placeDropCaret(event, root) {
  let node = null;
  let offset = 0;

  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(event.clientX, event.clientY);
    node = position?.offsetNode || null;
    offset = position?.offset || 0;
  } else if (document.caretRangeFromPoint) {
    const pointRange = document.caretRangeFromPoint(event.clientX, event.clientY);
    node = pointRange?.startContainer || null;
    offset = pointRange?.startOffset || 0;
  }

  if (!node || !(root === node || root.contains(node))) return false;

  try {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
    currentSource = sourceFromRoot(root);
    return true;
  } catch {
    return false;
  }
}

function handleEditorDrop(event) {
  event.preventDefault();
  if (!canMutateDocument()) return;

  const root = event.currentTarget;
  root.focus({ preventScroll: true });
  if (!placeDropCaret(event, root)) placeCaretAtEnd(root);

  const file = [...(event.dataTransfer?.files || [])][0];
  if (file) {
    insertImage(file);
    return;
  }

  showPasteOptions(event);
}

function completePaste(mode) {
  if (!pendingPaste || !canMutateDocument()) return;
  restoreSelection();
  pushUndoSnapshot(true);

  if (mode === "plain" || !pendingPaste.html) {
    document.execCommand("insertText", false, pendingPaste.text);
  } else if (mode === "merge") {
    document.execCommand("insertHTML", false, sanitizeHTML(pendingPaste.html, true));
  } else {
    document.execCommand("insertHTML", false, sanitizeHTML(pendingPaste.html, false));
  }

  pendingPaste = null;
  elements.pastePopover.hidden = true;
  afterMutation(currentSource);
}

function openContextMenu(event) {
  event.preventDefault();
  saveSelection();
  elements.contextMenu.hidden = false;
  elements.contextMenu.style.left = `${Math.min(event.clientX, innerWidth - 215)}px`;
  elements.contextMenu.style.top = `${Math.min(event.clientY, innerHeight - 330)}px`;
}

async function contextAction(action) {
  elements.contextMenu.hidden = true;
  restoreSelection();

  if (["cut", "copy"].includes(action)) {
    if (action === "cut" && !canMutateDocument()) return;
    document.execCommand(action);
    if (action === "cut") afterMutation(currentSource);
    return;
  }

  if (["paste", "pastePlain"].includes(action)) {
    if (!canMutateDocument()) return;
    try {
      const text = await navigator.clipboard.readText();
      document.execCommand("insertText", false, text);
      afterMutation(currentSource);
    } catch {
      alert(action === "paste" ? "O navegador bloqueou a área de transferência. Use Ctrl + V." : "Use Ctrl + Shift + V para colar sem formatação.");
    }
    return;
  }

  if (action === "selectAll") {
    activeEditor()?.focus();
    document.execCommand("selectAll");
  } else if (action === "link") {
    prepareLinkDialog();
  } else if (action === "pageBreak") {
    insertManualPageBreak();
  } else if (action === "removeFormat") {
    execCommand("removeFormat");
  }
}

/* =========================================================
   DIÁLOGOS DE INSERÇÃO
   ========================================================= */

function prepareLinkDialog() {
  const bookmarks = listBookmarks();
  elements.linkBookmark.replaceChildren();
  bookmarks.forEach(bookmark => {
    const option = document.createElement("option");
    option.value = bookmark.id;
    option.textContent = bookmark.name;
    elements.linkBookmark.append(option);
  });
  elements.linkType.value = "url";
  elements.linkUrlField.hidden = false;
  elements.linkBookmarkField.hidden = true;
  elements.linkUrl.value = "https://";
  openDialog(elements.linkDialog, elements.linkUrl);
}

function renderSymbols() {
  elements.symbolsGrid.replaceChildren();
  SYMBOLS.forEach(symbol => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "symbol-button";
    button.textContent = symbol;
    button.title = `Inserir ${symbol}`;
    button.addEventListener("click", () => {
      closeDialog(elements.specialCharsDialog);
      insertText(symbol);
    });
    elements.symbolsGrid.append(button);
  });
}

/* =========================================================
   BIND DOS EDITORES
   ========================================================= */

function handleEditorBeforeInput(event) {
  if (!canMutateDocument()) {
    event.preventDefault();
    return;
  }
  pushUndoSnapshot(false);
}

function handleEditorInput(event, source) {
  if (!canMutateDocument()) return;
  currentSource = source;
  clearSearchHighlights(false);
  updateCanonicalFromSource(source);

  if (source === "pages") {
    const structuralInput = [
      "insertParagraph",
      "insertLineBreak",
      "formatBlock"
    ].includes(event.inputType);

    if (structuralInput) {
      repaginate({ preserveSelection: true });
      scrollCaretPageIntoView();
    } else {
      debounceRepagination(() => repaginate({ preserveSelection: true }));
    }
  } else {
    syncInactiveEditors();
  }

  markDirty();
}


function closestEditableBlock(root, node) {
  let element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  const selector = "p, div, h1, h2, h3, blockquote, pre, li, figcaption, td, th";

  while (element && element !== root) {
    if (element.matches?.(selector)) return element;
    element = element.parentElement;
  }

  return null;
}

function ensureBlockHasCaretSpace(block) {
  if (!block) return;
  const hasVisibleContent = block.textContent.length > 0 || block.querySelector("img, br, table, hr");
  if (!hasVisibleContent) block.append(document.createElement("br"));
}

function insertSoftLineBreak(root, range) {
  range.deleteContents();

  const firstBreak = document.createElement("br");
  const placeholder = document.createElement("br");
  range.insertNode(placeholder);
  range.insertNode(firstBreak);
  range.setStartAfter(firstBreak);
  range.collapse(true);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange = range.cloneRange();
}

function splitBlockAtCaret(root, range) {
  const origin = range.startContainer?.nodeType === Node.TEXT_NODE
    ? range.startContainer.parentElement
    : range.startContainer;
  const semanticContainer = origin?.closest?.("li, td, th, figcaption, .text-box");

  if (semanticContainer && root.contains(semanticContainer)) {
    return document.execCommand("insertParagraph", false, null);
  }

  let block = closestEditableBlock(root, range.startContainer);

  if (!block || block === root) {
    const paragraph = document.createElement("p");
    paragraph.append(document.createElement("br"));
    range.deleteContents();
    range.insertNode(paragraph);
    placeCaretAtStart(paragraph);
    return true;
  }

  if (block.matches("pre")) {
    const worked = document.execCommand("insertText", false, "\n");
    return worked;
  }

  range.deleteContents();

  const trailingRange = document.createRange();
  trailingRange.setStart(range.startContainer, range.startOffset);
  trailingRange.setEndAfter(block.lastChild || block);
  const trailing = trailingRange.extractContents();

  const isHeading = /^H[1-3]$/.test(block.tagName);
  const newBlock = isHeading ? document.createElement("p") : block.cloneNode(false);
  newBlock.removeAttribute("id");
  newBlock.removeAttribute("data-bookmark-name");
  newBlock.append(trailing);

  ensureBlockHasCaretSpace(block);
  ensureBlockHasCaretSpace(newBlock);
  block.after(newBlock);
  placeCaretAtStart(newBlock);
  return true;
}

function insertReliableBreak(root, soft = false) {
  if (!root) return;

  root.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selectionBelongsToRoot(selection, root)) {
    placeCaretAtEnd(root);
  }

  const liveSelection = window.getSelection();
  const range = liveSelection?.rangeCount ? liveSelection.getRangeAt(0) : null;
  if (!range) return;

  pushUndoSnapshot(true);

  let worked = false;
  try {
    if (soft) {
      insertSoftLineBreak(root, range);
      worked = true;
    } else {
      worked = splitBlockAtCaret(root, range);
      if (!worked) {
        worked = document.execCommand("insertParagraph", false, null);
      }
    }
  } catch (error) {
    console.warn("Falha ao inserir quebra; usando fallback do navegador.", error);
    worked = document.execCommand(soft ? "insertLineBreak" : "insertParagraph", false, null);
  }

  if (!worked) return;

  saveSelection();
  currentSource = sourceFromRoot(root);

  if (currentSource === "pages") {
    // O Enter é uma alteração estrutural. Paginar imediatamente evita que
    // vários parágrafos vazios fiquem presos na mesma folha e faz a nova
    // página aparecer assim que o limite da folha é alcançado.
    afterMutation(currentSource, { repaginatePages: false });
    repaginate({ preserveSelection: true });
    scrollCaretPageIntoView();
  } else {
    afterMutation(currentSource);
  }
}

function handleEditorKeydown(event) {
  const root = event.currentTarget;

  if (event.key === "Tab") {
    event.preventDefault();
    event.stopPropagation();
    insertTab(event.shiftKey, root);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();

    if (event.ctrlKey || event.metaKey) {
      insertManualPageBreak();
    } else {
      insertReliableBreak(root, event.shiftKey);
    }
  }
}

function bindEditorRoot(root, source) {
  if (root.dataset.bound === "true") return;
  root.dataset.bound = "true";
  root.addEventListener("beforeinput", handleEditorBeforeInput);
  root.addEventListener("input", event => handleEditorInput(event, source));
  root.addEventListener("keydown", handleEditorKeydown);
  root.addEventListener("paste", showPasteOptions);
  root.addEventListener("drop", handleEditorDrop);
  root.addEventListener("click", handleImageClick);
  root.addEventListener("dblclick", event => {
    const image = event.target.closest("figure.document-figure img");
    if (image) {
      selectImage(image);
      mutateSelectedImage("alt");
    }
  });
  root.addEventListener("mouseup", () => {
    saveSelection();
    refreshToolbarState();
    if (formatPainterArmed) applyFormatPainter();
  });
  root.addEventListener("keyup", () => {
    saveSelection();
    refreshToolbarState();
  });
  root.addEventListener("focus", () => {
    currentSource = source;
    if (source === "split" && elements.splitEditor.innerHTML !== canonicalHTML) {
      elements.splitEditor.innerHTML = canonicalHTML;
    }
  });
  root.addEventListener("blur", () => {
    if (source === "split" || source === "flow") {
      updateCanonicalFromSource(source);
      if (source === "split") {
        elements.flowEditor.innerHTML = canonicalHTML;
        buildPagesFromHTML(canonicalHTML);
      } else {
        elements.splitEditor.innerHTML = canonicalHTML;
      }
    }
  });
  root.addEventListener("contextmenu", openContextMenu);
}

/* =========================================================
   EVENTOS GERAIS
   ========================================================= */

function registerRibbonEvents() {
  $$("[data-ribbon-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      $$("[data-ribbon-tab]").forEach(item => item.classList.toggle("is-active", item === tab));
      $$("[data-ribbon-panel]").forEach(panel => panel.classList.toggle("is-active", panel.dataset.ribbonPanel === tab.dataset.ribbonTab));
    });
  });
}

function registerFormattingEvents() {
  $$('[data-command]').forEach(button => {
    button.addEventListener("mousedown", event => event.preventDefault());
    button.addEventListener("click", () => execCommand(button.dataset.command));
  });

  elements.blockFormat.addEventListener("change", event => execCommand("formatBlock", event.target.value));
  elements.fontFamily.addEventListener("change", event => execCommand("fontName", event.target.value));
  elements.fontSize.addEventListener("change", applyFontSize);
  elements.textColor.addEventListener("input", event => execCommand("foreColor", event.target.value));
  elements.highlightColor.addEventListener("input", event => execCommand("hiliteColor", event.target.value));
  elements.lineHeight.addEventListener("change", () => applyStyleToBlocks({ lineHeight: elements.lineHeight.value }));
  elements.spaceBefore.addEventListener("change", () => applyStyleToBlocks({ marginTop: `${Number(elements.spaceBefore.value) || 0}pt` }));
  elements.spaceAfter.addEventListener("change", () => applyStyleToBlocks({ marginBottom: `${Number(elements.spaceAfter.value) || 0}pt` }));
  elements.firstLineIndent.addEventListener("change", () => {
    settings.ruler.firstLineIndent = Number(elements.firstLineIndent.value) || 0;
    updateRuler();
    applyStyleToBlocks({ textIndent: `${settings.ruler.firstLineIndent}px` });
  });
  elements.caseTransform.addEventListener("change", () => transformCase(elements.caseTransform.value));
  elements.formatPainterButton.addEventListener("click", captureFormatPainter);
  elements.listStyle.addEventListener("change", applyListStyle);
  elements.applyColumnsButton.addEventListener("click", applyColumns);
}

function registerInsertionEvents() {
  elements.pageBreakButton.addEventListener("click", insertManualPageBreak);
  elements.horizontalRuleButton.addEventListener("click", insertHorizontalRule);
  elements.textBoxButton.addEventListener("click", insertTextBox);
  elements.tocButton.addEventListener("click", insertAutomaticTOC);
  elements.insertLinkButton.addEventListener("click", prepareLinkDialog);
  elements.bookmarkButton.addEventListener("click", () => openDialog(elements.bookmarkDialog, elements.bookmarkName));
  elements.footnoteButton.addEventListener("click", () => openDialog(elements.footnoteDialog, elements.footnoteText));
  elements.citationButton.addEventListener("click", () => openDialog(elements.citationDialog, elements.citationAuthor));
  elements.tableButton.addEventListener("click", () => openDialog(elements.tableDialog, elements.tableRows));
  elements.imageButton.addEventListener("click", () => elements.imageInput.click());
  elements.imageInput.addEventListener("change", () => insertImage(elements.imageInput.files?.[0]));
  elements.captionButton.addEventListener("click", addCaption);
  elements.specialCharsButton.addEventListener("click", () => openDialog(elements.specialCharsDialog));

  elements.linkType.addEventListener("change", () => {
    const internal = elements.linkType.value === "bookmark";
    elements.linkUrlField.hidden = internal;
    elements.linkBookmarkField.hidden = !internal;
  });

  elements.linkForm.addEventListener("submit", event => {
    event.preventDefault();
    const internal = elements.linkType.value === "bookmark";
    const value = internal ? elements.linkBookmark.value : elements.linkUrl.value.trim();
    closeDialog(elements.linkDialog);
    if (value) insertLink(value, internal);
  });

  elements.bookmarkForm.addEventListener("submit", event => {
    event.preventDefault();
    const name = elements.bookmarkName.value.trim();
    if (!name) return;
    closeDialog(elements.bookmarkDialog);
    createBookmark(name);
    elements.bookmarkForm.reset();
  });

  elements.footnoteForm.addEventListener("submit", event => {
    event.preventDefault();
    const text = elements.footnoteText.value.trim();
    if (!text) return;
    closeDialog(elements.footnoteDialog);
    insertFootnote(text);
    elements.footnoteForm.reset();
  });

  elements.citationForm.addEventListener("submit", event => {
    event.preventDefault();
    closeDialog(elements.citationDialog);
    insertCitation();
    elements.citationForm.reset();
  });

  elements.tableForm.addEventListener("submit", event => {
    event.preventDefault();
    const rows = Math.max(1, Math.min(30, Number(elements.tableRows.value) || 3));
    const columns = Math.max(1, Math.min(12, Number(elements.tableColumns.value) || 3));
    const header = elements.tableHeader.checked;
    closeDialog(elements.tableDialog);
    insertTable(rows, columns, header);
  });
}

function registerPageEvents() {
  elements.pageSetupButton.addEventListener("click", () => {
    populatePageSetupForm();
    openDialog(elements.pageSetupDialog);
  });
  elements.sidebarPageSetup.addEventListener("click", () => {
    populatePageSetupForm();
    openDialog(elements.pageSetupDialog);
  });
  elements.headerFooterButton.addEventListener("click", () => {
    populateHeaderFooterForm();
    openDialog(elements.headerFooterDialog);
  });
  elements.pageSetupForm.addEventListener("submit", event => {
    event.preventDefault();
    applyPageSetup();
  });
  elements.headerFooterForm.addEventListener("submit", event => {
    event.preventDefault();
    applyHeaderFooter();
  });

  elements.pagePreset.addEventListener("change", () => {
    const preset = PAGE_PRESETS[elements.pagePreset.value];
    if (!preset) return;
    elements.customPageWidth.value = preset.width;
    elements.customPageHeight.value = preset.height;
  });

  elements.marginPreset.addEventListener("change", () => {
    const presets = {
      normal: [86, 82, 86, 82],
      narrow: [48, 48, 48, 48],
      wide: [110, 118, 110, 118]
    };
    const value = presets[elements.marginPreset.value];
    if (!value) return;
    [elements.setupMarginTop.value, elements.setupMarginRight.value, elements.setupMarginBottom.value, elements.setupMarginLeft.value] = value;
  });

  [elements.pageMarginLeft, elements.pageMarginRight, elements.pageMarginTop, elements.pageMarginBottom].forEach(input => input.addEventListener("change", updateQuickMargins));
}

function registerViewEvents() {
  elements.pageModeButton.addEventListener("click", () => setViewMode("pages"));
  elements.flowModeButton.addEventListener("click", () => setViewMode("flow"));
  elements.toggleSidebarButton.addEventListener("click", toggleSidebar);
  elements.toggleRulerButton.addEventListener("click", toggleRuler);
  elements.splitViewButton.addEventListener("click", toggleSplitView);
  elements.readModeButton.addEventListener("click", toggleReadMode);
  elements.viewReadModeButton.addEventListener("click", toggleReadMode);
  elements.focusModeButton.addEventListener("click", toggleFocusMode);
  elements.viewFocusModeButton.addEventListener("click", toggleFocusMode);
  elements.zoomRange.addEventListener("input", event => setZoom(event.target.value));
  elements.zoomOutButton.addEventListener("click", () => setZoom(settings.view.zoom - 10));
  elements.zoomInButton.addEventListener("click", () => setZoom(settings.view.zoom + 10));
  elements.goToPageButton.addEventListener("click", () => openDialog(elements.goToPageDialog, elements.goToPageInput));
  elements.sidebarGoToPage.addEventListener("click", () => openDialog(elements.goToPageDialog, elements.goToPageInput));
  elements.statusPageButton.addEventListener("click", () => openDialog(elements.goToPageDialog, elements.goToPageInput));
  elements.goToPageForm.addEventListener("submit", event => {
    event.preventDefault();
    const page = Number(elements.goToPageInput.value) || 1;
    closeDialog(elements.goToPageDialog);
    goToPage(page);
  });
}

function registerSearchEvents() {
  elements.findButton.addEventListener("click", () => openFind(false));
  elements.closeFindPanel.addEventListener("click", closeFind);
  elements.findInput.addEventListener("input", performSearch);
  elements.matchCase.addEventListener("change", performSearch);
  elements.findNext.addEventListener("click", () => moveSearch(1));
  elements.findPrevious.addEventListener("click", () => moveSearch(-1));
  elements.replaceCurrent.addEventListener("click", replaceCurrentMatch);
  elements.replaceAll.addEventListener("click", replaceAllMatches);
}

function registerRulerEvents() {
  elements.leftIndentMarker.addEventListener("pointerdown", event => beginMarkerDrag("left", event));
  elements.firstIndentMarker.addEventListener("pointerdown", event => beginMarkerDrag("first", event));
  elements.rightIndentMarker.addEventListener("pointerdown", event => beginMarkerDrag("right", event));
  elements.rulerScale.addEventListener("click", addTabStop);
}

function registerMenuAndDialogEvents() {
  elements.contextMenu.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (button) contextAction(button.dataset.action);
  });

  elements.pastePopover.addEventListener("click", event => {
    const button = event.target.closest("button[data-paste-mode]");
    if (button) completePaste(button.dataset.pasteMode);
  });

  document.addEventListener("click", event => {
    if (!elements.contextMenu.contains(event.target)) elements.contextMenu.hidden = true;
    if (!elements.pastePopover.contains(event.target) && !pendingPaste) elements.pastePopover.hidden = true;
  });

  elements.closeLinkDialog.addEventListener("click", () => closeDialog(elements.linkDialog));
  elements.cancelLinkDialog.addEventListener("click", () => closeDialog(elements.linkDialog));

  $$('[data-close-dialog]').forEach(button => {
    button.addEventListener("click", () => closeDialog(document.getElementById(button.dataset.closeDialog)));
  });

  $$('dialog').forEach(dialog => {
    dialog.addEventListener("click", event => {
      if (event.target === dialog && dialog !== elements.recoveryDialog) closeDialog(dialog);
    });
  });
}

function registerGlobalEvents() {
  elements.title.addEventListener("input", () => {
    elements.sidebarDocumentName.textContent = elements.title.value || "Documento sem título";
    markDirty();
  });
  elements.title.addEventListener("blur", () => saveCurrentDocument(false));
  elements.undoButton.addEventListener("click", undo);
  elements.redoButton.addEventListener("click", redo);
  elements.versionsButton.addEventListener("click", () => {
    saveCurrentDocument(true);
    renderVersions();
    openDialog(elements.versionsDialog);
  });

  document.addEventListener("selectionchange", saveSelection);

  document.addEventListener("keydown", event => {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (modifier && key === "s") {
      event.preventDefault();
      saveCurrentDocument(true);
    } else if (modifier && key === "f") {
      event.preventDefault();
      openFind(false);
    } else if (modifier && key === "h") {
      event.preventDefault();
      openFind(true);
    } else if (modifier && key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if ((modifier && key === "y") || (modifier && event.shiftKey && key === "z")) {
      event.preventDefault();
      redo();
    } else if (event.key === "Escape") {
      clearImageSelection();
      if (elements.body.classList.contains("focus-mode")) toggleFocusMode();
      if (!elements.findPanel.hidden) closeFind();
      formatPainterArmed = false;
      elements.formatPainterButton.classList.remove("is-armed");
      elements.contextMenu.hidden = true;
      elements.pastePopover.hidden = true;
    }
  });

  document.addEventListener("atero:lock-lost", event => {
    if (event.detail?.documentId === currentDocumentId) setDocumentLockState(true);
  });

  document.addEventListener("atero:lock-acquired", event => {
    if (event.detail?.documentId === currentDocumentId) setDocumentLockState(false);
  });

  window.addEventListener("resize", () => {
    updateRuler();
    positionImageToolbar();
  });
  elements.primaryPane.addEventListener("scroll", positionImageToolbar, { passive: true });
  elements.secondaryPane.addEventListener("scroll", positionImageToolbar, { passive: true });
  window.addEventListener("beforeunload", () => {
    if (isDirty) {
      saveRecovery();
      saveCurrentDocument(false);
    }
  });
  window.addEventListener("pagehide", () => {
    if (isDirty) {
      saveRecovery();
      saveCurrentDocument(false);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && isDirty) {
      saveRecovery();
      saveCurrentDocument(false);
    }
  });
}

function registerEvents() {
  bindEditorRoot(elements.flowEditor, "flow");
  bindEditorRoot(elements.splitEditor, "split");
  registerRibbonEvents();
  registerFormattingEvents();
  registerInsertionEvents();
  registerPageEvents();
  registerViewEvents();
  registerSearchEvents();
  registerRulerEvents();
  registerMenuAndDialogEvents();
  registerGlobalEvents();
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function initialize() {
  validateEditorInterface();
  try {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("defaultParagraphSeparator", false, "p");
  } catch (error) {
    console.warn("O navegador não aceitou a configuração inicial de edição:", error);
  }
  injectEditorInteractionStyles();
  renderSymbols();
  registerEvents();

  if (window.AteroWriteData?.ready) {
    await window.AteroWriteData.ready;
  }

  const loaded = loadCurrentDocument();
  if (!loaded) return;

  const ownsLock = window.AteroWriteData?.claimDocumentLock?.(currentDocumentId) ?? true;
  setDocumentLockState(!ownsLock);
  applyCSSSettings();
  applyViewSettings();
  updateRuler();

  setTimeout(() => {
    if (!documentReadOnlyBecauseLock) activeEditor()?.focus();
  }, 0);
}

window.AteroWriteEditor = {
  getCurrentDocumentId: () => currentDocumentId,
  getCurrentDocument: () => loadDocuments().find(item => item.id === currentDocumentId) || null,
  getCanonicalHTML: () => {
    updateCanonicalFromSource(currentSource);
    return canonicalHTML;
  },
  replaceCurrentContent: (html, importedSettings = null) => {
    if (documentReadOnlyBecauseLock) return false;
    if (importedSettings) settings = deepMerge(DEFAULT_SETTINGS, importedSettings);
    applyCSSSettings();
    applyViewSettings();
    setDocumentContent(String(html || ""));
    markDirty();
    return true;
  },
  saveNow: () => saveCurrentDocument(true),
  requestSave: () => saveCurrentDocument(false),
  isReadOnly: () => documentReadOnlyBecauseLock || settings.view.read,
  setLockReadOnly: setDocumentLockState
};

initialize().catch(error => {
  console.error("Falha ao inicializar o editor:", error);
  setSaveStatus("error", "Falha ao abrir documento");
});
