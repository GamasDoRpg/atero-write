"use strict";

(() => {
  const Core = window.AteroWriteCore;
  if (!Core) throw new Error("editor-data-core.js precisa ser carregado antes de editor-data.js.");

  const DB_NAME = "atero_write_database";
  const DB_VERSION = 2;
  const LEGACY = {
    documents: "atero_write_documents",
    versionsPrefix: "atero_write_versions_",
    recovery: "atero_write_recovery",
    preferencesPrefix: "atero_write_editor_preferences_v2_"
  };
  const LOCK_PREFIX = "atero_write_lock_";
  const LOCK_TTL = 60000;
  const LOCK_HEARTBEAT = 10000;
  const tabId = Core.createId("tab");

  const cache = {
    documents: [],
    versions: new Map(),
    recoveries: new Map(),
    preferences: new Map(),
    corruptDocuments: new Map()
  };

  let db = null;
  let fallbackMode = false;
  let lockTimer = null;
  let lockedDocumentId = null;
  let lockOwner = false;
  let storageWarningAt = 0;

  function parseJSON(value, fallback) {
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  }

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

  async function openDatabase() {
    if (!window.indexedDB) throw new Error("Este navegador não oferece IndexedDB.");
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("documents")) {
        database.createObjectStore("documents", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("versions")) {
        const versions = database.createObjectStore("versions", { keyPath: "id" });
        versions.createIndex("documentId", "documentId", { unique: false });
      }
      if (!database.objectStoreNames.contains("recoveries")) {
        database.createObjectStore("recoveries", { keyPath: "documentId" });
      }
      if (!database.objectStoreNames.contains("preferences")) {
        database.createObjectStore("preferences", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("meta")) {
        database.createObjectStore("meta", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("projects")) {
        database.createObjectStore("projects", { keyPath: "id" });
      }
      for (const storeName of ["characters", "locations", "timelineEvents", "projectNotes"]) {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("projectId", "projectId", { unique: false });
        }
      }
    };
    db = await requestPromise(request);
    db.onversionchange = () => db.close();
    return db;
  }

  async function getAll(storeName) {
    const transaction = db.transaction(storeName, "readonly");
    return requestPromise(transaction.objectStore(storeName).getAll());
  }

  async function putMany(storeName, values) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    values.forEach(value => store.put(value));
    await transactionComplete(transaction);
  }

  async function replaceStore(storeName, values) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.clear();
    values.forEach(value => store.put(value));
    await transactionComplete(transaction);
  }

  async function deleteFromStore(storeName, key) {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    await transactionComplete(transaction);
  }

  async function getMeta(key) {
    const transaction = db.transaction("meta", "readonly");
    return requestPromise(transaction.objectStore("meta").get(key));
  }

  async function setMeta(key, value) {
    const transaction = db.transaction("meta", "readwrite");
    transaction.objectStore("meta").put({ key, value, updatedAt: new Date().toISOString() });
    await transactionComplete(transaction);
  }

  function mirrorDocuments() {
    try { localStorage.setItem(LEGACY.documents, JSON.stringify(cache.documents)); } catch { /* IndexedDB remains canonical. */ }
  }

  function mirrorVersions(documentId) {
    try {
      localStorage.setItem(`${LEGACY.versionsPrefix}${documentId}`, JSON.stringify(cache.versions.get(documentId) || []));
    } catch { /* no-op */ }
  }

  function mirrorRecovery(documentId) {
    try {
      const recovery = cache.recoveries.get(documentId);
      if (recovery) localStorage.setItem(LEGACY.recovery, JSON.stringify(recovery));
      else {
        const current = parseJSON(localStorage.getItem(LEGACY.recovery), null);
        if (!current || current.documentId === documentId) localStorage.removeItem(LEGACY.recovery);
      }
    } catch { /* no-op */ }
  }

  function mirrorPreference(id) {
    try {
      const record = cache.preferences.get(id);
      if (record) localStorage.setItem(`${LEGACY.preferencesPrefix}${id}`, JSON.stringify(record.value));
    } catch { /* no-op */ }
  }

  async function migrateLegacyIfNeeded() {
    const migration = await getMeta("legacyMigrationV2");
    if (migration?.value === true) return;

    const existingDocuments = await getAll("documents");
    if (!existingDocuments.length) {
      const legacyDocuments = parseJSON(localStorage.getItem(LEGACY.documents), []);
      if (Array.isArray(legacyDocuments) && legacyDocuments.length) {
        await putMany("documents", legacyDocuments.map(item => Core.normalizeDocument(item, { preserveId: true })));
      }
    }

    const versionRecords = [];
    const preferenceRecords = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (key.startsWith(LEGACY.versionsPrefix)) {
        const documentId = key.slice(LEGACY.versionsPrefix.length);
        const versions = parseJSON(localStorage.getItem(key), []);
        if (Array.isArray(versions)) {
          versions.forEach(item => versionRecords.push(Core.normalizeVersion(item, documentId)));
        }
      } else if (key.startsWith(LEGACY.preferencesPrefix)) {
        const id = key.slice(LEGACY.preferencesPrefix.length);
        preferenceRecords.push({ id, value: parseJSON(localStorage.getItem(key), {}) });
      }
    }
    if (versionRecords.length) await putMany("versions", versionRecords);
    if (preferenceRecords.length) await putMany("preferences", preferenceRecords);

    const recovery = parseJSON(localStorage.getItem(LEGACY.recovery), null);
    if (recovery?.documentId) await putMany("recoveries", [recovery]);
    await setMeta("legacyMigrationV2", true);
  }


  async function reconcileLegacyDocuments() {
    const legacyRaw = localStorage.getItem(LEGACY.documents);
    if (legacyRaw == null) return;
    const legacyDocuments = parseJSON(legacyRaw, []);
    if (!Array.isArray(legacyDocuments)) return;

    const stored = await getAll("documents");
    const byId = new Map(stored.map(item => [item.id, item]));
    let changed = false;

    for (const legacyItem of legacyDocuments) {
      if (!legacyItem?.id) continue;
      const existing = byId.get(legacyItem.id);
      if (!existing) {
        byId.set(legacyItem.id, Core.normalizeDocument(legacyItem, { preserveId: true }));
        changed = true;
        continue;
      }

      const legacyUpdated = new Date(legacyItem.updatedAt || legacyItem.createdAt || 0).getTime();
      const storedUpdated = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      if (legacyUpdated > storedUpdated) {
        byId.set(legacyItem.id, Core.normalizeDocument({ ...existing, ...legacyItem }, { preserveId: true }));
        changed = true;
      }
    }

    if (changed) await replaceStore("documents", [...byId.values()]);
  }

  async function hydrateCache() {
    const documents = await getAll("documents");
    cache.corruptDocuments.clear();
    cache.documents = documents.map(item => {
      const validation = Core.validateDocument(item);
      if (!validation.valid && item?.id) {
        cache.corruptDocuments.set(item.id, {
          record: Core.clone(item, item),
          errors: validation.errors
        });
      }
      return Core.normalizeDocument(item, { preserveId: true });
    });

    cache.versions.clear();
    (await getAll("versions")).forEach(version => {
      if (!version.documentId) return;
      const list = cache.versions.get(version.documentId) || [];
      list.push(Core.normalizeVersion(version, version.documentId));
      cache.versions.set(version.documentId, list);
    });
    cache.versions.forEach(list => list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

    cache.recoveries.clear();
    (await getAll("recoveries")).forEach(item => cache.recoveries.set(item.documentId, item));
    cache.preferences.clear();
    (await getAll("preferences")).forEach(item => cache.preferences.set(item.id, item));

    mirrorDocuments();
    cache.versions.forEach((_, documentId) => mirrorVersions(documentId));
  }

  function emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  async function checkStoragePressure(force = false) {
    if (!navigator.storage?.estimate) return null;
    if (!force && Date.now() - storageWarningAt < 30000) return null;
    const estimate = await navigator.storage.estimate();
    const usage = Number(estimate.usage || 0);
    const quota = Number(estimate.quota || 0);
    const ratio = quota > 0 ? usage / quota : 0;
    if (ratio >= 0.8) {
      storageWarningAt = Date.now();
      emit("atero:storage-warning", { usage, quota, ratio });
    }
    return { usage, quota, ratio };
  }

  async function saveDocuments(documents) {
    const previousIds = new Set(cache.documents.map(item => item.id));
    const normalized = documents.map(item => Core.normalizeDocument(item, { preserveId: true }));
    const nextIds = new Set(normalized.map(item => item.id));
    const removedIds = [...previousIds].filter(id => !nextIds.has(id));
    cache.documents = normalized;

    removedIds.forEach(documentId => {
      cache.versions.delete(documentId);
      cache.recoveries.delete(documentId);
      cache.preferences.delete(documentId);
      try {
        localStorage.removeItem(`${LEGACY.versionsPrefix}${documentId}`);
        localStorage.removeItem(`${LEGACY.preferencesPrefix}${documentId}`);
      } catch { /* no-op */ }
      mirrorRecovery(documentId);
    });

    mirrorDocuments();
    if (!db || fallbackMode) return normalized;
    try {
      await replaceStore("documents", normalized);
      if (removedIds.length) {
        const versions = (await getAll("versions")).filter(item => !removedIds.includes(item.documentId));
        const recoveries = (await getAll("recoveries")).filter(item => !removedIds.includes(item.documentId));
        const preferences = (await getAll("preferences")).filter(item => !removedIds.includes(item.id));
        await replaceStore("versions", versions);
        await replaceStore("recoveries", recoveries);
        await replaceStore("preferences", preferences);
      }
      await checkStoragePressure();
      emit("atero:data-saved", { kind: "documents" });
    } catch (error) {
      emit("atero:data-error", { error, kind: "documents" });
      throw error;
    }
    return normalized;
  }

  async function saveDocument(documentRecord) {
    const normalized = Core.normalizeDocument(documentRecord, { preserveId: true });
    const index = cache.documents.findIndex(item => item.id === normalized.id);
    if (index >= 0) cache.documents[index] = normalized;
    else cache.documents.push(normalized);
    mirrorDocuments();
    if (!db || fallbackMode) return normalized;
    try {
      await putMany("documents", [normalized]);
      await checkStoragePressure();
      emit("atero:data-saved", { kind: "document", document: normalized });
    } catch (error) {
      emit("atero:data-error", { error, kind: "document", document: normalized });
      throw error;
    }
    return normalized;
  }

  async function deleteDocument(documentId) {
    await saveDocuments(cache.documents.filter(item => item.id !== documentId));
  }

  async function saveVersions(documentId, versions) {
    const normalized = versions.map(item => Core.normalizeVersion(item, documentId));
    cache.versions.set(documentId, normalized);
    mirrorVersions(documentId);
    if (!db || fallbackMode) return;
    const current = await getAll("versions");
    const others = current.filter(item => item.documentId !== documentId);
    await replaceStore("versions", [...others, ...normalized]);
  }

  async function saveRecovery(recovery) {
    if (!recovery?.documentId) return;
    cache.recoveries.set(recovery.documentId, recovery);
    mirrorRecovery(recovery.documentId);
    if (!db || fallbackMode) return;
    await putMany("recoveries", [recovery]);
  }

  async function clearRecovery(documentId) {
    cache.recoveries.delete(documentId);
    mirrorRecovery(documentId);
    if (!db || fallbackMode) return;
    await deleteFromStore("recoveries", documentId);
  }

  async function savePreference(id, value) {
    const record = { id, value };
    cache.preferences.set(id, record);
    mirrorPreference(id);
    if (!db || fallbackMode) return;
    await putMany("preferences", [record]);
  }

  function lockKey(documentId) {
    return `${LOCK_PREFIX}${documentId}`;
  }

  function readLock(documentId) {
    try {
      return parseJSON(localStorage.getItem(lockKey(documentId)), null);
    } catch {
      return null;
    }
  }

  function writeLock(documentId) {
    const record = { tabId, documentId, expiresAt: Date.now() + LOCK_TTL, updatedAt: Date.now() };
    try { localStorage.setItem(lockKey(documentId), JSON.stringify(record)); } catch { /* Sem trava entre abas, mas o editor continua funcional. */ }
    return record;
  }

  function releaseLock() {
    if (!lockedDocumentId || !lockOwner) return;
    const current = readLock(lockedDocumentId);
    if (current?.tabId === tabId) {
      try { localStorage.removeItem(lockKey(lockedDocumentId)); } catch { /* no-op */ }
    }
    clearInterval(lockTimer);
    lockTimer = null;
    lockedDocumentId = null;
    lockOwner = false;
  }

  function claimDocumentLock(documentId, force = false) {
    if (!documentId) return true;
    releaseLock();
    const current = readLock(documentId);
    const activeOther = current && current.tabId !== tabId && Number(current.expiresAt) > Date.now();
    lockedDocumentId = documentId;
    if (activeOther && !force) {
      lockOwner = false;
      emit("atero:lock-conflict", { documentId, lock: current });
      return false;
    }
    writeLock(documentId);
    lockOwner = true;
    lockTimer = setInterval(() => {
      if (lockOwner && lockedDocumentId === documentId) writeLock(documentId);
    }, LOCK_HEARTBEAT);
    emit("atero:lock-acquired", { documentId, forced: force });
    return true;
  }

  function canWrite(documentId) {
    if (!documentId) return false;
    if (documentId !== lockedDocumentId || !lockOwner) return false;
    const current = readLock(documentId);
    return current?.tabId === tabId && Number(current.expiresAt) > Date.now();
  }

  async function exportWorkspace() {
    const projectData = await window.AteroProjectData?.exportData?.();
    return {
      format: Core.WORKSPACE_FORMAT,
      formatVersion: Core.SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      documents: Core.clone(cache.documents, []),
      versions: [...cache.versions.values()].flat().map(item => Core.clone(item, {})),
      preferences: [...cache.preferences.values()].map(item => Core.clone(item, {})),
      recoveries: [...cache.recoveries.values()].map(item => Core.clone(item, {})),
      projectData: projectData || null
    };
  }

  async function importWorkspace(payload, { mode = "merge" } = {}) {
    const rawProjectData = payload?.projectData || null;
    const backup = Core.normalizeWorkspaceBackup(payload);
    const incomingDocuments = backup.documents;
    const idMap = new Map();
    let documents;

    if (mode === "replace") {
      documents = incomingDocuments;
      incomingDocuments.forEach(item => idMap.set(item.id, item.id));
    } else {
      const byId = new Map(cache.documents.map(item => [item.id, item]));
      incomingDocuments.forEach(item => {
        if (byId.has(item.id)) {
          const imported = Core.normalizeDocument(item, { preserveId: false });
          imported.name = `${item.name} — importado`;
          idMap.set(item.id, imported.id);
          byId.set(imported.id, imported);
        } else {
          idMap.set(item.id, item.id);
          byId.set(item.id, item);
        }
      });
      documents = [...byId.values()];
    }

    const remappedVersions = backup.versions.map(item => ({
      ...item,
      id: mode === "replace" ? item.id : Core.createId("version"),
      documentId: idMap.get(item.documentId) || item.documentId
    }));
    const remappedPreferences = backup.preferences.map(item => ({
      ...item,
      id: idMap.get(item.id) || item.id
    }));
    const remappedRecoveries = backup.recoveries.map(item => ({
      ...item,
      documentId: idMap.get(item.documentId) || item.documentId
    }));

    await saveDocuments(documents);

    if (!db || fallbackMode) {
      if (mode === "replace") {
        cache.versions.clear();
        cache.preferences.clear();
        cache.recoveries.clear();
      }
      remappedVersions.forEach(item => {
        const list = cache.versions.get(item.documentId) || [];
        list.push(item);
        cache.versions.set(item.documentId, list);
      });
      remappedPreferences.forEach(item => cache.preferences.set(item.id, item));
      remappedRecoveries.forEach(item => cache.recoveries.set(item.documentId, item));
      cache.versions.forEach((_, documentId) => mirrorVersions(documentId));
      cache.preferences.forEach((_, id) => mirrorPreference(id));
      cache.recoveries.forEach((_, documentId) => mirrorRecovery(documentId));
      if (rawProjectData && window.AteroProjectData?.importData) {
        await window.AteroProjectData.importData(rawProjectData, { mode });
      }
      emit("atero:workspace-imported", { mode, documents: incomingDocuments.length });
      return incomingDocuments.map(item => ({ ...item, importedId: idMap.get(item.id) || item.id }));
    }

    if (mode === "replace") {
      await replaceStore("versions", remappedVersions);
      await replaceStore("preferences", remappedPreferences);
      await replaceStore("recoveries", remappedRecoveries);
    } else {
      if (remappedVersions.length) await putMany("versions", remappedVersions);
      if (remappedPreferences.length) await putMany("preferences", remappedPreferences);
      if (remappedRecoveries.length) await putMany("recoveries", remappedRecoveries);
    }
    await hydrateCache();
    if (rawProjectData && window.AteroProjectData?.importData) {
      await window.AteroProjectData.importData(rawProjectData, { mode });
    }
    emit("atero:workspace-imported", { mode, documents: incomingDocuments.length });
    return incomingDocuments.map(item => ({ ...item, importedId: idMap.get(item.id) || item.id }));
  }

  function createCorruptionOverlay({ record, errors = [], onCreateCopy } = {}) {
    document.querySelector(".atero-corruption-screen")?.remove();
    const overlay = document.createElement("section");
    overlay.className = "atero-corruption-screen";
    const raw = JSON.stringify(record ?? null, null, 2);
    overlay.innerHTML = `
      <div class="atero-corruption-card">
        <span class="atero-data-kicker">RECUPERAÇÃO</span>
        <h1>Este documento parece estar corrompido</h1>
        <p>O Atero Write interrompeu a abertura para não sobrescrever os dados existentes.</p>
        <details><summary>Detalhes técnicos</summary><pre>${Core.escapeHTML(errors.join("\n") || "Estrutura inválida.")}</pre></details>
        <div class="atero-corruption-actions">
          <button type="button" data-action="download">Baixar dados brutos</button>
          <button type="button" data-action="copy" class="primary">Criar cópia recuperada</button>
          <a href="index.html">Voltar aos documentos</a>
        </div>
      </div>`;
    document.body.append(overlay);
    overlay.querySelector('[data-action="download"]').addEventListener("click", () => {
      const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "documento-corrompido.json";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    overlay.querySelector('[data-action="copy"]').addEventListener("click", () => onCreateCopy?.());
  }

  async function initialize() {
    try {
      await openDatabase();
      await migrateLegacyIfNeeded();
      await reconcileLegacyDocuments();
      await hydrateCache();
      await checkStoragePressure(true);
      emit("atero:data-ready", { documents: cache.documents.length });
    } catch (error) {
      console.error("IndexedDB indisponível; usando espelho local.", error);
      fallbackMode = true;
      const legacy = parseJSON(localStorage.getItem(LEGACY.documents), []);
      cache.documents = Array.isArray(legacy)
        ? legacy.map(item => Core.normalizeDocument(item, { preserveId: true }))
        : [];
      emit("atero:data-fallback", { error });
    }
  }

  const ready = initialize();

  window.addEventListener("storage", event => {
    if (!lockedDocumentId || event.key !== lockKey(lockedDocumentId)) return;
    const current = readLock(lockedDocumentId);
    if (lockOwner && current?.tabId !== tabId && Number(current?.expiresAt) > Date.now()) {
      lockOwner = false;
      clearInterval(lockTimer);
      emit("atero:lock-lost", { documentId: lockedDocumentId });
    }
  });
  window.addEventListener("pagehide", releaseLock);

  window.AteroWriteData = {
    ready,
    getDocumentsSync: () => Core.clone(cache.documents, []),
    getDocumentSync: id => Core.clone(cache.documents.find(item => item.id === id) || null, null),
    getCorruptDocumentSync: id => Core.clone(cache.corruptDocuments.get(id) || null, null),
    saveDocuments,
    saveDocument,
    deleteDocument,
    getVersionsSync: documentId => Core.clone(cache.versions.get(documentId) || [], []),
    saveVersions,
    getRecoverySync: documentId => Core.clone(cache.recoveries.get(documentId) || null, null),
    saveRecovery,
    clearRecovery,
    getPreferenceSync: id => Core.clone(cache.preferences.get(id)?.value || null, null),
    savePreference,
    checkStoragePressure,
    claimDocumentLock,
    canWrite,
    forceDocumentLock: documentId => claimDocumentLock(documentId, true),
    releaseLock,
    exportWorkspace,
    importWorkspace,
    showCorruptionScreen: createCorruptionOverlay,
    normalizeDocument: Core.normalizeDocument,
    validateDocument: Core.validateDocument,
    schemaVersion: Core.SCHEMA_VERSION
  };
})();
