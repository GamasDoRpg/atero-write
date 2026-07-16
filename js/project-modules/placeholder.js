"use strict";

(() => {
  const modules = window.AteroProjectModules ||= {};
  modules.placeholder = {
    async render(app, container, section) {
      app.setSectionAction(null);
      container.innerHTML = `
        <section class="future-module-card">
          <span>${app.icon(section.icon || "folder")}</span>
          <div><span class="project-kicker">EM DESENVOLVIMENTO</span><h3>${app.escapeHTML(section.label)}</h3><p>Este módulo já faz parte da arquitetura do projeto, mas será implementado em uma próxima etapa.</p></div>
        </section>`;
    }
  };
})();
