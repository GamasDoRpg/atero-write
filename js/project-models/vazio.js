"use strict";

(() => {
  const registry = window.AteroProjectModels ||= { items: [], register(model) { this.items.push(model); }, resolve(type) { return this.items.find(model => model.matches?.includes(type)) || this.items.find(model => model.id === "vazio"); } };
  registry.register({
    id: "vazio",
    matches: ["Vazio"],
    label: "Projeto livre",
    icon: "P",
    accent: "#e63946",
    description: "Um espaço flexível para documentos e notas.",
    sections: [
      { id: "overview", label: "Visão geral", module: "overview", icon: "home" },
      { id: "documents", label: "Documentos", module: "documents", icon: "document", documentKind: "document", documentLabel: "Documento" },
      { id: "notes", label: "Notas", module: "notes", icon: "note" },
      { id: "files", label: "Arquivos", module: "placeholder", icon: "folder", future: true }
    ]
  });
})();
