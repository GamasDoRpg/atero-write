"use strict";

(() => {
  const registry = window.AteroProjectModels ||= { items: [], register(model) { this.items.push(model); }, resolve(type) { return this.items.find(model => model.matches?.includes(type)) || this.items.find(model => model.id === "vazio"); } };
  registry.register({
    id: "artigo",
    matches: ["Artigo", "Pesquisa", "Ensaio", "Trabalho acadêmico", "Documentação"],
    label: "Projeto editorial",
    icon: "A",
    accent: "#e63946",
    description: "Estruture textos, notas e materiais de apoio sem perder o foco.",
    sections: [
      { id: "overview", label: "Visão geral", module: "overview", icon: "home" },
      { id: "draft", label: "Texto principal", module: "documents", icon: "document", documentKind: "article", documentLabel: "Documento" },
      { id: "notes", label: "Notas", module: "notes", icon: "note" },
      { id: "research", label: "Pesquisa", module: "placeholder", icon: "research", future: true },
      { id: "files", label: "Arquivos", module: "placeholder", icon: "folder", future: true }
    ]
  });
})();
