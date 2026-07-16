"use strict";

(() => {
  const registry = window.AteroProjectModels ||= {
    items: [],
    register(model) { this.items.push(model); },
    resolve(type) {
      return this.items.find(model => model.matches?.includes(type))
        || this.items.find(model => model.id === "vazio");
    }
  };

  registry.register({
    id: "livro",
    matches: ["Livro", "Coletânea", "Diário"],
    label: "Projeto de livro",
    icon: "L",
    accent: "#e63946",
    description: "Organize manuscrito, personagens, lugares e a cronologia da obra.",
    sections: [
      { id: "overview", label: "Visão geral", module: "overview", icon: "home" },
      { id: "manuscript", label: "Manuscrito", module: "documents", icon: "document", documentKind: "chapter", documentLabel: "Capítulo" },
      { id: "characters", label: "Personagens", module: "characters", icon: "people" },
      { id: "timeline", label: "Linha do tempo", module: "timeline", icon: "timeline" },
      { id: "locations", label: "Lugares", module: "locations", icon: "pin" },
      { id: "notes", label: "Notas", module: "notes", icon: "note" },
      { id: "research", label: "Pesquisa", module: "placeholder", icon: "research", future: true },
      { id: "files", label: "Arquivos", module: "placeholder", icon: "folder", future: true }
    ]
  });
})();
