"use strict";

(() => {
  const Core = window.AteroWriteCore;
  if (!Core) throw new Error("editor-data-core.js precisa ser carregado antes de project-data.js.");

  const DB_NAME = "atero_write_database";
  const DB_VERSION = 2;
  const STORES = {
    projects: "projects",
    characters: "characters",
    locations: "locations",
    timeline: "timelineEvents",
    notes: "projectNotes"
  };
  const LEGACY = {
    projects: "atero_write_projects",
    characters: "atero_write_characters",
    locations: "atero_write_locations",
    timeline: "atero_write_timeline_events",
    notes: "atero_write_project_notes"
  };

  const cache = {
    projects: [],
    characters: [],
    locations: [],
    timeline: [],
    notes: []
  };

  let db = null;
  let fallbackMode = false;

  function clone(value, fallback = null) {
    return Core.clone(value, fallback);
  }

  function createId(prefix) {
    return Core.createId(prefix);
  }

  function safeDate(value, fallback = new Date().toISOString()) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
  }

  function cleanText(value, max = 5000) {
    return String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);
  }

  function cleanName(value, fallback = "Sem nome") {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120) || fallback;
  }

  function modelFromType(type) {
    const value = String(type || "Vazio").toLocaleLowerCase("pt-BR");
    if (["livro", "coletânea", "diário"].includes(value)) return "livro";
    if (value === "roteiro") return "roteiro";
    if (["artigo", "pesquisa", "ensaio", "trabalho acadêmico", "documentação"].includes(value)) return "artigo";
    return "vazio";
  }

  function normalizeProject(input = {}, options = {}) {
    const now = new Date().toISOString();
    const source = input && typeof input === "object" ? input : {};
    const preserveId = options.preserveId !== false;
    const type = cleanName(source.type, "Vazio");
    return {
      schemaVersion: 2,
      id: preserveId && typeof source.id === "string" && source.id.trim()
        ? source.id.trim()
        : createId("project"),
      name: cleanName(source.name, "Projeto sem título"),
      type,
      model: typeof source.model === "string" && source.model.trim()
        ? source.model.trim()
        : modelFromType(type),
      description: cleanText(source.description, 2000),
      status: ["active", "paused", "completed", "archived"].includes(source.status)
        ? source.status
        : "active",
      createdAt: safeDate(source.createdAt, now),
      updatedAt: safeDate(source.updatedAt, source.createdAt ? safeDate(source.createdAt, now) : now),
      settings: source.settings && typeof source.settings === "object" && !Array.isArray(source.settings)
        ? clone(source.settings, {})
        : {},
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? clone(source.metadata, {})
        : {}
    };
  }

  function normalizeCharacter(input = {}, options = {}) {
    const now = new Date().toISOString();
    const source = input && typeof input === "object" ? input : {};
    return {
      id: options.preserveId !== false && source.id ? String(source.id) : createId("character"),
      projectId: String(source.projectId || "").trim(),
      name: cleanName(source.name, "Personagem sem nome"),
      role: cleanName(source.role, ""),
      age: cleanName(source.age, ""),
      pronouns: cleanName(source.pronouns, ""),
      description: cleanText(source.description, 6000),
      notes: cleanText(source.notes, 10000),
      status: cleanName(source.status, "Ativo"),
      color: /^#[0-9a-f]{6}$/i.test(source.color || "") ? source.color : "#e63946",
      createdAt: safeDate(source.createdAt, now),
      updatedAt: safeDate(source.updatedAt, now),
      metadata: source.metadata && typeof source.metadata === "object" ? clone(source.metadata, {}) : {}
    };
  }

  function normalizeLocation(input = {}, options = {}) {
    const now = new Date().toISOString();
    const source = input && typeof input === "object" ? input : {};
    return {
      id: options.preserveId !== false && source.id ? String(source.id) : createId("location"),
      projectId: String(source.projectId || "").trim(),
      name: cleanName(source.name, "Lugar sem nome"),
      kind: cleanName(source.kind, "Lugar"),
      description: cleanText(source.description, 8000),
      atmosphere: cleanText(source.atmosphere, 3000),
      importance: cleanName(source.importance, "Secundário"),
      createdAt: safeDate(source.createdAt, now),
      updatedAt: safeDate(source.updatedAt, now),
      metadata: source.metadata && typeof source.metadata === "object" ? clone(source.metadata, {}) : {}
    };
  }

  function normalizeTimelineEvent(input = {}, options = {}) {
    const now = new Date().toISOString();
    const source = input && typeof input === "object" ? input : {};
    const sortDate = source.sortDate ? safeDate(source.sortDate, "") : "";
    return {
      id: options.preserveId !== false && source.id ? String(source.id) : createId("event"),
      projectId: String(source.projectId || "").trim(),
      title: cleanName(source.title, "Evento sem título"),
      dateLabel: cleanName(source.dateLabel, "Sem data definida"),
      sortDate,
      description: cleanText(source.description, 8000),
      locationId: source.locationId ? String(source.locationId) : null,
      order: Number.isFinite(Number(source.order)) ? Number(source.order) : Date.now(),
      createdAt: safeDate(source.createdAt, now),
      updatedAt: safeDate(source.updatedAt, now),
      metadata: source.metadata && typeof source.metadata === "object" ? clone(source.metadata, {}) : {}
    };
  }

  function normalizeNote(input = {}, options = {}) {
    const now = new Date().toISOString();
    const source = input && typeof input === "object" ? input : {};
    return {
      id: options.preserveId !== false && source.id ? String(source.id) : createId("note"),
      projectId: String(source.projectId || "").trim(),
      title: cleanName(source.title, "Nota sem título"),
      content: cleanText(source.content, 40000),
      pinned: Boolean(source.pinned),
      createdAt: safeDate(source.createdAt, now),
      updatedAt: safeDate(source.updatedAt, now),
      metadata: source.metadata && typeof source.metadata === "object" ? clone(source.metadata, {}) : {}
    };
  }

  const NORMALIZERS = {
    projects: normalizeProject,
    characters: normalizeCharacter,
    locations: normalizeLocation,
    timeline: normalizeTimelineEvent,
    notes: normalizeNote
  };

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha no IndexedDB."));
    });
  }

  function transactionComplete(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Falha na transação do IndexedDB."));
      transaction.onabort = () => reject(transaction.error || new Error("Transação cancelada."));
    });
  }

  function ensureStores(database) {
    Object.values(STORES).forEach(storeName => {
      if (!database.objectStoreNames.contains(storeName)) {
        const store = database.createObjectStore(storeName, { keyPath: "id" });
        if (storeName !== STORES.projects) {
          store.createIndex("projectId", "projectId", { unique: false });
        }
      }
    });
  }

  async function openDatabase() {
    if (!window.indexedDB) throw new Error("Este navegador não oferece IndexedDB.");
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => ensureStores(request.result);
    db = await requestPromise(request);
    db.onversionchange = () => db.close();
  }

  async function getAll(storeName) {
    const transaction = db.transaction(storeName, "readonly");
    return requestPromise(transaction.objectStore(storeName).getAll());
  }

  async function replaceStore(storeName, records) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.clear();
    records.forEach(record => store.put(record));
    await transactionComplete(transaction);
  }

  async function putRecord(storeName, record) {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);
    await transactionComplete(transaction);
  }

  async function deleteRecord(storeName, id) {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);
    await transactionComplete(transaction);
  }

  function readLegacy(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function mirror(kind) {
    try {
      localStorage.setItem(LEGACY[kind], JSON.stringify(cache[kind]));
    } catch {
      // O IndexedDB continua sendo a fonte principal.
    }
  }

  async function migrateLegacy() {
    for (const kind of Object.keys(STORES)) {
      const storeName = STORES[kind];
      const current = await getAll(storeName);
      if (current.length) continue;
      const legacy = readLegacy(LEGACY[kind]);
      if (!legacy.length) continue;
      const normalized = legacy.map(item => NORMALIZERS[kind](item, { preserveId: true }));
      await replaceStore(storeName, normalized);
    }
  }

  async function reconcileLegacy() {
    for (const kind of Object.keys(STORES)) {
      const legacy = readLegacy(LEGACY[kind]);
      if (!legacy.length) continue;
      const current = await getAll(STORES[kind]);
      const byId = new Map(current.map(item => [item.id, item]));
      let changed = false;
      legacy.forEach(raw => {
        const item = NORMALIZERS[kind](raw, { preserveId: true });
        const existing = byId.get(item.id);
        if (!existing) {
          byId.set(item.id, item);
          changed = true;
          return;
        }
        const incomingTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (incomingTime > existingTime) {
          byId.set(item.id, item);
          changed = true;
        }
      });
      if (changed) await replaceStore(STORES[kind], [...byId.values()]);
    }
  }

  async function hydrate() {
    for (const kind of Object.keys(STORES)) {
      const records = await getAll(STORES[kind]);
      cache[kind] = records.map(item => NORMALIZERS[kind](item, { preserveId: true }));
      mirror(kind);
    }
  }

  function emit(kind, action, record = null) {
    document.dispatchEvent(new CustomEvent("atero:project-data", {
      detail: { kind, action, record: clone(record, null) }
    }));
  }

  async function saveCollection(kind, records) {
    const normalized = records.map(item => NORMALIZERS[kind](item, { preserveId: true }));
    cache[kind] = normalized;
    mirror(kind);
    if (!db || fallbackMode) return clone(normalized, []);
    await replaceStore(STORES[kind], normalized);
    emit(kind, "replace");
    return clone(normalized, []);
  }

  async function saveOne(kind, record) {
    const normalized = NORMALIZERS[kind](record, { preserveId: true });
    const index = cache[kind].findIndex(item => item.id === normalized.id);
    if (index >= 0) cache[kind][index] = normalized;
    else cache[kind].push(normalized);
    mirror(kind);
    if (!db || fallbackMode) return clone(normalized, null);
    await putRecord(STORES[kind], normalized);
    emit(kind, "save", normalized);
    return clone(normalized, null);
  }

  async function deleteOne(kind, id) {
    cache[kind] = cache[kind].filter(item => item.id !== id);
    mirror(kind);
    if (db && !fallbackMode) await deleteRecord(STORES[kind], id);
    emit(kind, "delete", { id });
  }

  async function deleteProject(projectId) {
    await deleteOne("projects", projectId);
    for (const kind of ["characters", "locations", "timeline", "notes"]) {
      await saveCollection(kind, cache[kind].filter(item => item.projectId !== projectId));
    }
  }

  function getByProject(kind, projectId) {
    return clone(cache[kind].filter(item => item.projectId === projectId), []);
  }

  async function exportData() {
    return {
      format: "atero-write-project-data",
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: clone(cache.projects, []),
      characters: clone(cache.characters, []),
      locations: clone(cache.locations, []),
      timelineEvents: clone(cache.timeline, []),
      notes: clone(cache.notes, [])
    };
  }

  async function importData(payload, { mode = "merge" } = {}) {
    if (!payload || typeof payload !== "object") return;
    const incoming = {
      projects: Array.isArray(payload.projects) ? payload.projects.map(item => normalizeProject(item, { preserveId: true })) : [],
      characters: Array.isArray(payload.characters) ? payload.characters.map(item => normalizeCharacter(item, { preserveId: true })) : [],
      locations: Array.isArray(payload.locations) ? payload.locations.map(item => normalizeLocation(item, { preserveId: true })) : [],
      timeline: Array.isArray(payload.timelineEvents) ? payload.timelineEvents.map(item => normalizeTimelineEvent(item, { preserveId: true })) : [],
      notes: Array.isArray(payload.notes) ? payload.notes.map(item => normalizeNote(item, { preserveId: true })) : []
    };

    for (const kind of Object.keys(STORES)) {
      if (mode === "replace") {
        await saveCollection(kind, incoming[kind]);
        continue;
      }
      const byId = new Map(cache[kind].map(item => [item.id, item]));
      incoming[kind].forEach(item => {
        if (!byId.has(item.id)) byId.set(item.id, item);
        else {
          const copy = NORMALIZERS[kind]({ ...item, id: createId(kind.slice(0, -1) || "item") }, { preserveId: true });
          if (copy.name) copy.name = `${copy.name} — importado`;
          if (copy.title) copy.title = `${copy.title} — importado`;
          byId.set(copy.id, copy);
        }
      });
      await saveCollection(kind, [...byId.values()]);
    }
  }

  async function initialize() {
    try {
      await openDatabase();
      await migrateLegacy();
      await reconcileLegacy();
      await hydrate();
    } catch (error) {
      console.error("Dados de projeto: IndexedDB indisponível; usando localStorage.", error);
      fallbackMode = true;
      for (const kind of Object.keys(STORES)) {
        cache[kind] = readLegacy(LEGACY[kind]).map(item => NORMALIZERS[kind](item, { preserveId: true }));
      }
    }
  }

  const ready = initialize();

  window.AteroProjectData = {
    ready,
    normalizeProject,
    normalizeCharacter,
    normalizeLocation,
    normalizeTimelineEvent,
    normalizeNote,
    getProjectsSync: () => clone(cache.projects, []),
    getProjectSync: id => clone(cache.projects.find(item => item.id === id) || null, null),
    saveProjects: records => saveCollection("projects", records),
    saveProject: record => saveOne("projects", { ...record, updatedAt: new Date().toISOString() }),
    deleteProject,
    getCharactersSync: projectId => getByProject("characters", projectId),
    saveCharacter: record => saveOne("characters", { ...record, updatedAt: new Date().toISOString() }),
    deleteCharacter: id => deleteOne("characters", id),
    getLocationsSync: projectId => getByProject("locations", projectId),
    saveLocation: record => saveOne("locations", { ...record, updatedAt: new Date().toISOString() }),
    deleteLocation: id => deleteOne("locations", id),
    getTimelineEventsSync: projectId => getByProject("timeline", projectId),
    saveTimelineEvent: record => saveOne("timeline", { ...record, updatedAt: new Date().toISOString() }),
    deleteTimelineEvent: id => deleteOne("timeline", id),
    getNotesSync: projectId => getByProject("notes", projectId),
    saveNote: record => saveOne("notes", { ...record, updatedAt: new Date().toISOString() }),
    deleteNote: id => deleteOne("notes", id),
    exportData,
    importData,
    isFallbackMode: () => fallbackMode
  };
})();
