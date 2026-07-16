"use strict";

(() => {
  const registry = window.AteroProjectModels ||= { items: [], register(model) { this.items.push(model); }, resolve(type) { return this.items.find(model => model.matches?.includes(type)) || this.items.find(model => model.id === "vazio"); } };
  registry.register({
    id: "roteiro",
    matches: ["Roteiro"],
    label: "Projeto de roteiro",
    icon: "R",
    accent: "#e63946",
    description: "Desenvolva o roteiro, elenco, cenas e continuidade em um só lugar.",
    sections: [
      { id: "overview", label: "Visão geral", module: "overview", icon: "home" },
      { id: "screenplay", label: "Roteiro", module: "documents", icon: "document", documentKind: "screenplay", documentLabel: "Roteiro", screenplay: true },
      { id: "characters", label: "Personagens", module: "characters", icon: "people" },
      { id: "timeline", label: "Linha do tempo", module: "timeline", icon: "timeline" },
      { id: "locations", label: "Locações", module: "locations", icon: "pin" },
      { id: "notes", label: "Notas", module: "notes", icon: "note" },
      { id: "research", label: "Pesquisa", module: "placeholder", icon: "research", future: true },
      { id: "files", label: "Arquivos", module: "placeholder", icon: "folder", future: true }
    ]
  });
})();
