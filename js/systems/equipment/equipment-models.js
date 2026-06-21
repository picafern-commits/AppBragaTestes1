(function () {
  "use strict";

  const TYPES = {
    impressora: {
      label: "Impressora",
      plural: "Impressoras",
      collection: "impressoras",
      fallbackCollections: ["printers"],
      page: "impressoras.html",
      titleFields: ["modelo", "model", "nome", "name", "serie", "serial", "ip"],
      subtitleFields: ["localizacao", "location", "armazem", "serie", "serial", "ip"],
      primaryFields: [
        ["Modelo", "modelo", "model", "name"],
        ["Serie", "serie", "serial"],
        ["Armazem", "armazem"],
        ["Localizacao", "localizacao", "location"],
        ["IP", "ip"],
        ["Estado", "estado", "status"]
      ],
      history: [
        { label: "Manutencoes", collection: "manutencoes", fields: ["serie", "numeroSerie", "ip", "modelo"], compare: ["serie", "serial", "ip", "modelo"] },
        { label: "Historico de toners", collection: "historico", fields: ["equipamento", "localizacao"], compare: ["modelo", "model", "localizacao"] }
      ],
      actions: [
        { label: "Abrir impressoras", href: "impressoras.html" },
        { label: "Nova manutencao", href: "manutencao-impressoras.html" }
      ]
    },
    computador: {
      label: "Computador",
      plural: "Computadores",
      collection: "computadores",
      fallbackCollections: ["pcs"],
      page: "computadores.html",
      titleFields: ["nome", "hostname", "nomePC", "name"],
      subtitleFields: ["user", "utilizador", "localizacao", "ip", "serie"],
      primaryFields: [
        ["Nome", "nome", "hostname", "nomePC", "name"],
        ["User", "user", "utilizador"],
        ["IP", "ip"],
        ["Serie", "serie", "serial"],
        ["Localizacao", "localizacao"],
        ["Data", "data", "createdAt"]
      ],
      history: [
        { label: "Auditoria", collection: "auditLogs", fields: ["path", "payload"], compare: ["nome", "hostname", "nomePC"] }
      ],
      actions: [
        { label: "Abrir computadores", href: "computadores.html" }
      ]
    },
    user: {
      label: "User",
      plural: "Users",
      collection: "users",
      page: "users.html",
      titleFields: ["nome", "name", "email_bragalis", "user_mo365"],
      subtitleFields: ["zona", "user_pc_eye", "nome_pc", "email_bragalis"],
      privateFields: ["pass_remote", "pass_eye_peak", "pass_pistola", "pw_mo365", "pass_bragalis", "password"],
      primaryFields: [
        ["Nome", "nome", "name"],
        ["Zona", "zona"],
        ["User PC/EYE", "user_pc_eye"],
        ["Operador pistola", "op_pistola"],
        ["Nome PC", "nome_pc"],
        ["TeamViewer", "teamviewer"],
        ["User MO365", "user_mo365"],
        ["Email Bragalis", "email_bragalis"]
      ],
      history: [
        { label: "Radios atribuidos", collection: "radios", fields: ["user", "assignedTo", "currentUserName"], compare: ["nome", "name", "user_mo365", "email_bragalis"] },
        { label: "Historico radios", collection: "radioHistory", fields: ["userName", "userId", "obs"], compare: ["nome", "name", "user_mo365"] }
      ],
      actions: [
        { label: "Abrir users", href: "users.html" },
        { label: "Radios", href: "radios.html" }
      ]
    },
    pistola: {
      label: "Pistola CK65",
      plural: "Pistolas CK65",
      collection: "pistolas",
      page: "pistolas.html",
      titleFields: ["nome", "num", "sn", "serial"],
      subtitleFields: ["operador", "armazem", "mac", "cn"],
      privateFields: ["password", "pass"],
      primaryFields: [
        ["Numero", "num"],
        ["Nome", "nome"],
        ["CN", "cn"],
        ["SN", "sn", "serial"],
        ["MAC", "mac"],
        ["Operador", "operador"],
        ["Armazem", "armazem"],
        ["Prontas", "prontas"]
      ],
      history: [
        { label: "Users ligados", collection: "users", fields: ["op_pistola", "pass_pistola"], compare: ["operador", "nome", "num"] }
      ],
      actions: [
        { label: "Abrir pistolas", href: "pistolas.html" }
      ]
    },
    porta: {
      label: "Porta Rede",
      plural: "Portas Rede",
      collection: "portas",
      page: "portas.html",
      titleFields: ["porta", "nome", "id"],
      subtitleFields: ["local", "localizacao", "user", "equipamento", "ip"],
      primaryFields: [
        ["Porta", "porta", "nome"],
        ["Local", "local", "localizacao"],
        ["User", "user"],
        ["Equipamento", "equipamento"],
        ["IP", "ip"],
        ["Estado", "estado"]
      ],
      history: [
        { label: "Auditoria", collection: "auditLogs", fields: ["path", "payload"], compare: ["porta", "ip", "equipamento", "user"] }
      ],
      actions: [
        { label: "Abrir portas", href: "portas.html" }
      ]
    },
    radio: {
      label: "Radio",
      plural: "Radios",
      collection: "radios",
      page: "radios.html",
      titleFields: ["nome", "name", "mac", "serial"],
      subtitleFields: ["user", "currentUserName", "estado", "mac", "serial"],
      primaryFields: [
        ["Nome", "nome", "name"],
        ["MAC", "mac"],
        ["Numero de serie", "serial", "serie"],
        ["User atual", "user", "currentUserName", "assignedTo"],
        ["Estado", "estado", "status"]
      ],
      history: [
        { label: "Historico", collection: "radioHistory", fields: ["radioId", "radioName", "radioMac"], compare: ["id", "nome", "mac", "serial"] },
        { label: "Registos semanais", collection: "radioWeeklyRecords", fields: ["radios", "weekLabel"], compare: ["id", "nome", "mac", "serial"] }
      ],
      actions: [
        { label: "Abrir radios", href: "radios.html" }
      ]
    },
    stock: {
      label: "Toner",
      plural: "Stock",
      collection: "stock",
      page: "stock.html",
      titleFields: ["codigoEtiqueta", "equipamento", "sdsRef", "lote"],
      subtitleFields: ["cor", "localizacao", "data", "dataFolha"],
      primaryFields: [
        ["Codigo etiqueta", "codigoEtiqueta"],
        ["Equipamento", "equipamento"],
        ["Cor", "cor"],
        ["Localizacao", "localizacao"],
        ["Lote", "lote"],
        ["SDS Ref", "sdsRef"],
        ["Data scan", "data"],
        ["Data folha", "dataFolha"]
      ],
      history: [
        { label: "Historico relacionado", collection: "historico", fields: ["codigoEtiqueta", "equipamento", "sdsRef", "lote"], compare: ["codigoEtiqueta", "equipamento", "sdsRef", "lote"] }
      ],
      actions: [
        { label: "Abrir stock", href: "stock.html" },
        { label: "Adicionar toner", href: "add-toner.html" }
      ]
    }
  };

  window.AppBragaEquipmentModels = {
    types: TYPES,
    list: Object.entries(TYPES).map(([key, config]) => ({ key, ...config }))
  };
})();
