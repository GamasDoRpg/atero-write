"use strict";

(() => {
  const typeInitials = {
    Livro: "L", Roteiro: "R", Artigo: "A", Pesquisa: "P", Ensaio: "E",
    Diário: "D", "Trabalho acadêmico": "T", Documentação: "D", Coletânea: "C", Vazio: "V"
  };
  const typeDescriptions = {
    Livro: "Manuscrito, personagens, linha do tempo e lugares.",
    Roteiro: "Roteiro, personagens, locações e continuidade.",
    Artigo: "Texto principal, notas e materiais de pesquisa.",
    Pesquisa: "Documentos, notas e materiais de investigação.",
    Ensaio: "Estrutura livre para desenvolver uma ideia.",
    Diário: "Entradas, notas e organização cronológica.",
    "Trabalho acadêmico": "Texto, notas e estrutura de pesquisa.",
    Documentação: "Documentos técnicos organizados em um projeto.",
    Coletânea: "Vários textos reunidos em uma única obra.",
    Vazio: "Um espaço flexível para documentos e notas."
  };

  const el = {
    newProjectButton: document.querySelector("#newProjectButton"),
    newDocumentButton: document.querySelector("#newDocumentButton"),
    projectDialog: document.querySelector("#projectDialog"),
    documentDialog: document.querySelector("#documentDialog"),
    projectForm: document.querySelector("#projectForm"),
    documentForm: document.querySelector("#documentForm"),
    projectName: document.querySelector("#projectName"),
    projectType: document.querySelector("#projectType"),
    documentName: document.querySelector("#documentName"),
    projectFormError: document.querySelector("#projectFormError"),
    documentFormError: document.querySelector("#documentFormError"),
    projectsEmptyState: document.querySelector("#projectsEmptyState"),
    projectsGrid: document.querySelector("#projectsGrid"),
    documentsEmptyState: document.querySelector("#documentsEmptyState"),
    documentsList: document.querySelector("#documentsList")
  };

  function cleanName(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function formatDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }

  function openDialog(dialog, input) {
    if (!dialog?.showModal) return;
    dialog.showModal();
    document.body.classList.add("dialog-open");
    requestAnimationFrame(() => input?.focus());
  }

  function closeDialog(dialog) {
    if (dialog?.open) dialog.close();
    document.body.classList.remove("dialog-open");
  }

  function showError(node, message) {
    node.textContent = message;
    node.hidden = false;
  }

  function clearError(node) {
    node.textContent = "";
    node.hidden = true;
  }

  function deleteIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M7 7l1 13h8l1-13"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';
  }

  function wordCount(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    const text = (template.content.textContent || "").trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function renderProjects() {
    const projects = window.AteroProjectData?.getProjectsSync?.() || [];
    el.projectsEmptyState.hidden = projects.length > 0;
    el.projectsGrid.hidden = projects.length === 0;
    el.projectsGrid.replaceChildren();

    projects.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).forEach(project => {
      const docs = (window.AteroWriteData?.getDocumentsSync?.() || []).filter(item => item.projectId === project.id);
      const card = document.createElement("article");
      card.className = "project-card";
      card.dataset.projectId = project.id;
      card.innerHTML = `
        <div class="project-card-top">
          <span class="project-type-icon">${typeInitials[project.type] || "P"}</span>
          <span class="project-type-badge">${project.type}</span>
        </div>
        <h3></h3>
        <p>${typeDescriptions[project.type] || typeDescriptions.Vazio}</p>
        <div class="project-card-footer">
          <span class="project-date">${docs.length} ${docs.length === 1 ? "documento" : "documentos"} · ${formatDate(project.updatedAt || project.createdAt)}</span>
          <div class="project-card-actions">
            <a class="project-open" href="projeto.html?id=${encodeURIComponent(project.id)}">Abrir projeto</a>
            <button class="item-delete" type="button" title="Excluir projeto" aria-label="Excluir projeto">${deleteIcon()}</button>
          </div>
        </div>`;
      card.querySelector("h3").textContent = project.name;
      card.querySelector(".item-delete").addEventListener("click", async () => {
        const warning = docs.length
          ? `Excluir “${project.name}” e seus ${docs.length} ${docs.length === 1 ? "documento" : "documentos"}?`
          : `Excluir o projeto “${project.name}”?`;
        if (!window.confirm(warning)) return;
        await window.AteroWriteData.saveDocuments(window.AteroWriteData.getDocumentsSync().filter(item => item.projectId !== project.id));
        await window.AteroProjectData.deleteProject(project.id);
        renderProjects();
        renderDocuments();
      });
      el.projectsGrid.append(card);
    });
  }

  function renderDocuments() {
    const documents = (window.AteroWriteData?.getDocumentsSync?.() || []).filter(item => !item.projectId);
    el.documentsEmptyState.hidden = documents.length > 0;
    el.documentsList.hidden = documents.length === 0;
    el.documentsList.replaceChildren();

    documents.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).forEach(record => {
      const row = document.createElement("article");
      row.className = "document-row";
      row.dataset.documentId = record.id;
      row.innerHTML = `
        <span class="document-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6V3Z"></path><path d="M14 3v5h4"></path></svg></span>
        <div class="document-info"><strong></strong><span>${wordCount(record.content).toLocaleString("pt-BR")} palavras</span></div>
        <span class="document-date">${formatDate(record.updatedAt || record.createdAt)}</span>
        <div class="document-actions"><a class="document-open" href="editor.html?id=${encodeURIComponent(record.id)}">Abrir documento</a><button class="item-delete" type="button" title="Excluir documento">${deleteIcon()}</button></div>`;
      row.querySelector("strong").textContent = record.name;
      row.querySelector(".item-delete").addEventListener("click", async () => {
        if (!window.confirm(`Excluir “${record.name}”?`)) return;
        await window.AteroWriteData.deleteDocument(record.id);
        renderDocuments();
      });
      el.documentsList.append(row);
    });
  }

  async function createProject(event) {
    event.preventDefault();
    clearError(el.projectFormError);
    const name = cleanName(el.projectName.value);
    const type = el.projectType.value;
    if (name.length < 2) {
      showError(el.projectFormError, "Digite um nome com pelo menos 2 caracteres.");
      el.projectName.focus();
      return;
    }
    if (!type) {
      showError(el.projectFormError, "Escolha um tipo de projeto.");
      el.projectType.focus();
      return;
    }
    const now = new Date().toISOString();
    const project = await window.AteroProjectData.saveProject({
      id: window.AteroWriteCore.createId("project"),
      name,
      type,
      description: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
      settings: {},
      metadata: {}
    });
    el.projectForm.reset();
    closeDialog(el.projectDialog);
    location.href = `projeto.html?id=${encodeURIComponent(project.id)}`;
  }

  async function createDocument(event) {
    event.preventDefault();
    clearError(el.documentFormError);
    const name = cleanName(el.documentName.value);
    if (name.length < 2) {
      showError(el.documentFormError, "Digite um nome com pelo menos 2 caracteres.");
      el.documentName.focus();
      return;
    }
    const now = new Date().toISOString();
    const record = window.AteroWriteData.normalizeDocument({
      id: window.AteroWriteCore.createId("document"),
      projectId: null,
      type: "document",
      name,
      content: "",
      editorSettings: {},
      screenplaySettings: {},
      createdAt: now,
      updatedAt: now,
      revision: 0,
      metadata: {}
    }, { preserveId: true });
    await window.AteroWriteData.saveDocument(record);
    el.documentForm.reset();
    closeDialog(el.documentDialog);
    location.href = `editor.html?id=${encodeURIComponent(record.id)}`;
  }

  el.newProjectButton?.addEventListener("click", () => { clearError(el.projectFormError); openDialog(el.projectDialog, el.projectName); });
  el.newDocumentButton?.addEventListener("click", () => { clearError(el.documentFormError); openDialog(el.documentDialog, el.documentName); });
  el.projectForm?.addEventListener("submit", createProject);
  el.documentForm?.addEventListener("submit", createDocument);

  document.querySelectorAll("[data-close-dialog]").forEach(button => {
    button.addEventListener("click", () => closeDialog(document.querySelector(`#${button.dataset.closeDialog}`)));
  });
  [el.projectDialog, el.documentDialog].forEach(dialog => {
    dialog?.addEventListener("click", event => { if (event.target === dialog) closeDialog(dialog); });
    dialog?.addEventListener("cancel", event => { event.preventDefault(); closeDialog(dialog); });
    dialog?.addEventListener("close", () => document.body.classList.remove("dialog-open"));
  });

  async function initialize() {
    await Promise.all([window.AteroWriteData?.ready, window.AteroProjectData?.ready]);
    renderProjects();
    renderDocuments();
  }

  initialize().catch(error => {
    console.error("Não foi possível iniciar o painel:", error);
    renderProjects();
    renderDocuments();
  });
})();
