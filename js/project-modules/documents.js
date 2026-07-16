"use strict";

(() => {
  const modules = window.AteroProjectModules ||= {};

  function stripHTML(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    return template.content.textContent || "";
  }

  function wordsOf(documentRecord) {
    const text = stripHTML(documentRecord.content).trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function documentsFor(app) {
    return (window.AteroWriteData?.getDocumentsSync?.() || [])
      .filter(item => item.projectId === app.project.id)
      .sort((a, b) => {
        const orderA = Number(a.metadata?.order ?? Number.MAX_SAFE_INTEGER);
        const orderB = Number(b.metadata?.order ?? Number.MAX_SAFE_INTEGER);
        return orderA - orderB || new Date(a.createdAt) - new Date(b.createdAt);
      });
  }

  async function createDocument(app, section) {
    const documents = documentsFor(app);
    const nextNumber = documents.length + 1;
    const defaultName = section.documentKind === "chapter"
      ? `Capítulo ${nextNumber}`
      : section.screenplay
        ? (documents.length ? `Versão ${nextNumber}` : app.project.name)
        : `Novo ${String(section.documentLabel || "documento").toLocaleLowerCase("pt-BR")}`;

    app.openFormDialog({
      eyebrow: "NOVO DOCUMENTO",
      title: `Criar ${String(section.documentLabel || "documento").toLocaleLowerCase("pt-BR")}`,
      submitLabel: "Criar e abrir",
      fields: [
        { name: "name", label: "Nome", type: "text", required: true, maxLength: 120, value: defaultName }
      ],
      onSubmit: async values => {
        const now = new Date().toISOString();
        const record = window.AteroWriteData.normalizeDocument({
          id: window.AteroWriteCore.createId("document"),
          projectId: app.project.id,
          type: section.screenplay ? "screenplay" : "document",
          name: values.name,
          content: "",
          editorSettings: {},
          screenplaySettings: section.screenplay ? { enabled: true } : {},
          createdAt: now,
          updatedAt: now,
          revision: 0,
          metadata: {
            kind: section.documentKind || "document",
            order: documents.length + 1
          }
        }, { preserveId: true });
        await window.AteroWriteData.saveDocument(record);
        await app.touchProject();
        location.href = `editor.html?id=${encodeURIComponent(record.id)}`;
      }
    });
  }

  async function renameDocument(app, record) {
    app.openFormDialog({
      eyebrow: "DOCUMENTO",
      title: "Renomear documento",
      submitLabel: "Salvar nome",
      fields: [
        { name: "name", label: "Nome", type: "text", required: true, maxLength: 120, value: record.name }
      ],
      onSubmit: async values => {
        await window.AteroWriteData.saveDocument({ ...record, name: values.name, updatedAt: new Date().toISOString() });
        await app.touchProject();
        app.renderCurrentSection();
      }
    });
  }

  async function deleteDocument(app, record) {
    const confirmed = window.confirm(`Excluir “${record.name}”? Esta ação também remove versões e recuperações do documento.`);
    if (!confirmed) return;
    await window.AteroWriteData.deleteDocument(record.id);
    await app.touchProject();
    app.toast("Documento excluído.");
    app.renderCurrentSection();
  }

  async function moveDocument(app, record, direction) {
    const all = window.AteroWriteData.getDocumentsSync();
    const projectDocs = documentsFor(app);
    const index = projectDocs.findIndex(item => item.id === record.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= projectDocs.length) return;

    const currentOrder = Number(projectDocs[index].metadata?.order ?? index + 1);
    const targetOrder = Number(projectDocs[target].metadata?.order ?? target + 1);
    const updates = new Map([
      [projectDocs[index].id, { ...projectDocs[index], metadata: { ...projectDocs[index].metadata, order: targetOrder }, updatedAt: new Date().toISOString() }],
      [projectDocs[target].id, { ...projectDocs[target], metadata: { ...projectDocs[target].metadata, order: currentOrder }, updatedAt: new Date().toISOString() }]
    ]);
    await window.AteroWriteData.saveDocuments(all.map(item => updates.get(item.id) || item));
    await app.touchProject();
    app.renderCurrentSection();
  }

  modules.documents = {
    async render(app, container, section) {
      const documents = documentsFor(app);
      app.setSectionAction(`Criar ${String(section.documentLabel || "documento").toLocaleLowerCase("pt-BR")}`, () => createDocument(app, section));

      if (!documents.length) {
        container.innerHTML = app.emptyState({
          icon: "document",
          title: `Nenhum ${String(section.documentLabel || "documento").toLocaleLowerCase("pt-BR")}`,
          text: "Crie o primeiro documento deste projeto. Ele ficará vinculado automaticamente.",
          action: `Criar ${String(section.documentLabel || "documento").toLocaleLowerCase("pt-BR")}`
        });
        container.querySelector("[data-empty-action]")?.addEventListener("click", () => createDocument(app, section));
        return;
      }

      container.innerHTML = `
        <div class="project-list-toolbar">
          <div><strong>${documents.length}</strong><span>${documents.length === 1 ? "documento" : "documentos"}</span></div>
          <p>Use as setas para organizar a ordem dentro do projeto.</p>
        </div>
        <div class="project-document-list">
          ${documents.map((item, index) => `
            <article class="project-document-row" data-document-id="${app.escapeHTML(item.id)}">
              <span class="document-order">${String(index + 1).padStart(2, "0")}</span>
              <div class="project-document-icon">${app.icon("document")}</div>
              <div class="project-document-copy">
                <a href="editor.html?id=${encodeURIComponent(item.id)}">${app.escapeHTML(item.name)}</a>
                <span>${wordsOf(item).toLocaleString("pt-BR")} palavras · Atualizado ${app.relativeDate(item.updatedAt)}</span>
              </div>
              <div class="project-document-controls">
                <button type="button" data-move="up" title="Mover para cima" ${index === 0 ? "disabled" : ""}>${app.icon("up")}</button>
                <button type="button" data-move="down" title="Mover para baixo" ${index === documents.length - 1 ? "disabled" : ""}>${app.icon("down")}</button>
                <button type="button" data-rename title="Renomear">${app.icon("edit")}</button>
                <button type="button" data-delete title="Excluir">${app.icon("trash")}</button>
                <a class="document-primary-open" href="editor.html?id=${encodeURIComponent(item.id)}">Abrir</a>
              </div>
            </article>
          `).join("")}
        </div>`;

      container.querySelectorAll("[data-document-id]").forEach(row => {
        const record = documents.find(item => item.id === row.dataset.documentId);
        row.querySelector('[data-move="up"]')?.addEventListener("click", () => moveDocument(app, record, -1));
        row.querySelector('[data-move="down"]')?.addEventListener("click", () => moveDocument(app, record, 1));
        row.querySelector("[data-rename]")?.addEventListener("click", () => renameDocument(app, record));
        row.querySelector("[data-delete]")?.addEventListener("click", () => deleteDocument(app, record));
      });
    }
  };
})();
