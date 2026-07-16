"use strict";

(() => {
  const modules = window.AteroProjectModules ||= {};

  function openEventDialog(app, eventRecord = null) {
    const locations = window.AteroProjectData.getLocationsSync(app.project.id);
    app.openFormDialog({
      eyebrow: eventRecord ? "LINHA DO TEMPO" : "NOVO EVENTO",
      title: eventRecord ? "Editar evento" : "Adicionar evento",
      submitLabel: eventRecord ? "Salvar evento" : "Adicionar evento",
      fields: [
        { name: "title", label: "Título", type: "text", required: true, maxLength: 140, value: eventRecord?.title || "" },
        { name: "dateLabel", label: "Data exibida", type: "text", maxLength: 100, value: eventRecord?.dateLabel || "", placeholder: "Ex.: Ano 12, três dias depois, 2045..." },
        { name: "sortDate", label: "Data para ordenação", type: "date", value: eventRecord?.sortDate ? eventRecord.sortDate.slice(0, 10) : "" },
        { name: "locationId", label: "Lugar relacionado", type: "select", value: eventRecord?.locationId || "", options: [{ value: "", label: "Nenhum" }, ...locations.map(item => ({ value: item.id, label: item.name }))] },
        { name: "description", label: "Descrição", type: "textarea", full: true, value: eventRecord?.description || "", placeholder: "O que acontece e por que este evento importa?" }
      ],
      onSubmit: async values => {
        const sortDate = values.sortDate ? new Date(`${values.sortDate}T12:00:00`).toISOString() : "";
        await window.AteroProjectData.saveTimelineEvent({
          ...(eventRecord || {}),
          id: eventRecord?.id || window.AteroWriteCore.createId("event"),
          projectId: app.project.id,
          ...values,
          sortDate,
          order: eventRecord?.order || Date.now(),
          createdAt: eventRecord?.createdAt || new Date().toISOString()
        });
        await app.touchProject();
        app.toast(eventRecord ? "Evento atualizado." : "Evento adicionado.");
        app.renderCurrentSection();
      }
    });
  }

  modules.timeline = {
    create(app) { openEventDialog(app); },

    async render(app, container) {
      const locations = new Map(window.AteroProjectData.getLocationsSync(app.project.id).map(item => [item.id, item]));
      const events = window.AteroProjectData.getTimelineEventsSync(app.project.id)
        .sort((a, b) => {
          if (a.sortDate && b.sortDate) return new Date(a.sortDate) - new Date(b.sortDate);
          if (a.sortDate) return -1;
          if (b.sortDate) return 1;
          return Number(a.order) - Number(b.order);
        });
      app.setSectionAction("Novo evento", () => openEventDialog(app));

      if (!events.length) {
        container.innerHTML = app.emptyState({ icon: "timeline", title: "Linha do tempo vazia", text: "Cadastre acontecimentos e organize a sequência dos eventos do projeto.", action: "Adicionar evento" });
        container.querySelector("[data-empty-action]")?.addEventListener("click", () => openEventDialog(app));
        return;
      }

      container.innerHTML = `
        <div class="timeline-list">
          ${events.map((eventRecord, index) => {
            const location = locations.get(eventRecord.locationId);
            return `
              <article class="timeline-event" data-event-id="${app.escapeHTML(eventRecord.id)}">
                <div class="timeline-rail"><span>${String(index + 1).padStart(2, "0")}</span></div>
                <div class="timeline-card">
                  <div class="timeline-card-head">
                    <div><span class="timeline-date">${app.escapeHTML(eventRecord.dateLabel || "Sem data definida")}</span><h3>${app.escapeHTML(eventRecord.title)}</h3></div>
                    <div class="entity-card-actions"><button type="button" data-edit>${app.icon("edit")} Editar</button><button type="button" data-delete class="danger-icon">${app.icon("trash")}</button></div>
                  </div>
                  ${eventRecord.description ? `<p>${app.escapeHTML(eventRecord.description)}</p>` : ""}
                  ${location ? `<span class="timeline-location">${app.icon("pin")} ${app.escapeHTML(location.name)}</span>` : ""}
                </div>
              </article>`;
          }).join("")}
        </div>`;

      container.querySelectorAll("[data-event-id]").forEach(card => {
        const record = events.find(item => item.id === card.dataset.eventId);
        card.querySelector("[data-edit]")?.addEventListener("click", () => openEventDialog(app, record));
        card.querySelector("[data-delete]")?.addEventListener("click", async () => {
          if (!window.confirm(`Excluir o evento “${record.title}”?`)) return;
          await window.AteroProjectData.deleteTimelineEvent(record.id);
          await app.touchProject();
          app.toast("Evento excluído.");
          app.renderCurrentSection();
        });
      });
    }
  };
})();
