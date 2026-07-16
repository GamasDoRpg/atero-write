const ATERO_API_URL =
  "https://api.atero.space";

const ATERO_AUTH_BRIDGE_URL =
  "https://atero.space/auth-bridge.html";

const ATERO_HUB_APPS_URL =
  "https://atero.space/selecionar-apps.html";


function criarUrlDaPonte() {
  const url =
    new URL(
      ATERO_AUTH_BRIDGE_URL
    );

  url.searchParams.set(
    "return_to",
    window.location.href
  );

  return url.href;
}


function escaparHtml(valor) {
  const elemento =
    document.createElement("div");

  elemento.textContent =
    String(valor || "");

  return elemento.innerHTML;
}


function substituirPagina({
  estado,
  titulo,
  mensagem,
  acaoHtml = ""
}) {
  document.documentElement.dataset
    .accessState = estado;

  document.body.innerHTML = `
    <main class="atero-access-screen">
      <div class="atero-access-mark"></div>

      <h1>${escaparHtml(titulo)}</h1>

      <p>${escaparHtml(mensagem)}</p>

      ${acaoHtml}
    </main>
  `;
}


function mostrarAcessoNegado(
  nomeAplicativo
) {
  substituirPagina({
    estado: "denied",
    titulo: "Aplicativo não ativado",

    mensagem:
      `${nomeAplicativo} não está ativo ` +
      "na sua Conta Atero.",

    acaoHtml: `
      <a
        class="atero-access-action"
        href="${ATERO_HUB_APPS_URL}"
      >
        Gerenciar aplicativos
      </a>
    `
  });
}


function mostrarAplicativoIndisponivel() {
  substituirPagina({
    estado: "unavailable",
    titulo: "Aplicativo indisponível",

    mensagem:
      "Este aplicativo não existe ou está temporariamente desativado.",

    acaoHtml: `
      <a
        class="atero-access-action"
        href="https://atero.space"
      >
        Voltar ao Atero Hub
      </a>
    `
  });
}


function mostrarErroDeServico() {
  substituirPagina({
    estado: "error",
    titulo: "Não foi possível verificar o acesso",

    mensagem:
      "A Atero API está temporariamente indisponível.",

    acaoHtml: `
      <button
        class="atero-access-action"
        type="button"
        onclick="window.location.reload()"
      >
        Tentar novamente
      </button>
    `
  });
}


/*
  Deve ser executado antes de inicializar o código
  principal de cada aplicativo.
*/
export async function exigirAplicativoAtero({
  appId,
  nomeFallback = "Este aplicativo"
}) {
  document.documentElement.dataset
    .accessState = "checking";

  try {
    const resposta =
      await fetch(
        `${ATERO_API_URL}/access/${
          encodeURIComponent(appId)
        }`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",

          headers: {
            "Accept": "application/json"
          }
        }
      );

    if (resposta.status === 401) {
      window.location.replace(
        criarUrlDaPonte()
      );

      return null;
    }

    const dados =
      await resposta.json()
        .catch(() => null);

    if (resposta.status === 403) {
      mostrarAcessoNegado(
        dados?.detail?.app_name ||
        nomeFallback
      );

      return null;
    }

    if (resposta.status === 404) {
      mostrarAplicativoIndisponivel();
      return null;
    }

    if (!resposta.ok) {
      mostrarErroDeServico();
      return null;
    }

    if (!dados?.authorized) {
      mostrarAcessoNegado(
        dados?.app?.name ||
        nomeFallback
      );

      return null;
    }

    document.documentElement.dataset
      .accessState = "authorized";

    return dados;
  } catch (erro) {
    console.error(
      "Erro ao verificar acesso:",
      erro
    );

    mostrarErroDeServico();

    return null;
  }
}
