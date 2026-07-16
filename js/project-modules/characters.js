"use strict";

(() => {
  const modules = window.AteroProjectModules ||= {};

  function openCharacterDialog(app, character = null) {
    app.openFormDialog({
      eyebrow: character ? "PERSONAGEM" : "NOVA FICHA",
      title: character ? "Editar personagem" : "Criar personagem",
      submitLabel: character ? "Salvar alterações" : "Criar personagem",
      fields: [
        { name: "name", label: "Nome", type: "text", required: true, maxLength: 120, value: character?.name || "" },
        { name: "role", label: "Papel na história", type: "text", maxLength: 120, value: character?.role || "" },
        { name: "age", label: "Idade", type: "text", maxLength: 40, value: character?.age || "" },
        { name: "pronouns", label: "Pronomes", type: "text", maxLength: 60, value: character?.pronouns || "" },
        { name: "status", label: "Status", type: "select", value: character?.status || "Ativo", options: ["Ativo", "Secundário", "Mencionado", "Ausente", "Morto", "Indefinido"] },
        { name: "color", label: "Cor da ficha", type: "color", value: character?.color || "#e63946" },
        { name: "description", label: "Descrição", type: "textarea", full: true, value: character?.description || "", placeholder: "Aparência, personalidade, objetivo, conflito..." },
        { name: "notes", label: "Notas privadas", type: "textarea", full: true, value: character?.notes || "", placeholder: "Informações de desenvolvimento que não precisam aparecer no texto." }
      ],
      onSubmit: async values => {
        await window.AteroProjectData.saveCharacter({
          ...(character || {}),
          id: character?.id || window.AteroWriteCore.createId("character"),
          projectId: app.project.id,
          ...values,
          createdAt: character?.createdAt || new Date().toISOString()
        });
        await app.touchProject();
        app.toast(character ? "Personagem atualizado." : "Personagem criado.");
        app.renderCurrentSection();
      }
    });
  }

  modules.characters = {
    create(app) {
      openCharacterDialog(app);
    },

    async render(app, container) {
      const characters = window.AteroProjectData.getCharactersSync(app.project.id)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      app.setSectionAction("Novo personagem", () => openCharacterDialog(app));

      if (!characters.length) {
        container.innerHTML = app.emptyState({
          icon: "people",
          title: "Nenhum personagem",
          text: "Crie fichas estruturadas para manter personalidade, papel e informações importantes consistentes.",
          action: "Criar personagem"
        });
        container.querySelector("[data-empty-action]")?.addEventListener("click", () => openCharacterDialog(app));
        return;
      }

      container.innerHTML = `
        <div class="entity-toolbar">
          <label class="entity-search">${app.icon("search")}<input type="search" placeholder="Buscar personagem" aria-label="Buscar personagem"></label>
          <span>${characters.length} ${characters.length === 1 ? "personagem" : "personagens"}</span>
        </div>
        <div class="character-grid">
          ${characters.map(character => `
            <article class="character-card" data-character-id="${app.escapeHTML(character.id)}" data-search="${app.escapeHTML(`${character.name} ${character.role} ${character.description}`.toLocaleLowerCase("pt-BR"))}">
              <div class="character-card-accent" style="--character-color:${app.escapeHTML(character.color)}"></div>
              <div class="character-card-top">
                <span class="character-avatar" style="--character-color:${app.escapeHTML(character.color)}">${app.escapeHTML(character.name.slice(0, 1).toUpperCase())}</span>
                <span class="entity-badge">${app.escapeHTML(character.status)}</span>
              </div>
              <h3>${app.escapeHTML(character.name)}</h3>
              <p class="character-role">${app.escapeHTML(character.role || "Papel ainda não definido")}</p>
              <p class="character-description">${app.escapeHTML(character.description || "Adicione uma descrição para este personagem.")}</p>
              <div class="character-meta">
                ${character.age ? `<span>${app.icon("calendar")} ${app.escapeHTML(character.age)}</span>` : ""}
                ${character.pronouns ? `<span>${app.escapeHTML(character.pronouns)}</span>` : ""}
              </div>
              <div class="entity-card-actions">
                <button type="button" data-edit>${app.icon("edit")} Editar</button>
                <button type="button" data-delete class="danger-icon" title="Excluir">${app.icon("trash")}</button>
              </div>
            </article>`).join("")}
        </div>`;

      const search = container.querySelector("input[type='search']");
      search?.addEventListener("input", () => {
        const query = search.value.trim().toLocaleLowerCase("pt-BR");
        container.querySelectorAll("[data-character-id]").forEach(card => {
          card.hidden = query && !card.dataset.search.includes(query);
        });
      });

      container.querySelectorAll("[data-character-id]").forEach(card => {
        const character = characters.find(item => item.id === card.dataset.characterId);
        card.querySelector("[data-edit]")?.addEventListener("click", () => openCharacterDialog(app, character));
        card.querySelector("[data-delete]")?.addEventListener("click", async () => {
          if (!window.confirm(`Excluir a ficha de “${character.name}”?`)) return;
          await window.AteroProjectData.deleteCharacter(character.id);
          await app.touchProject();
          app.toast("Personagem excluído.");
          app.renderCurrentSection();
        });
      });
    }
  };
})();
