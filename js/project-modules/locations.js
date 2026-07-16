"use strict";

(() => {
  const modules = window.AteroProjectModules ||= {};

  function openLocationDialog(app, locationRecord = null) {
    app.openFormDialog({
      eyebrow: locationRecord ? "LUGAR" : "NOVA FICHA",
      title: locationRecord ? "Editar lugar" : "Adicionar lugar",
      submitLabel: locationRecord ? "Salvar alterações" : "Criar lugar",
      fields: [
        { name: "name", label: "Nome", type: "text", required: true, maxLength: 140, value: locationRecord?.name || "" },
        { name: "kind", label: "Tipo", type: "text", maxLength: 100, value: locationRecord?.kind || "", placeholder: "Cidade, planeta, edifício, região..." },
        { name: "importance", label: "Importância", type: "select", value: locationRecord?.importance || "Secundário", options: ["Principal", "Recorrente", "Secundário", "Mencionado"] },
        { name: "description", label: "Descrição", type: "textarea", full: true, value: locationRecord?.description || "", placeholder: "Geografia, história, função narrativa..." },
        { name: "atmosphere", label: "Atmosfera e detalhes sensoriais", type: "textarea", full: true, value: locationRecord?.atmosphere || "", placeholder: "Sons, cores, cheiro, clima, iluminação..." }
      ],
      onSubmit: async values => {
        await window.AteroProjectData.saveLocation({
          ...(locationRecord || {}),
          id: locationRecord?.id || window.AteroWriteCore.createId("location"),
          projectId: app.project.id,
          ...values,
          createdAt: locationRecord?.createdAt || new Date().toISOString()
        });
        await app.touchProject();
        app.toast(locationRecord ? "Lugar atualizado." : "Lugar criado.");
        app.renderCurrentSection();
      }
    });
  }

  modules.locations = {
    create(app) { openLocationDialog(app); },

    async render(app, container) {
      const locations = window.AteroProjectData.getLocationsSync(app.project.id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      app.setSectionAction("Novo lugar", () => openLocationDialog(app));

      if (!locations.length) {
        container.innerHTML = app.emptyState({ icon: "pin", title: "Nenhum lugar", text: "Crie fichas para cidades, planetas, edifícios e qualquer cenário importante.", action: "Adicionar lugar" });
        container.querySelector("[data-empty-action]")?.addEventListener("click", () => openLocationDialog(app));
        return;
      }

      container.innerHTML = `<div class="location-grid">${locations.map(locationRecord => `
        <article class="location-card" data-location-id="${app.escapeHTML(locationRecord.id)}">
          <div class="location-card-icon">${app.icon("pin")}</div>
          <span class="entity-badge">${app.escapeHTML(locationRecord.importance)}</span>
          <h3>${app.escapeHTML(locationRecord.name)}</h3>
          <p class="location-kind">${app.escapeHTML(locationRecord.kind || "Lugar")}</p>
          <p>${app.escapeHTML(locationRecord.description || "Adicione uma descrição para este lugar.")}</p>
          ${locationRecord.atmosphere ? `<div class="location-atmosphere"><strong>Atmosfera</strong><span>${app.escapeHTML(locationRecord.atmosphere)}</span></div>` : ""}
          <div class="entity-card-actions"><button type="button" data-edit>${app.icon("edit")} Editar</button><button type="button" data-delete class="danger-icon">${app.icon("trash")}</button></div>
        </article>`).join("")}</div>`;

      container.querySelectorAll("[data-location-id]").forEach(card => {
        const record = locations.find(item => item.id === card.dataset.locationId);
        card.querySelector("[data-edit]")?.addEventListener("click", () => openLocationDialog(app, record));
        card.querySelector("[data-delete]")?.addEventListener("click", async () => {
          if (!window.confirm(`Excluir “${record.name}”?`)) return;
          await window.AteroProjectData.deleteLocation(record.id);
          await app.touchProject();
          app.toast("Lugar excluído.");
          app.renderCurrentSection();
        });
      });
    }
  };
})();
