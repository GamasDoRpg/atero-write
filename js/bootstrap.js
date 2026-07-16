import {
  exigirAplicativoAtero
} from "./access-guard.js";

import {
  iniciarAplicativo
} from "./app.js";


async function iniciar() {
  const acesso =
    await exigirAplicativoAtero({
      appId: "write",
      nomeFallback: "Atero Write"
    });

  if (!acesso) {
    return;
  }

  iniciarAplicativo({
    usuario: acesso.user,
    aplicativo: acesso.app
  });
}


iniciar();
