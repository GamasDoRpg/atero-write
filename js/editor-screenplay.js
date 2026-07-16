"use strict";

/* =========================================================
   ATERO WRITE — MODO ROTEIRO
   Módulo independente carregado depois de editor.js.
   ========================================================= */

(() => {
  const DOCUMENTS_KEY = "atero_write_documents";
  const SCRIPT_CLASSES = [
    "screenplay-normal",
    "screenplay-action",
    "screenplay-scene-heading",
    "screenplay-character",
    "screenplay-parenthetical",
    "screenplay-dialogue",
    "screenplay-transition",
    "screenplay-shot",
    "screenplay-centered"
  ];

  const TYPE_LABELS = {
    normal: "Texto comum",
    action: "Ação",
    scene: "Slugline",
    character: "Personagem",
    parenthetical: "Parentético",
    dialogue: "Diálogo",
    transition: "Transição",
    shot: "Plano",
    centered: "Centralizado"
  };

  const TYPE_PLACEHOLDERS = {
    normal: "Texto comum",
    action: "Descreva a ação…",
    scene: "INT. LOCAL — DIA",
    character: "NOME DO PERSONAGEM",
    parenthetical: "(baixo)",
    dialogue: "Diálogo…",
    transition: "CORTE PARA:",
    shot: "CLOSE EM:",
    centered: "Texto centralizado"
  };

  const TAB_NEXT = {
    normal: "action",
    action: "character",
    character: "parenthetical",
    parenthetical: "dialogue",
    dialogue: "transition",
    transition: "scene",
    scene: "action",
    shot: "action",
    centered: "action"
  };

  const TAB_PREVIOUS = {
    normal: "centered",
    action: "scene",
    scene: "transition",
    transition: "dialogue",
    dialogue: "parenthetical",
    parenthetical: "character",
    character: "action",
    shot: "transition",
    centered: "shot"
  };

  const ENTER_NEXT = {
    normal: "normal",
    action: "action",
    scene: "action",
    character: "dialogue",
    parenthetical: "dialogue",
    dialogue: "action",
    transition: "scene",
    shot: "action",
    centered: "action"
  };

  const UPPERCASE_TYPES = new Set([
    "scene",
    "character",
    "transition",
    "shot"
  ]);

  const REVISION_COLORS = {
    white: "#ffffff",
    blue: "#b9dcff",
    pink: "#ffc4dc",
    yellow: "#ffe58a",
    green: "#bfe8c8",
    goldenrod: "#e4b84b",
    buff: "#e7cf9d",
    salmon: "#f0a18f",
    cherry: "#d45a76",
    tan: "#d7bb91",
    gray: "#c8c8c8",
    ivory: "#f4eedb"
  };

  const DEFAULT_SCREENPLAY = {
    enabled: false,
    pagePreset: "Letter",
    pageConfigured: false,
    title: "",
    author: "",
    draftName: "Primeiro rascunho",
    draftDate: new Date().toISOString().slice(0, 10),
    revision: "white",
    contact: "",
    copyright: "",
    sceneNumbers: true
  };

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const elements = {
    body: document.body,
    title: $("#documentTitle"),
    stage: $("#documentStage"),
    pagesContainer: $("#pagesContainer"),
    flowEditor: $("#flowEditor"),
    splitEditor: $("#splitEditor"),
    pageModeButton: $("#pageModeButton"),
    pageSetupForm: $("#pageSetupForm"),
    pagePreset: $("#pagePreset"),
    pageOrientation: $("#pageOrientation"),
    customPageWidth: $("#customPageWidth"),
    customPageHeight: $("#customPageHeight"),
    pageColor: $("#pageColor"),
    marginPreset: $("#marginPreset"),
    setupMarginTop: $("#setupMarginTop"),
    setupMarginRight: $("#setupMarginRight"),
    setupMarginBottom: $("#setupMarginBottom"),
    setupMarginLeft: $("#setupMarginLeft"),
    headerFooterForm: $("#headerFooterForm"),
    headerText: $("#headerText"),
    footerText: $("#footerText"),
    showPageNumbers: $("#showPageNumbers"),
    pageNumberPosition: $("#pageNumberPosition"),
    differentFirstPage: $("#differentFirstPage"),
    firstHeaderText: $("#firstHeaderText"),
    firstFooterText: $("#firstFooterText"),
    toggleButton: $("#screenplayToggleButton"),
    settingsButton: $("#screenplaySettingsButton"),
    titlePageButton: $("#screenplayTitlePageButton"),
    elementSelect: $("#screenplayElementSelect"),
    pagePresetSelect: $("#screenplayPagePreset"),
    sceneNumbersButton: $("#screenplaySceneNumbersButton"),
    previousSceneButton: $("#screenplayPreviousScene"),
    nextSceneButton: $("#screenplayNextScene"),
    draftBadge: $("#screenplayDraftBadge"),
    draftBadgeText: $("#screenplayDraftBadgeText"),
    draftBadgeSwatch: $("#screenplayDraftBadgeSwatch"),
    sidebarSection: $("#screenplaySidebarSection"),
    sidebarDraft: $("#screenplaySidebarDraft"),
    sidebarScenes: $("#screenplaySidebarScenes"),
    sidebarElement: $("#screenplaySidebarElement"),
    sidebarSettings: $("#screenplaySidebarSettings"),
    sidebarTitlePage: $("#screenplaySidebarTitlePage"),
    status: $("#screenplayStatus"),
    statusElement: $("#screenplayStatusElement"),
    statusScene: $("#screenplayStatusScene"),
    dialog: $("#screenplaySettingsDialog"),
    form: $("#screenplaySettingsForm"),
    dialogTitle: $("#screenplayTitle"),
    dialogAuthor: $("#screenplayAuthor"),
    dialogDraftName: $("#screenplayDraftName"),
    dialogDraftDate: $("#screenplayDraftDate"),
    dialogRevision: $("#screenplayRevision"),
    dialogPagePreset: $("#screenplayDialogPagePreset"),
    dialogContact: $("#screenplayContact"),
    dialogCopyright: $("#screenplayCopyright"),
    dialogSceneNumbers: $("#screenplayDialogSceneNumbers"),
    insertTitlePage: $("#screenplayInsertTitlePage"),
    suggestionPopup: $("#screenplayCharacterSuggestions")
  };

  if (!elements.toggleButton || !elements.elementSelect) {
    console.warn("A interface do modo roteiro não foi encontrada.");
    return;
  }

  let state = { ...DEFAULT_SCREENPLAY };
  let lastEditorRange = null;
  let lastEditorRoot = null;
  let currentCharacterBlock = null;
  let suggestionItems = [];
  let suggestionIndex = 0;
  let numberingTimer = null;
  let layoutRepairing = false;
  let internalMutation = false;

  function safeParse(value, fallback) {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function currentDocumentId() {
    return new URLSearchParams(location.search).get("id");
  }

  function loadDocuments() {
    const managed = window.AteroWriteData?.getDocumentsSync?.();
    if (Array.isArray(managed)) return managed;
    const documents = safeParse(localStorage.getItem(DOCUMENTS_KEY), []);
    return Array.isArray(documents) ? documents : [];
  }

  function loadScreenplaySettings() {
    const record = loadDocuments().find(item => item.id === currentDocumentId());
    return {
      ...DEFAULT_SCREENPLAY,
      ...(record?.screenplaySettings || {})
    };
  }

  function persistScreenplaySettings() {
    const documentId = currentDocumentId();
    if (window.AteroWriteData && !window.AteroWriteData.canWrite(documentId)) {
      document.dispatchEvent(new CustomEvent("atero:lock-conflict", { detail: { documentId } }));
      return;
    }
    const documents = loadDocuments();
    const index = documents.findIndex(item => item.id === documentId);

    if (index >= 0) {
      documents[index] = {
        ...documents[index],
        schemaVersion: window.AteroWriteData?.schemaVersion || 2,
        type: state.enabled ? "screenplay" : "document",
        screenplaySettings: { ...state },
        updatedAt: new Date().toISOString(),
        revision: Number(documents[index].revision || 0) + 1
      };
      try { localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents)); } catch { /* IndexedDB é o armazenamento principal. */ }
      window.AteroWriteData?.saveDocuments?.(documents).catch(error => {
        console.warn("Não foi possível salvar configurações do roteiro no IndexedDB:", error);
      });
    }

    document.dispatchEvent(new CustomEvent("atero:screenplay-settings", {
      detail: { ...state }
    }));
  }

  function editorRootFromNode(node) {
    const element = node?.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : node;

    return element?.closest?.(".page-body, #flowEditor, #splitEditor") || null;
  }

  function activeEditorRoot() {
    return editorRootFromNode(document.activeElement)
      || lastEditorRoot
      || $(".page-body")
      || elements.flowEditor
      || elements.splitEditor;
  }

  function visibleDocumentRoots() {
    if (elements.stage?.classList.contains("view-flow")) {
      return elements.flowEditor ? [elements.flowEditor] : [];
    }

    const pages = $$(".page-body");
    return pages.length ? pages : [elements.flowEditor].filter(Boolean);
  }

  function allDocumentRoots() {
    return [
      ...$$(".page-body"),
      elements.flowEditor,
      elements.splitEditor
    ].filter(Boolean);
  }

  function selectionInsideEditor(selection = window.getSelection()) {
    if (!selection || selection.rangeCount === 0) return false;
    return Boolean(editorRootFromNode(selection.getRangeAt(0).commonAncestorContainer));
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selectionInsideEditor(selection)) return;

    lastEditorRange = selection.getRangeAt(0).cloneRange();
    lastEditorRoot = editorRootFromNode(lastEditorRange.commonAncestorContainer);
    updateActiveElementUI();
  }

  function restoreSelection() {
    if (!lastEditorRange || !lastEditorRoot?.isConnected) {
      activeEditorRoot()?.focus({ preventScroll: true });
      return false;
    }

    try {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(lastEditorRange);
      lastEditorRoot.focus({ preventScroll: true });
      return true;
    } catch {
      activeEditorRoot()?.focus({ preventScroll: true });
      return false;
    }
  }

  function placeCaret(block, atEnd = false) {
    if (!block) return;

    block.closest(".page-body, #flowEditor, #splitEditor")?.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(!atEnd);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    lastEditorRange = range.cloneRange();
    lastEditorRoot = editorRootFromNode(block);
  }

  function topLevelBlock(root, node) {
    let element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!element || !root?.contains(element) || element === root) return null;

    if (element.closest("[data-screenplay-title-page='true']")) return null;

    while (element && element.parentElement !== root) {
      element = element.parentElement;
    }

    if (!element || element.parentElement !== root) return null;
    if (element.matches("table, figure, hr, .manual-page-break, .text-box, .auto-toc, .footnotes, [data-screenplay-title-page='true']")) return null;
    return element;
  }

  function selectedBlocks() {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];

    const range = selection.getRangeAt(0);
    const root = editorRootFromNode(range.commonAncestorContainer) || activeEditorRoot();
    if (!root) return [];

    const direct = [...root.children].filter(child => {
      if (child.matches("table, figure, hr, .manual-page-break, .text-box, .auto-toc, .footnotes, [data-screenplay-title-page='true']")) return false;
      try {
        return range.intersectsNode(child);
      } catch {
        return false;
      }
    });

    if (direct.length) return direct;

    const block = topLevelBlock(root, range.startContainer);
    return block ? [block] : [];
  }

  function typeOfBlock(block) {
    return block?.dataset?.screenplayType || "normal";
  }

  function clearScreenplayStyles(block) {
    block.classList.remove(...SCRIPT_CLASSES, "screenplay-active-element");
    delete block.dataset.screenplayType;
    delete block.dataset.screenplayLabel;
    delete block.dataset.screenplayPlaceholder;
    block.removeAttribute("spellcheck");

    [
      "font-family",
      "font-size",
      "line-height",
      "font-weight",
      "letter-spacing",
      "text-transform",
      "text-align",
      "text-indent",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "padding-left",
      "padding-right",
      "position"
    ].forEach(property => block.style.removeProperty(property));
  }

  function screenplayInlineStyles(type) {
    const base = {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: "12pt",
      lineHeight: "1.05",
      fontWeight: "400",
      letterSpacing: "0px",
      textAlign: "left",
      textIndent: "0px",
      marginTop: "0pt",
      marginRight: "0in",
      marginBottom: "12pt",
      marginLeft: "0in"
    };

    const styles = {
      action: {},
      scene: {
        marginTop: "12pt",
        marginBottom: "6pt",
        fontWeight: "700",
        letterSpacing: "0.01em"
      },
      character: {
        marginTop: "12pt",
        marginRight: "1.15in",
        marginBottom: "0pt",
        marginLeft: "2.2in"
      },
      parenthetical: {
        marginRight: "1.65in",
        marginBottom: "0pt",
        marginLeft: "1.55in"
      },
      dialogue: {
        marginRight: "1.45in",
        marginBottom: "12pt",
        marginLeft: "0.95in"
      },
      transition: {
        marginTop: "12pt",
        marginRight: "0in",
        marginLeft: "3.35in",
        textAlign: "right"
      },
      shot: {
        marginTop: "12pt",
        marginBottom: "6pt",
        fontWeight: "700"
      },
      centered: {
        marginTop: "12pt",
        marginBottom: "12pt",
        textAlign: "center"
      }
    };

    return { ...base, ...(styles[type] || {}) };
  }

  function uppercaseTextNodes(block) {
    if (!block || !UPPERCASE_TYPES.has(typeOfBlock(block))) return;

    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement?.closest("[contenteditable='false']")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(textNode => {
      textNode.nodeValue = textNode.nodeValue.toLocaleUpperCase("pt-BR");
    });
  }

  function normalizeParenthetical(block) {
    if (typeOfBlock(block) !== "parenthetical") return;
    const text = (block.textContent || "").trim();
    if (!text) return;
    const normalized = text.startsWith("(") && text.endsWith(")")
      ? text
      : `(${text.replace(/^\(|\)$/g, "")})`;
    if (block.textContent !== normalized) block.textContent = normalized;
  }

  function ensureCaretSpace(block) {
    if (!block) return;
    if (!block.textContent && !block.querySelector("br")) {
      block.append(document.createElement("br"));
    }
  }

  function applyTypeToBlock(block, type) {
    if (!block) return;

    clearScreenplayStyles(block);
    if (type === "normal") {
      block.classList.add("screenplay-normal");
      block.dataset.screenplayType = "normal";
      block.dataset.screenplayLabel = TYPE_LABELS.normal;
      block.dataset.screenplayPlaceholder = TYPE_PLACEHOLDERS.normal;
      ensureCaretSpace(block);
      return;
    }

    const className = type === "scene"
      ? "screenplay-scene-heading"
      : `screenplay-${type}`;

    block.classList.add("screenplay-element", className);
    block.dataset.screenplayType = type;
    block.dataset.screenplayLabel = TYPE_LABELS[type];
    block.dataset.screenplayPlaceholder = TYPE_PLACEHOLDERS[type];
    block.spellcheck = type !== "character" && type !== "scene";
    Object.assign(block.style, screenplayInlineStyles(type));

    if (UPPERCASE_TYPES.has(type)) uppercaseTextNodes(block);
    if (type === "parenthetical") normalizeParenthetical(block);
    ensureCaretSpace(block);
  }

  function emitEditorMutation(root = activeEditorRoot()) {
    if (!root) return;
    internalMutation = true;
    root.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "formatBlock",
      data: null
    }));
    internalMutation = false;
    scheduleSceneRefresh();
  }

  function applyType(type, blocks = null, { focus = true } = {}) {
    if (!state.enabled && type !== "normal") enableScreenplayMode();
    restoreSelection();

    const targets = blocks || selectedBlocks();
    if (!targets.length) {
      const root = activeEditorRoot();
      if (!root) return;
      const paragraph = document.createElement("p");
      paragraph.append(document.createElement("br"));
      root.append(paragraph);
      targets.push(paragraph);
    }

    targets.forEach(block => applyTypeToBlock(block, type));
    const root = editorRootFromNode(targets[0]) || activeEditorRoot();
    emitEditorMutation(root);

    elements.elementSelect.value = type;
    if (focus) {
      placeCaret(targets.at(-1), true);
    }
    updateActiveElementUI();
  }

  function blockAtCurrentSelection() {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const root = editorRootFromNode(selection.anchorNode);
    return topLevelBlock(root, selection.anchorNode);
  }

  function createBlockAfter(block, type) {
    const paragraph = document.createElement("p");
    paragraph.append(document.createElement("br"));
    block.after(paragraph);
    applyTypeToBlock(paragraph, type);
    placeCaret(paragraph, false);
    return paragraph;
  }

  function isCaretAtEnd(block) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
    const range = selection.getRangeAt(0).cloneRange();
    const tail = document.createRange();
    tail.selectNodeContents(block);
    tail.setStart(range.endContainer, range.endOffset);
    return tail.toString().length === 0;
  }

  function cycleElement(backwards = false) {
    restoreSelection();
    const selection = window.getSelection();
    const block = blockAtCurrentSelection();
    if (!block) return;

    const currentType = typeOfBlock(block);
    const nextType = backwards
      ? TAB_PREVIOUS[currentType] || "action"
      : TAB_NEXT[currentType] || "action";

    const hasText = Boolean((block.textContent || "").trim());
    const hasSelection = selection && !selection.isCollapsed;

    if (!backwards && hasText && !hasSelection && isCaretAtEnd(block)) {
      const newBlock = createBlockAfter(block, nextType);
      emitEditorMutation(editorRootFromNode(newBlock));
    } else {
      applyType(nextType, [block]);
    }
  }

  function smartEnter(root) {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const block = topLevelBlock(root, selection.anchorNode);
    if (!block) {
      document.execCommand("insertParagraph", false, null);
      return;
    }

    const currentType = typeOfBlock(block);
    if (currentType === "normal") {
      document.execCommand("insertParagraph", false, null);
      return;
    }

    const nextType = ENTER_NEXT[currentType] || "action";
    const wasEmpty = !(block.textContent || "").trim();

    uppercaseTextNodes(block);
    normalizeParenthetical(block);

    if (wasEmpty) {
      applyTypeToBlock(block, nextType);
      placeCaret(block, false);
      emitEditorMutation(root);
      return;
    }

    document.execCommand("insertParagraph", false, null);
    const liveSelection = window.getSelection();
    const nextBlock = topLevelBlock(root, liveSelection?.anchorNode);

    if (nextBlock) {
      applyTypeToBlock(nextBlock, nextType);
      placeCaret(nextBlock, false);
    }

    emitEditorMutation(root);
  }

  function insertSceneToken(token, mode = "prefix") {
    if (!state.enabled) enableScreenplayMode();
    restoreSelection();
    let block = blockAtCurrentSelection();

    if (!block) return;
    if (typeOfBlock(block) !== "scene") applyTypeToBlock(block, "scene");

    const current = (block.textContent || "").replace(/\u00a0/g, " ").trim();
    let next;

    if (mode === "suffix") {
      next = current
        ? `${current.replace(/\s[-—]\s(?:DIA|NOITE|AMANHECER|ENTARDECER)$/i, "")} — ${token}`
        : `INT. LOCAL — ${token}`;
    } else {
      const stripped = current.replace(/^(INT\.?\/EXT\.?|INT\.?|EXT\.?|I\.?\/E\.?)\s*/i, "");
      next = `${token}${stripped ? ` ${stripped}` : " "}`;
    }

    block.textContent = next.toLocaleUpperCase("pt-BR");
    applyTypeToBlock(block, "scene");
    placeCaret(block, true);
    emitEditorMutation(editorRootFromNode(block));
  }

  function insertCharacterModifier(modifier) {
    if (!state.enabled) enableScreenplayMode();
    restoreSelection();
    const block = blockAtCurrentSelection();
    if (!block) return;

    if (typeOfBlock(block) !== "character") applyTypeToBlock(block, "character");
    const current = (block.textContent || "").trim().replace(new RegExp(`\\s*\\(${modifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)$`, "i"), "");
    block.textContent = `${current}${current ? " " : ""}(${modifier})`.toLocaleUpperCase("pt-BR");
    placeCaret(block, true);
    emitEditorMutation(editorRootFromNode(block));
  }

  function configurePagePreset(preset) {
    if (!elements.pageSetupForm) return;

    const isLetter = preset === "Letter";
    elements.pagePreset.value = isLetter ? "Letter" : "A4";
    elements.pageOrientation.value = "portrait";
    elements.customPageWidth.value = isLetter ? "816" : "794";
    elements.customPageHeight.value = isLetter ? "1056" : "1123";
    elements.pageColor.value = "#ffffff";
    elements.marginPreset.value = "custom";
    elements.setupMarginTop.value = "96";
    elements.setupMarginRight.value = "96";
    elements.setupMarginBottom.value = "96";
    elements.setupMarginLeft.value = "144";
    elements.pageSetupForm.dispatchEvent(new Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  }

  function configureScreenplayHeaderFooter(hasTitlePage = false) {
    if (!elements.headerFooterForm) return;
    elements.headerText.value = "";
    elements.footerText.value = "";
    elements.showPageNumbers.checked = true;
    elements.pageNumberPosition.value = "header-right";
    elements.differentFirstPage.checked = hasTitlePage;
    elements.firstHeaderText.value = "";
    elements.firstFooterText.value = "";
    elements.headerFooterForm.dispatchEvent(new Event("submit", {
      bubbles: true,
      cancelable: true
    }));
  }

  function ensureInitialScreenplayBlock() {
    restoreSelection();
    const root = activeEditorRoot();
    if (!root) return;
    let block = blockAtCurrentSelection();

    if (!block) {
      block = [...root.children].find(child => !child.matches("[data-screenplay-title-page='true'], .manual-page-break"));
    }

    if (!block) {
      block = document.createElement("p");
      block.append(document.createElement("br"));
      root.append(block);
    }

    if (!block.dataset.screenplayType) {
      applyTypeToBlock(block, "action");
      emitEditorMutation(root);
    }
  }

  function enableScreenplayMode() {
    state.enabled = true;

    if (!state.pageConfigured) {
      configurePagePreset(state.pagePreset);
      configureScreenplayHeaderFooter(Boolean($("[data-screenplay-title-page='true']")));
      state.pageConfigured = true;
    }

    persistScreenplaySettings();
    applyModeUI();
    ensureInitialScreenplayBlock();
  }

  function toggleScreenplayMode() {
    state.enabled = !state.enabled;
    persistScreenplaySettings();
    applyModeUI();
    if (state.enabled) ensureInitialScreenplayBlock();
  }

  function revisionLabel(value) {
    return {
      white: "Páginas brancas",
      blue: "Revisão azul",
      pink: "Revisão rosa",
      yellow: "Revisão amarela",
      green: "Revisão verde",
      goldenrod: "Revisão goldenrod",
      buff: "Revisão buff",
      salmon: "Revisão salmão",
      cherry: "Revisão cherry",
      tan: "Revisão tan",
      gray: "Revisão cinza",
      ivory: "Revisão marfim"
    }[value] || "Páginas brancas";
  }

  function formattedDraftDate() {
    if (!state.draftDate) return "";
    const date = new Date(`${state.draftDate}T12:00:00`);
    return Number.isNaN(date.getTime()) ? state.draftDate : date.toLocaleDateString("pt-BR");
  }

  function applyModeUI() {
    elements.body.classList.toggle("screenplay-mode", state.enabled);
    elements.body.style.setProperty("--screenplay-revision-color", REVISION_COLORS[state.revision] || "#ffffff");

    elements.toggleButton.classList.toggle("is-active", state.enabled);
    elements.toggleButton.setAttribute("aria-pressed", String(state.enabled));
    const toggleLabel = elements.toggleButton.querySelector("span");
    if (toggleLabel) toggleLabel.textContent = state.enabled ? "Roteiro ativo" : "Ativar roteiro";

    elements.sceneNumbersButton?.classList.toggle("is-active", state.sceneNumbers);
    elements.sceneNumbersButton?.setAttribute("aria-pressed", String(state.sceneNumbers));
    elements.pagePresetSelect.value = state.pagePreset;

    elements.draftBadge.hidden = !state.enabled;
    elements.sidebarSection.hidden = !state.enabled;
    elements.status.hidden = !state.enabled;

    const draftText = [state.draftName, formattedDraftDate()].filter(Boolean).join(" · ");
    elements.draftBadgeText.textContent = draftText || "Roteiro";
    elements.draftBadgeSwatch.style.background = REVISION_COLORS[state.revision] || "#ffffff";
    elements.draftBadge.title = `${revisionLabel(state.revision)} — abrir configurações`;
    elements.sidebarDraft.textContent = draftText || "Não definido";

    scheduleSceneRefresh();
  }

  function populateSettingsDialog() {
    elements.dialogTitle.value = state.title || elements.title?.value || "";
    elements.dialogAuthor.value = state.author;
    elements.dialogDraftName.value = state.draftName;
    elements.dialogDraftDate.value = state.draftDate;
    elements.dialogRevision.value = state.revision;
    elements.dialogPagePreset.value = state.pagePreset;
    elements.dialogContact.value = state.contact;
    elements.dialogCopyright.value = state.copyright;
    elements.dialogSceneNumbers.checked = state.sceneNumbers;
  }

  function openSettingsDialog() {
    populateSettingsDialog();
    elements.dialog.showModal();
    requestAnimationFrame(() => elements.dialogTitle.focus());
  }

  function readSettingsDialog() {
    state = {
      ...state,
      title: elements.dialogTitle.value.trim(),
      author: elements.dialogAuthor.value.trim(),
      draftName: elements.dialogDraftName.value.trim() || "Rascunho",
      draftDate: elements.dialogDraftDate.value,
      revision: elements.dialogRevision.value,
      pagePreset: elements.dialogPagePreset.value === "A4" ? "A4" : "Letter",
      contact: elements.dialogContact.value.trim(),
      copyright: elements.dialogCopyright.value.trim(),
      sceneNumbers: elements.dialogSceneNumbers.checked
    };
  }

  function titlePageHTML() {
    const title = state.title || elements.title?.value || "ROTEIRO SEM TÍTULO";
    const author = state.author || "Autor não informado";
    const draft = [state.draftName, formattedDraftDate()].filter(Boolean).join(" · ");
    const copyright = state.copyright || `© ${new Date().getFullYear()} ${author}`;
    const contact = state.contact
      ? state.contact.split(/\r?\n/).map(line => `<div>${escapeHTML(line)}</div>`).join("")
      : "";

    return `
      <section class="screenplay-title-page" data-screenplay-title-page="true" contenteditable="false" aria-label="Capa do roteiro" style="position:relative;display:flex;flex-direction:column;min-height:calc(var(--editor-page-height,1056px) - var(--editor-margin-top,96px) - var(--editor-margin-bottom,96px) - 8px);font-family:'Courier New',Courier,monospace;font-size:12pt;line-height:1.2">
        <div class="screenplay-title-main" style="margin:auto 0;text-align:center">
          <div class="screenplay-title-name" style="font-size:18pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${escapeHTML(title)}</div>
          <div class="screenplay-title-credit" style="margin-top:26pt">Escrito por</div>
          <div class="screenplay-title-author" style="margin-top:8pt;font-weight:700">${escapeHTML(author)}</div>
        </div>
        <div class="screenplay-title-draft" style="position:absolute;top:0;right:0;text-align:right;font-size:10pt">
          <strong>${escapeHTML(draft || "Rascunho")}</strong><br>
          <span>${escapeHTML(revisionLabel(state.revision))}</span>
        </div>
        <div class="screenplay-title-contact" style="position:absolute;bottom:0;left:0;max-width:48%;font-size:10pt">${contact}</div>
        <div class="screenplay-title-copyright" style="position:absolute;right:0;bottom:0;max-width:48%;text-align:right;font-size:10pt">${escapeHTML(copyright)}</div>
      </section>`;
  }

  function insertOrUpdateTitlePage() {
    if (!state.enabled) enableScreenplayMode();
    readSettingsDialog();
    persistScreenplaySettings();
    applyModeUI();

    restoreSelection();
    const roots = visibleDocumentRoots();
    const firstRoot = roots[0] || activeEditorRoot();
    if (!firstRoot) return;

    const existing = allDocumentRoots()
      .flatMap(root => [...root.querySelectorAll("[data-screenplay-title-page='true']")])
      .find(Boolean);

    const template = document.createElement("template");
    template.innerHTML = titlePageHTML().trim();
    const newTitlePage = template.content.firstElementChild;

    if (existing) {
      existing.replaceWith(newTitlePage);
    } else {
      const firstEmpty = firstRoot.firstElementChild;
      if (firstEmpty && !firstEmpty.textContent.trim() && firstRoot.children.length === 1) {
        firstEmpty.remove();
      }

      const pageBreak = document.createElement("div");
      pageBreak.className = "manual-page-break screenplay-title-page-break";
      pageBreak.contentEditable = "false";
      pageBreak.dataset.pageBreak = "true";

      const firstScene = document.createElement("p");
      firstScene.append(document.createElement("br"));
      applyTypeToBlock(firstScene, "scene");

      firstRoot.prepend(newTitlePage, pageBreak, firstScene);
    }

    configureScreenplayHeaderFooter(true);
    emitEditorMutation(firstRoot);
    if (elements.dialog.open) elements.dialog.close();
    requestAnimationFrame(() => {
      const firstScene = $$(".screenplay-scene-heading")[0];
      if (firstScene) placeCaret(firstScene, false);
    });
  }

  function screenplayBlocksFromRoots(roots = visibleDocumentRoots()) {
    return roots.flatMap(root => [...root.querySelectorAll("[data-screenplay-type]")]);
  }

  function sceneHeadingsFromRoots(roots = visibleDocumentRoots()) {
    return roots.flatMap(root => [...root.querySelectorAll(".screenplay-scene-heading")]);
  }

  function currentSceneNumber() {
    const current = blockAtCurrentSelection();
    if (!current) return null;
    const roots = visibleDocumentRoots();
    const allBlocks = roots.flatMap(root => [...root.children]);
    const index = allBlocks.indexOf(current);
    let scene = 0;

    for (let position = 0; position <= index; position += 1) {
      if (allBlocks[position]?.classList?.contains("screenplay-scene-heading")) scene += 1;
    }

    return scene || null;
  }

  function applySceneNumbersToRoots(roots) {
    let count = 0;
    roots.forEach(root => {
      [...root.querySelectorAll(".screenplay-scene-heading")].forEach(heading => {
        count += 1;
        if (state.sceneNumbers) {
          heading.dataset.sceneNumber = String(count);
        } else {
          delete heading.dataset.sceneNumber;
        }
      });
    });
    return count;
  }

  function repairOrphanCues() {
    if (layoutRepairing || !elements.stage?.classList.contains("view-pages")) return;
    layoutRepairing = true;

    try {
      const bodies = $$(".page-body");
      bodies.slice(0, -1).forEach((body, index) => {
        const nextBody = bodies[index + 1];
        const meaningful = [...body.children].filter(child => !child.matches(".manual-page-break"));
        const last = meaningful.at(-1);
        if (!last || !nextBody) return;

        const type = typeOfBlock(last);
        if (["scene", "character"].includes(type)) {
          nextBody.prepend(last);
        }
      });
    } finally {
      layoutRepairing = false;
    }
  }

  function applyDialogueContinuations() {
    const blocks = screenplayBlocksFromRoots();
    let lastCharacter = "";

    blocks.forEach(block => {
      delete block.dataset.screenplayMore;
      delete block.dataset.continuedCharacter;

      const type = typeOfBlock(block);
      if (type === "character") {
        lastCharacter = (block.textContent || "").trim();
      }

      if (type === "dialogue" && block.dataset.splitContinuation === "end") {
        block.dataset.screenplayMore = "true";
      }

      if (type === "dialogue" && block.dataset.splitContinuation === "start" && lastCharacter) {
        block.dataset.continuedCharacter = `${lastCharacter.replace(/\s*\(CONT['’]?D\)$/i, "")} (CONT'D)`;
      }
    });
  }

  function refreshSceneData() {
    if (!state.enabled) return;

    repairOrphanCues();
    const pages = $$(".page-body");
    const count = pages.length
      ? applySceneNumbersToRoots(pages)
      : applySceneNumbersToRoots([elements.flowEditor].filter(Boolean));

    if (elements.flowEditor) applySceneNumbersToRoots([elements.flowEditor]);
    if (elements.splitEditor) applySceneNumbersToRoots([elements.splitEditor]);

    applyDialogueContinuations();
    elements.sidebarScenes.textContent = String(count);
    const current = currentSceneNumber();
    elements.statusScene.textContent = current ? `Cena ${current}` : `${count} ${count === 1 ? "cena" : "cenas"}`;
  }

  function scheduleSceneRefresh() {
    clearTimeout(numberingTimer);
    numberingTimer = setTimeout(refreshSceneData, 60);
  }

  function navigateScene(direction) {
    const scenes = sceneHeadingsFromRoots();
    if (!scenes.length) return;

    const current = blockAtCurrentSelection();
    let targetIndex;

    if (!current) {
      targetIndex = direction > 0 ? 0 : scenes.length - 1;
    } else {
      const currentIndex = scenes.findIndex(scene => {
        if (scene === current) return true;
        return Boolean(scene.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING);
      });

      if (direction > 0) {
        targetIndex = currentIndex < 0
          ? 0
          : Math.min(scenes.length - 1, currentIndex + (scenes[currentIndex] === current ? 1 : 0));
      } else {
        const direct = scenes.indexOf(current);
        targetIndex = direct > 0 ? direct - 1 : Math.max(0, currentIndex - 1);
      }
    }

    const target = scenes[targetIndex] || scenes[0];
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    placeCaret(target, true);
    updateActiveElementUI();
  }

  function collectCharacterNames() {
    const names = new Set();
    screenplayBlocksFromRoots().forEach(block => {
      if (typeOfBlock(block) !== "character" || block === currentCharacterBlock) return;
      const name = (block.textContent || "")
        .replace(/\s*\([^)]*\)\s*$/g, "")
        .trim()
        .toLocaleUpperCase("pt-BR");
      if (name) names.add(name);
    });
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function hideCharacterSuggestions() {
    elements.suggestionPopup.hidden = true;
    elements.suggestionPopup.replaceChildren();
    currentCharacterBlock = null;
    suggestionItems = [];
    suggestionIndex = 0;
  }

  function renderCharacterSuggestions(block) {
    if (!state.enabled || typeOfBlock(block) !== "character") {
      hideCharacterSuggestions();
      return;
    }

    const typed = (block.textContent || "")
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .trim()
      .toLocaleUpperCase("pt-BR");

    if (!typed) {
      hideCharacterSuggestions();
      return;
    }

    const matches = collectCharacterNames()
      .filter(name => name.includes(typed) && name !== typed)
      .slice(0, 6);

    if (!matches.length) {
      hideCharacterSuggestions();
      return;
    }

    currentCharacterBlock = block;
    suggestionItems = matches;
    suggestionIndex = 0;
    elements.suggestionPopup.replaceChildren();

    matches.forEach((name, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = name;
      button.classList.toggle("is-active", index === suggestionIndex);
      button.addEventListener("pointerdown", event => event.preventDefault());
      button.addEventListener("click", () => chooseCharacterSuggestion(index));
      elements.suggestionPopup.append(button);
    });

    const rect = block.getBoundingClientRect();
    elements.suggestionPopup.hidden = false;
    elements.suggestionPopup.style.left = `${Math.max(8, Math.min(innerWidth - 230, rect.left))}px`;
    elements.suggestionPopup.style.top = `${Math.max(8, Math.min(innerHeight - 220, rect.bottom + 6))}px`;
  }

  function updateSuggestionHighlight() {
    [...elements.suggestionPopup.children].forEach((button, index) => {
      button.classList.toggle("is-active", index === suggestionIndex);
    });
  }

  function chooseCharacterSuggestion(index = suggestionIndex) {
    const name = suggestionItems[index];
    const block = currentCharacterBlock;
    if (!name || !block) return;

    block.textContent = name;
    applyTypeToBlock(block, "character");
    placeCaret(block, true);
    emitEditorMutation(editorRootFromNode(block));
    hideCharacterSuggestions();
  }

  function normalizeLeavingBlock(block) {
    if (!block) return;
    const type = typeOfBlock(block);
    if (UPPERCASE_TYPES.has(type)) uppercaseTextNodes(block);
    if (type === "parenthetical") normalizeParenthetical(block);
  }

  function updateActiveElementUI() {
    $$(".screenplay-active-element").forEach(block => block.classList.remove("screenplay-active-element"));
    const block = blockAtCurrentSelectionWithoutRestore();
    const type = typeOfBlock(block);

    elements.elementSelect.value = type;
    elements.sidebarElement.textContent = TYPE_LABELS[type] || TYPE_LABELS.normal;
    elements.statusElement.textContent = TYPE_LABELS[type] || TYPE_LABELS.normal;
  }

  function blockAtCurrentSelectionWithoutRestore() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const root = editorRootFromNode(selection.anchorNode);
    return topLevelBlock(root, selection.anchorNode);
  }

  function toggleSceneNumbers() {
    state.sceneNumbers = !state.sceneNumbers;
    persistScreenplaySettings();
    applyModeUI();
  }

  function saveDialogSettings({ insertTitlePage = false } = {}) {
    const previousPreset = state.pagePreset;
    readSettingsDialog();
    if (!state.enabled) state.enabled = true;

    const presetChanged = previousPreset !== state.pagePreset;
    persistScreenplaySettings();
    applyModeUI();

    if (presetChanged || !state.pageConfigured) {
      configurePagePreset(state.pagePreset);
      state.pageConfigured = true;
      persistScreenplaySettings();
    }

    if (insertTitlePage) {
      insertOrUpdateTitlePage();
    } else if (elements.dialog.open) {
      elements.dialog.close();
    }
  }

  function addScreenplayContextMenuItems() {
    const menu = $("#contextMenu");
    if (!menu || menu.querySelector("[data-screenplay-context]")) return;

    const separator = document.createElement("hr");
    separator.dataset.screenplayContext = "true";
    const types = ["scene", "action", "character", "parenthetical", "dialogue", "transition"];
    menu.append(separator);

    types.forEach(type => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.screenplayContext = type;
      button.textContent = TYPE_LABELS[type];
      menu.append(button);
    });

    menu.addEventListener("click", event => {
      const button = event.target.closest("button[data-screenplay-context]");
      if (!button) return;
      menu.hidden = true;
      applyType(button.dataset.screenplayContext);
    });
  }

  function handleCapturedKeydown(event) {
    if (!state.enabled) return;
    const root = editorRootFromNode(event.target);
    if (!root || event.target.closest("[data-screenplay-title-page='true']")) return;

    if (!elements.suggestionPopup.hidden) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopImmediatePropagation();
        suggestionIndex = (suggestionIndex + 1) % suggestionItems.length;
        updateSuggestionHighlight();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        suggestionIndex = (suggestionIndex - 1 + suggestionItems.length) % suggestionItems.length;
        updateSuggestionHighlight();
        return;
      }

      if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        chooseCharacterSuggestion();
        return;
      }
    }

    if (event.key === "Tab") {
      event.preventDefault();
      event.stopImmediatePropagation();
      cycleElement(event.shiftKey);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
      smartEnter(root);
      return;
    }

    const modifier = (event.ctrlKey || event.metaKey) && event.altKey;
    if (modifier && /^[1-8]$/.test(event.key)) {
      const types = ["scene", "action", "character", "dialogue", "parenthetical", "transition", "shot", "centered"];
      event.preventDefault();
      event.stopImmediatePropagation();
      applyType(types[Number(event.key) - 1]);
    }
  }

  function handleEditorInput(event) {
    if (!state.enabled || internalMutation) return;
    const root = editorRootFromNode(event.target);
    if (!root) return;

    const block = topLevelBlock(root, window.getSelection()?.anchorNode);
    if (typeOfBlock(block) === "character") {
      renderCharacterSuggestions(block);
    } else {
      hideCharacterSuggestions();
    }

    scheduleSceneRefresh();
  }

  function handleFocusOut(event) {
    const block = topLevelBlock(editorRootFromNode(event.target), event.target);
    if (!block) return;
    const before = block.innerHTML;
    normalizeLeavingBlock(block);

    if (block.innerHTML !== before) {
      emitEditorMutation(editorRootFromNode(block));
    }

    setTimeout(() => {
      if (!elements.suggestionPopup.matches(":hover")) hideCharacterSuggestions();
    }, 100);
  }

  function registerEvents() {
    elements.toggleButton.addEventListener("click", toggleScreenplayMode);
    elements.settingsButton.addEventListener("click", openSettingsDialog);
    elements.draftBadge.addEventListener("click", openSettingsDialog);
    elements.sidebarSettings.addEventListener("click", openSettingsDialog);
    elements.titlePageButton.addEventListener("click", openSettingsDialog);
    elements.sidebarTitlePage.addEventListener("click", openSettingsDialog);

    elements.elementSelect.addEventListener("change", () => {
      applyType(elements.elementSelect.value);
    });

    $$('[data-screenplay-element]').forEach(button => {
      button.addEventListener("pointerdown", event => event.preventDefault());
      button.addEventListener("click", () => applyType(button.dataset.screenplayElement));
    });

    $$('[data-screenplay-scene-prefix]').forEach(button => {
      button.addEventListener("pointerdown", event => event.preventDefault());
      button.addEventListener("click", () => insertSceneToken(button.dataset.screenplayScenePrefix, "prefix"));
    });

    $$('[data-screenplay-scene-time]').forEach(button => {
      button.addEventListener("pointerdown", event => event.preventDefault());
      button.addEventListener("click", () => insertSceneToken(button.dataset.screenplaySceneTime, "suffix"));
    });

    $$('[data-screenplay-character-modifier]').forEach(button => {
      button.addEventListener("pointerdown", event => event.preventDefault());
      button.addEventListener("click", () => insertCharacterModifier(button.dataset.screenplayCharacterModifier));
    });

    elements.sceneNumbersButton.addEventListener("click", toggleSceneNumbers);
    elements.previousSceneButton.addEventListener("click", () => navigateScene(-1));
    elements.nextSceneButton.addEventListener("click", () => navigateScene(1));

    elements.pagePresetSelect.addEventListener("change", () => {
      state.pagePreset = elements.pagePresetSelect.value === "A4" ? "A4" : "Letter";
      state.pageConfigured = true;
      persistScreenplaySettings();
      configurePagePreset(state.pagePreset);
    });

    elements.form.addEventListener("submit", event => {
      event.preventDefault();
      saveDialogSettings({ insertTitlePage: false });
    });

    elements.insertTitlePage.addEventListener("click", () => {
      saveDialogSettings({ insertTitlePage: true });
    });

    $$('[data-close-dialog="screenplaySettingsDialog"]').forEach(button => {
      button.addEventListener("click", () => elements.dialog.close());
    });

    elements.dialog.addEventListener("click", event => {
      if (event.target === elements.dialog) elements.dialog.close();
    });

    document.addEventListener("selectionchange", rememberSelection);
    document.addEventListener("keydown", handleCapturedKeydown, true);
    document.addEventListener("input", handleEditorInput, true);
    document.addEventListener("focusout", handleFocusOut, true);

    document.addEventListener("click", event => {
      if (!event.target.closest("#screenplayCharacterSuggestions")) {
        const block = event.target.closest?.(".screenplay-character");
        if (!block) hideCharacterSuggestions();
      }
    });

    window.addEventListener("resize", () => {
      if (currentCharacterBlock) renderCharacterSuggestions(currentCharacterBlock);
    });

    const observer = new MutationObserver(mutations => {
      if (layoutRepairing) return;
      if (mutations.some(mutation => mutation.type === "childList")) scheduleSceneRefresh();
    });

    [elements.pagesContainer, elements.flowEditor, elements.splitEditor].filter(Boolean).forEach(root => {
      observer.observe(root, { childList: true, subtree: true });
    });
  }

  async function initialize() {
    if (window.AteroWriteData?.ready) {
      await window.AteroWriteData.ready;
    }

    state = loadScreenplaySettings();
    addScreenplayContextMenuItems();
    registerEvents();
    applyModeUI();

    if (state.enabled) {
      setTimeout(() => {
        ensureInitialScreenplayBlock();
        scheduleSceneRefresh();
      }, 0);
    }
  }

  window.AteroWriteScreenplay = {
    getSettings: () => ({ ...state }),
    setSettings: (nextSettings = {}, options = {}) => {
      state = { ...DEFAULT_SCREENPLAY, ...nextSettings };
      applyModeUI();
      if (state.enabled && state.pageConfigured) configurePagePreset(state.pagePreset);
      scheduleSceneRefresh();
      if (options.persist !== false) persistScreenplaySettings();
      return { ...state };
    },
    enable: enableScreenplayMode,
    toggle: toggleScreenplayMode,
    applyType,
    insertOrUpdateTitlePage,
    refreshSceneData
  };

  initialize().catch(error => console.error("Falha ao iniciar o modo roteiro:", error));
})();
