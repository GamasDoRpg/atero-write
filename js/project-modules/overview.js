"use strict";

(() => {
  const modules = window.AteroProjectModules ||= {};

  function wordCount(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    const text = (template.content.textContent || "").trim();
    return text ? text.split(/\s+/).length : 0;
  }

  modules.overview = {
    async render(app, container) {
      app.setSectionAction("Criar documento", () => app.createDocumentForModel());

      const documents = (window.AteroWriteData?.getDocumentsSync?.() || [])
        .filter(item => item.projectId === app.project.id)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      const characters = window.AteroProjectData.getCharactersSync(app.project.id);
      const locations = window.AteroProjectData.getLocationsSync(app.project.id);
      const events = window.AteroProjectData.getTimelineEventsSync(app.project.id);
      const notes = window.AteroProjectData.getNotesSync(app.project.id);
      const words = documents.reduce((sum, item) => sum + wordCount(item.content), 0);
      const recent = documents.slice(0, 4);

      container.innerHTML = `
        <section class="project-hero-card">
          <div>
            <span class="project-kicker">${app.escapeHTML(app.model.label)}</span>
            <h3>${app.escapeHTML(app.project.name)}</h3>
            <p>${app.escapeHTML(app.project.description || app.model.description)}</p>
          </div>
          <button type="button" data-edit-overview>${app.icon("edit")} Editar visão geral</button>
        </section>

        <section class="project-stat-grid">
          <article><span>Palavras</span><strong>${words.toLocaleString("pt-BR")}</strong><small>em todos os documentos</small></article>
          <article><span>Documentos</span><strong>${documents.length}</strong><small>vinculados ao projeto</small></article>
          <article><span>Personagens</span><strong>${characters.length}</strong><small>fichas cadastradas</small></article>
          <article><span>Estrutura</span><strong>${events.length + locations.length + notes.length}</strong><small>itens organizados</small></article>
        </section>

        <div class="overview-grid">
          <section class="overview-panel">
            <div class="overview-panel-head">
              <div><span>TRABALHO RECENTE</span><h3>Documentos</h3></div>
              <button type="button" data-open-documents>Ver todos</button>
            </div>
            ${recent.length ? `
              <div class="recent-document-list">
                ${recent.map(item => `
                  <a href="editor.html?id=${encodeURIComponent(item.id)}">
                    <span class="recent-icon">${app.icon("document")}</span>
                    <span><strong>${app.escapeHTML(item.name)}</strong><small>${wordCount(item.content).toLocaleString("pt-BR")} palavras · ${app.relativeDate(item.updatedAt)}</small></span>
                    ${app.icon("arrow")}
                  </a>`).join("")}
              </div>` : app.emptyState({ icon: "document", title: "Nenhum documento", text: "Crie o primeiro texto para começar este projeto.", action: "Criar documento" })}
          </section>

          <section class="overview-panel overview-quick-panel">
            <div class="overview-panel-head"><div><span>ATALHOS</span><h3>Adicionar ao projeto</h3></div></div>
            <div class="quick-actions-grid">
              <button type="button" data-quick="document">${app.icon("document")}<span><strong>Documento</strong><small>Crie um novo texto</small></span></button>
              ${app.model.sections.some(section => section.module === "characters") ? `<button type="button" data-quick="characters">${app.icon("people")}<span><strong>Personagem</strong><small>Adicione uma ficha</small></span></button>` : ""}
              ${app.model.sections.some(section => section.module === "timeline") ? `<button type="button" data-quick="timeline">${app.icon("timeline")}<span><strong>Evento</strong><small>Construa a cronologia</small></span></button>` : ""}
              <button type="button" data-quick="notes">${app.icon("note")}<span><strong>Nota</strong><small>Registre uma ideia</small></span></button>
            </div>
          </section>
        </div>`;

      container.querySelector("[data-edit-overview]")?.addEventListener("click", () => app.openSettingsDialog());
      container.querySelector("[data-open-documents]")?.addEventListener("click", () => app.openFirstModule("documents"));
      container.querySelector("[data-empty-action]")?.addEventListener("click", () => app.createDocumentForModel());
      container.querySelector('[data-quick="document"]')?.addEventListener("click", () => app.createDocumentForModel());
      container.querySelector('[data-quick="characters"]')?.addEventListener("click", () => app.openFirstModule("characters", { create: true }));
      container.querySelector('[data-quick="timeline"]')?.addEventListener("click", () => app.openFirstModule("timeline", { create: true }));
      container.querySelector('[data-quick="notes"]')?.addEventListener("click", () => app.openFirstModule("notes", { create: true }));
    }
  };
})();
