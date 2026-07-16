"use strict";

(() => {
  const modules = window.AteroProjectModules ||= {};

  function openNoteDialog(app, note = null) {
    app.openFormDialog({
      eyebrow: note ? "NOTA" : "NOVA NOTA",
      title: note ? "Editar nota" : "Criar nota",
      submitLabel: note ? "Salvar nota" : "Criar nota",
      fields: [
        { name: "title", label: "Título", type: "text", required: true, maxLength: 140, value: note?.title || "" },
        { name: "content", label: "Conteúdo", type: "textarea", full: true, rows: 10, value: note?.content || "", placeholder: "Registre a ideia, dúvida ou lembrete..." },
        { name: "pinned", label: "Fixar no topo", type: "checkbox", full: true, value: Boolean(note?.pinned) }
      ],
      onSubmit: async values => {
        await window.AteroProjectData.saveNote({
          ...(note || {}),
          id: note?.id || window.AteroWriteCore.createId("note"),
          projectId: app.project.id,
          ...values,
          createdAt: note?.createdAt || new Date().toISOString()
        });
        await app.touchProject();
        app.toast(note ? "Nota atualizada." : "Nota criada.");
        app.renderCurrentSection();
      }
    });
  }

  modules.notes = {
    create(app) { openNoteDialog(app); },

    async render(app, container) {
      const notes = window.AteroProjectData.getNotesSync(app.project.id)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt) - new Date(a.updatedAt));
      app.setSectionAction("Nova nota", () => openNoteDialog(app));

      if (!notes.length) {
        container.innerHTML = app.emptyState({ icon: "note", title: "Nenhuma nota", text: "Use notas rápidas para guardar ideias, problemas e decisões do projeto.", action: "Criar nota" });
        container.querySelector("[data-empty-action]")?.addEventListener("click", () => openNoteDialog(app));
        return;
      }

      container.innerHTML = `<div class="notes-grid">${notes.map(note => `
        <article class="note-card ${note.pinned ? "is-pinned" : ""}" data-note-id="${app.escapeHTML(note.id)}">
          <div class="note-card-head"><span>${note.pinned ? app.icon("pin") : app.icon("note")}</span><small>${app.relativeDate(note.updatedAt)}</small></div>
          <h3>${app.escapeHTML(note.title)}</h3>
          <p>${app.escapeHTML(note.content || "Nota vazia.")}</p>
          <div class="entity-card-actions"><button type="button" data-edit>${app.icon("edit")} Editar</button><button type="button" data-delete class="danger-icon">${app.icon("trash")}</button></div>
        </article>`).join("")}</div>`;

      container.querySelectorAll("[data-note-id]").forEach(card => {
        const note = notes.find(item => item.id === card.dataset.noteId);
        card.querySelector("[data-edit]")?.addEventListener("click", () => openNoteDialog(app, note));
        card.querySelector("[data-delete]")?.addEventListener("click", async () => {
          if (!window.confirm(`Excluir a nota “${note.title}”?`)) return;
          await window.AteroProjectData.deleteNote(note.id);
          await app.touchProject();
          app.toast("Nota excluída.");
          app.renderCurrentSection();
        });
      });
    }
  };
})();
