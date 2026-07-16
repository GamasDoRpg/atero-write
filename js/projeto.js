"use strict";

(() => {
  const params = new URLSearchParams(location.search);
  const projectId = params.get("id");

  const elements = {
    shell: document.querySelector("#projectShell"),
    loading: document.querySelector("#projectLoading"),
    missing: document.querySelector("#projectMissing"),
    nav: document.querySelector("#projectNav"),
    title: document.querySelector("#projectTitle"),
    type: document.querySelector("#projectType"),
    icon: document.querySelector("#projectIcon"),
    updated: document.querySelector("#projectUpdated"),
    sectionEyebrow: document.querySelector("#sectionEyebrow"),
    sectionTitle: document.querySelector("#sectionTitle"),
    sectionDescription: document.querySelector("#sectionDescription"),
    sectionAction: document.querySelector("#sectionAction"),
    content: document.querySelector("#projectContent"),
    menuButton: document.querySelector("#projectMenuButton"),
    menu: document.querySelector("#projectMenu"),
    renameButton: document.querySelector("#renameProjectButton"),
    settingsButton: document.querySelector("#projectSettingsButton"),
    deleteButton: document.querySelector("#deleteProjectButton"),
    newDocumentButton: document.querySelector("#headerNewDocumentButton"),
    toastRegion: document.querySelector("#toastRegion"),
    sidebarSummary: document.querySelector("#projectSidebarSummary")
  };

  const ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="m4 11 8-7 8 7v9H4v-9Z"></path><path d="M9 20v-6h6v6"></path></svg>',
    document: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6V3Z"></path><path d="M14 3v5h4"></path></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><circle cx="17" cy="9" r="2"></circle><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6"></path><path d="M15 15c3.2 0 5 1.7 5.5 5"></path></svg>',
    timeline: '<svg viewBox="0 0 24 24"><path d="M7 4v16"></path><circle cx="7" cy="7" r="2"></circle><circle cx="7" cy="17" r="2"></circle><path d="M11 7h9M11 17h9"></path></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M5 3h14v14l-4 4H5V3Z"></path><path d="M15 21v-4h4M8 8h8M8 12h8"></path></svg>',
    research: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 5 5"></path><path d="M8 10h5M10.5 7.5v5"></path></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3V6Z"></path></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3a8 8 0 0 0-1.7 1L5 6 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.5-1a8 8 0 0 0 1.7 1l.3 3h5l.3-3a8 8 0 0 0 1.7-1L19 18l2-3.5-2-1.5a7 7 0 0 0 .1-1Z"></path></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.5-10.5-3.2-3.2L5 15.8 4 20Z"></path><path d="m14.5 6.3 3.2 3.2"></path></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"></path></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m16 16 5 5"></path></svg>',
    calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M7 3v4M17 3v4M3 10h18"></path></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"></path></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="m7 14 5-5 5 5"></path></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"></path></svg>',
    menu: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>'
  };

  const sectionDescriptions = {
    overview: "Acompanhe o estado do projeto e retome o trabalho rapidamente.",
    documents: "Crie, organize e abra os documentos vinculados ao projeto.",
    characters: "Mantenha fichas consistentes para os personagens.",
    timeline: "Organize os acontecimentos na ordem da narrativa ou do universo.",
    locations: "Registre cenários, lugares e detalhes de ambientação.",
    notes: "Guarde ideias, decisões e lembretes sem misturar com o manuscrito.",
    placeholder: "Este espaço já está reservado na arquitetura do projeto."
  };

  const app = {
    project: null,
    model: null,
    currentSection: null,

    escapeHTML(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },

    icon(name) {
      return ICONS[name] || ICONS.document;
    },

    formatDate(value) {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return "";
      return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
    },

    relativeDate(value) {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return "recentemente";
      const diff = Date.now() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "agora";
      if (minutes < 60) return `há ${minutes} min`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `há ${hours} h`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
      return app.formatDate(value);
    },

    toast(message, type = "success") {
      const toast = document.createElement("div");
      toast.className = `project-toast is-${type}`;
      toast.textContent = message;
      elements.toastRegion.append(toast);
      requestAnimationFrame(() => toast.classList.add("is-visible"));
      setTimeout(() => {
        toast.classList.remove("is-visible");
        setTimeout(() => toast.remove(), 220);
      }, 2800);
    },

    emptyState({ icon = "document", title, text, action }) {
      return `
        <section class="project-empty-state">
          <span>${app.icon(icon)}</span>
          <h3>${app.escapeHTML(title)}</h3>
          <p>${app.escapeHTML(text)}</p>
          ${action ? `<button type="button" data-empty-action>${app.icon("plus")} ${app.escapeHTML(action)}</button>` : ""}
        </section>`;
    },

    setSectionAction(label, handler) {
      const button = elements.sectionAction;
      button.replaceWith(button.cloneNode(true));
      elements.sectionAction = document.querySelector("#sectionAction");
      if (!label || !handler) {
        elements.sectionAction.hidden = true;
        return;
      }
      elements.sectionAction.hidden = false;
      elements.sectionAction.innerHTML = `${app.icon("plus")}<span>${app.escapeHTML(label)}</span>`;
      elements.sectionAction.addEventListener("click", handler);
    },

    async touchProject() {
      app.project = await window.AteroProjectData.saveProject({ ...app.project, updatedAt: new Date().toISOString() });
      app.updateShell();
    },

    updateShell() {
      if (!app.project) return;
      document.title = `${app.project.name} — Atero Write`;
      elements.title.textContent = app.project.name;
      elements.type.textContent = app.project.type;
      elements.icon.textContent = app.model.icon;
      elements.updated.textContent = `Atualizado ${app.relativeDate(app.project.updatedAt)}`;
      const documents = (window.AteroWriteData?.getDocumentsSync?.() || []).filter(item => item.projectId === app.project.id);
      elements.sidebarSummary.innerHTML = `
        <span>${app.escapeHTML(app.project.status === "completed" ? "Concluído" : app.project.status === "paused" ? "Pausado" : "Em andamento")}</span>
        <strong>${documents.length}</strong>
        <small>${documents.length === 1 ? "documento vinculado" : "documentos vinculados"}</small>`;
    },

    renderNavigation() {
      elements.nav.innerHTML = app.model.sections.map(section => `
        <button type="button" class="project-nav-item ${section.future ? "is-future" : ""}" data-section="${app.escapeHTML(section.id)}">
          <span>${app.icon(section.icon)}</span>
          <strong>${app.escapeHTML(section.label)}</strong>
          ${section.future ? "<small>Em breve</small>" : ""}
        </button>`).join("");

      elements.nav.querySelectorAll("[data-section]").forEach(button => {
        button.addEventListener("click", () => app.renderSection(button.dataset.section));
      });
    },

    async renderSection(sectionId, options = {}) {
      const section = app.model.sections.find(item => item.id === sectionId) || app.model.sections[0];
      app.currentSection = section;
      history.replaceState(null, "", `${location.pathname}${location.search}#${section.id}`);
      elements.nav.querySelectorAll("[data-section]").forEach(button => {
        button.classList.toggle("is-active", button.dataset.section === section.id);
      });
      elements.sectionEyebrow.textContent = app.project.type.toLocaleUpperCase("pt-BR");
      elements.sectionTitle.textContent = section.label;
      elements.sectionDescription.textContent = sectionDescriptions[section.module] || app.model.description;
      elements.content.innerHTML = '<div class="project-section-loading"><span></span><p>Carregando módulo…</p></div>';
      app.setSectionAction(null);

      const module = window.AteroProjectModules?.[section.module] || window.AteroProjectModules?.placeholder;
      try {
        await module.render(app, elements.content, section);
        if (options.create && typeof module.create === "function") module.create(app, section);
      } catch (error) {
        console.error(`Falha no módulo ${section.module}:`, error);
        elements.content.innerHTML = app.emptyState({ icon: "document", title: "Não foi possível abrir esta seção", text: "Os dados não foram alterados. Recarregue a página e tente novamente." });
        app.toast("Falha ao abrir a seção.", "error");
      }
    },

    renderCurrentSection() {
      return app.renderSection(app.currentSection?.id || app.model.sections[0].id);
    },

    openFirstModule(moduleName, options = {}) {
      const section = app.model.sections.find(item => item.module === moduleName);
      if (section) app.renderSection(section.id, options);
    },

    createDocumentForModel() {
      const section = app.model.sections.find(item => item.module === "documents");
      if (!section) return;
      app.renderSection(section.id).then(() => {
        const module = window.AteroProjectModules.documents;
        const action = elements.sectionAction;
        action?.click();
      });
    },

    openFormDialog({ eyebrow = "ATER0 WRITE", title, description = "", submitLabel = "Salvar", fields = [], onSubmit }) {
      const dialog = document.createElement("dialog");
      dialog.className = "project-dialog";
      const fieldHTML = fields.map(field => {
        const full = field.full ? " dialog-field-full" : "";
        const value = field.value ?? "";
        if (field.type === "textarea") {
          return `<label class="project-dialog-field${full}"><span>${app.escapeHTML(field.label)}</span><textarea name="${app.escapeHTML(field.name)}" rows="${field.rows || 5}" placeholder="${app.escapeHTML(field.placeholder || "")}" ${field.required ? "required" : ""}>${app.escapeHTML(value)}</textarea></label>`;
        }
        if (field.type === "select") {
          const options = (field.options || []).map(option => {
            const normalized = typeof option === "object" ? option : { value: option, label: option };
            return `<option value="${app.escapeHTML(normalized.value)}" ${String(normalized.value) === String(value) ? "selected" : ""}>${app.escapeHTML(normalized.label)}</option>`;
          }).join("");
          return `<label class="project-dialog-field${full}"><span>${app.escapeHTML(field.label)}</span><select name="${app.escapeHTML(field.name)}">${options}</select></label>`;
        }
        if (field.type === "checkbox") {
          return `<label class="project-dialog-check${full}"><input type="checkbox" name="${app.escapeHTML(field.name)}" ${value ? "checked" : ""}><span>${app.escapeHTML(field.label)}</span></label>`;
        }
        return `<label class="project-dialog-field${full}"><span>${app.escapeHTML(field.label)}</span><input name="${app.escapeHTML(field.name)}" type="${app.escapeHTML(field.type || "text")}" value="${app.escapeHTML(value)}" placeholder="${app.escapeHTML(field.placeholder || "")}" ${field.maxLength ? `maxlength="${field.maxLength}"` : ""} ${field.required ? "required" : ""}></label>`;
      }).join("");
      dialog.innerHTML = `
        <form method="dialog">
          <div class="project-dialog-head"><div><span>${app.escapeHTML(eyebrow)}</span><h2>${app.escapeHTML(title)}</h2>${description ? `<p>${app.escapeHTML(description)}</p>` : ""}</div><button type="button" data-close aria-label="Fechar">×</button></div>
          <div class="project-dialog-grid">${fieldHTML}</div>
          <p class="project-dialog-error" hidden></p>
          <div class="project-dialog-actions"><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">${app.escapeHTML(submitLabel)}</button></div>
        </form>`;
      document.body.append(dialog);
      const close = () => {
        if (dialog.open) dialog.close();
        setTimeout(() => dialog.remove(), 80);
      };
      dialog.querySelector("[data-close]").addEventListener("click", close);
      dialog.querySelector("[data-cancel]").addEventListener("click", close);
      dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
      dialog.addEventListener("click", event => { if (event.target === dialog) close(); });
      dialog.querySelector("form").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const values = {};
        fields.forEach(field => {
          const control = form.elements[field.name];
          values[field.name] = field.type === "checkbox" ? control.checked : String(control.value || "").trim();
        });
        const error = dialog.querySelector(".project-dialog-error");
        const submit = form.querySelector("button[type='submit']");
        submit.disabled = true;
        submit.textContent = "Salvando…";
        try {
          await onSubmit(values);
          close();
        } catch (submitError) {
          console.error(submitError);
          error.textContent = submitError?.message || "Não foi possível salvar.";
          error.hidden = false;
          submit.disabled = false;
          submit.textContent = submitLabel;
        }
      });
      dialog.showModal();
      requestAnimationFrame(() => dialog.querySelector("input, textarea, select")?.focus());
      return dialog;
    },

    openRenameDialog() {
      app.openFormDialog({
        eyebrow: "PROJETO",
        title: "Renomear projeto",
        submitLabel: "Salvar nome",
        fields: [{ name: "name", label: "Nome do projeto", type: "text", required: true, maxLength: 120, value: app.project.name }],
        onSubmit: async values => {
          app.project = await window.AteroProjectData.saveProject({ ...app.project, name: values.name });
          app.updateShell();
          app.toast("Projeto renomeado.");
          app.renderCurrentSection();
        }
      });
    },

    openSettingsDialog() {
      app.openFormDialog({
        eyebrow: "CONFIGURAÇÕES",
        title: "Visão geral do projeto",
        submitLabel: "Salvar alterações",
        fields: [
          { name: "description", label: "Descrição", type: "textarea", full: true, value: app.project.description || "", placeholder: "Uma descrição curta do objetivo do projeto." },
          { name: "status", label: "Status", type: "select", value: app.project.status, options: [
            { value: "active", label: "Em andamento" },
            { value: "paused", label: "Pausado" },
            { value: "completed", label: "Concluído" },
            { value: "archived", label: "Arquivado" }
          ] }
        ],
        onSubmit: async values => {
          app.project = await window.AteroProjectData.saveProject({ ...app.project, ...values });
          app.updateShell();
          app.toast("Projeto atualizado.");
          app.renderCurrentSection();
        }
      });
    },

    async deleteProject() {
      const documents = (window.AteroWriteData?.getDocumentsSync?.() || []).filter(item => item.projectId === app.project.id);
      const message = documents.length
        ? `Excluir “${app.project.name}” e seus ${documents.length} ${documents.length === 1 ? "documento" : "documentos"}? Esta ação não pode ser desfeita.`
        : `Excluir o projeto “${app.project.name}”? Esta ação não pode ser desfeita.`;
      if (!window.confirm(message)) return;
      await window.AteroWriteData.saveDocuments(window.AteroWriteData.getDocumentsSync().filter(item => item.projectId !== app.project.id));
      await window.AteroProjectData.deleteProject(app.project.id);
      location.href = "index.html";
    }
  };

  window.AteroProjectApp = app;

  function bindShellEvents() {
    elements.menuButton.addEventListener("click", event => {
      event.stopPropagation();
      elements.menu.hidden = !elements.menu.hidden;
      elements.menuButton.setAttribute("aria-expanded", String(!elements.menu.hidden));
    });
    document.addEventListener("click", event => {
      if (!elements.menu.contains(event.target) && event.target !== elements.menuButton) {
        elements.menu.hidden = true;
        elements.menuButton.setAttribute("aria-expanded", "false");
      }
    });
    elements.renameButton.addEventListener("click", () => { elements.menu.hidden = true; app.openRenameDialog(); });
    elements.settingsButton.addEventListener("click", () => { elements.menu.hidden = true; app.openSettingsDialog(); });
    elements.deleteButton.addEventListener("click", () => { elements.menu.hidden = true; app.deleteProject(); });
    elements.newDocumentButton.addEventListener("click", () => app.createDocumentForModel());
  }

  async function initialize() {
    await Promise.all([
      window.AteroWriteData?.ready,
      window.AteroProjectData?.ready
    ]);
    if (!projectId) {
      elements.loading.hidden = true;
      elements.missing.hidden = false;
      return;
    }
    app.project = window.AteroProjectData.getProjectSync(projectId);
    if (!app.project) {
      elements.loading.hidden = true;
      elements.missing.hidden = false;
      return;
    }
    app.model = window.AteroProjectModels.resolve(app.project.type);
    if (!app.model) throw new Error("Modelo de projeto não encontrado.");

    elements.loading.hidden = true;
    elements.shell.hidden = false;
    app.updateShell();
    app.renderNavigation();
    bindShellEvents();

    const requested = location.hash.replace(/^#/, "");
    const first = app.model.sections.some(item => item.id === requested) ? requested : app.model.sections[0].id;
    await app.renderSection(first);
  }

  initialize().catch(error => {
    console.error("Não foi possível abrir o projeto:", error);
    elements.loading.hidden = true;
    elements.missing.hidden = false;
    elements.missing.querySelector("p").textContent = "O projeto não pôde ser carregado. Seus dados não foram alterados.";
  });
})();
