/**
 * Textos editáveis pelo admin (Configurações). Ficam em SiteSettings.texts (JSON);
 * campo vazio = usa o padrão daqui. Variáveis entre chaves são trocadas na hora: {item}, {link}, {data}, {dias}.
 */
export type TextDef = { label: string; default: string; group: TextGroup; multiline?: boolean; max: number; hint?: string }

export const TEXT_GROUPS = {
  inicio: "Página inicial",
  catalogo: "Catálogo",
  item: "Página do item",
  retirada: "Página de retirada",
  whatsapp: "Mensagens do WhatsApp",
  geral: "Rodapé e Google",
} as const
export type TextGroup = keyof typeof TEXT_GROUPS

export const TEXTS = {
  // Página inicial
  countdown: { group: "inicio", label: "Contagem regressiva", default: "Faltam {dias} dias", max: 60, hint: "{dias} = número de dias" },
  countdownLastDay: { group: "inicio", label: "Contagem no último dia", default: "Último dia!", max: 60 },
  heroCta: { group: "inicio", label: "Botão do banner", default: "Ver todos os itens", max: 40 },
  statAvailable: { group: "inicio", label: "Rótulo: disponíveis", default: "Disponíveis", max: 30 },
  statReserved: { group: "inicio", label: "Rótulo: reservados", default: "Reservados", max: 30 },
  statSold: { group: "inicio", label: "Rótulo: vendidos", default: "Vendidos", max: 30 },
  featuredTitle: { group: "inicio", label: "Título dos destaques", default: "Destaques", max: 40 },
  categoriesTitle: { group: "inicio", label: "Título das categorias", default: "Categorias", max: 40 },

  // Catálogo
  catalogTitle: { group: "catalogo", label: "Título do catálogo", default: "Todos os itens", max: 60 },
  searchPlaceholder: { group: "catalogo", label: "Texto dentro da busca", default: "Buscar sofá, TV, geladeira…", max: 60 },
  emptyTitle: { group: "catalogo", label: "Busca sem resultado: título", default: "Nenhum item encontrado", max: 60 },
  emptyText: { group: "catalogo", label: "Busca sem resultado: texto", default: "Tente outra busca ou remova alguns filtros.", max: 160 },

  // Página do item
  whatsappButton: { group: "item", label: "Botão do WhatsApp", default: "Chamar no WhatsApp", max: 40 },
  contactTitle: { group: "item", label: "Título do formulário", default: "Tenho interesse", max: 60 },
  contactMessage: { group: "item", label: "Mensagem sugerida no formulário", default: 'Olá! Tenho interesse no item "{item}".', max: 300, hint: "{item} = nome do item" },
  contactSuccess: { group: "item", label: "Confirmação de envio", default: "Mensagem enviada! O Fabio vai entrar em contato em breve.", max: 200 },
  soldMessage: { group: "item", label: "Aviso de item vendido", default: "Este item já foi vendido. Dá uma olhada nos outros itens disponíveis!", max: 200, multiline: true },
  reservedMessage: { group: "item", label: "Aviso de item reservado", default: "Este item está reservado para outra pessoa. Se a reserva cair, ele volta a ficar disponível aqui.", max: 200, multiline: true },
  pickupNote: { group: "item", label: "Linha de retirada", default: "Retirada em {local}.", max: 120, hint: "{local} = bairro ou cidade" },

  // Página de retirada
  pickupTitle: { group: "retirada", label: "Título da página", default: "Retirada e pagamento", max: 60 },
  pickupIntro: { group: "retirada", label: "Subtítulo", default: "Tudo o que você precisa saber antes de buscar seu item.", max: 200 },
  pickupDeadline: { group: "retirada", label: "Aviso de prazo", default: "A venda termina em {data}. Depois dessa data não será possível retirar itens.", max: 200, multiline: true, hint: "{data} = data final da venda" },
  pickupAddress: { group: "retirada", label: "Endereço completo (opcional)", default: "", max: 200, hint: "Se preencher, aparece na página. Vazio = só bairro e cidade" },
  pickupHours: { group: "retirada", label: "Horários de retirada (opcional)", default: "", max: 200, multiline: true, hint: "Ex: seg a sex, 18h às 21h · sáb, 9h às 13h" },
  pickupMapUrl: { group: "retirada", label: "Link do Google Maps (opcional)", default: "", max: 500, hint: "Mostra um botão \"Abrir no mapa\"" },
  pickupWhereTitle: { group: "retirada", label: "Título: onde retirar", default: "Onde retirar", max: 40 },
  pickupAddressNote: { group: "retirada", label: "Observação do endereço", default: "O endereço completo é enviado pelo WhatsApp depois que a compra for combinada.", max: 200, multiline: true },
  pickupPayTitle: { group: "retirada", label: "Título: como pagar", default: "Como pagar", max: 40 },
  pickupRulesTitle: { group: "retirada", label: "Título: regras", default: "Regras", max: 40 },
  pickupButton: { group: "retirada", label: "Botão do WhatsApp", default: "Combinar retirada pelo WhatsApp", max: 50 },

  // WhatsApp
  whatsappItemMessage: { group: "whatsapp", label: "Mensagem ao clicar num item", default: "Olá! Tenho interesse no item: {item}. Vi no site {link}", max: 300, multiline: true, hint: "{item} = nome, {link} = link do item" },
  whatsappPickupMessage: { group: "whatsapp", label: "Mensagem da página de retirada", default: "Olá! Quero combinar a retirada de um item da Garagem do Fabio.", max: 300, multiline: true },
  whatsappReplyMessage: { group: "whatsapp", label: "Sua resposta às mensagens (admin)", default: "Olá {nome}! Aqui é o Fabio, da Garagem.", max: 300, multiline: true, hint: "{nome} = nome de quem escreveu" },

  // Rodapé e Google
  footerText: { group: "geral", label: "Texto do rodapé", default: "{site} · venda de mudança · pagamento e retirada combinados pelo WhatsApp", max: 200, hint: "{site} = título do site" },
  conditions: { group: "geral", label: "Opções de condição dos itens (uma por linha)", default: "Novo\nSeminovo\nÓtimo estado\nBom estado\nCom marcas de uso\nPrecisa de reparo", max: 600, multiline: true, hint: "Aparecem na lista ao cadastrar um item" },
  seoDescription: { group: "geral", label: "Descrição no Google e no WhatsApp", default: "Venda de móveis, eletrônicos e eletrodomésticos por mudança. Retirada no local.", max: 200, multiline: true },
} satisfies Record<string, TextDef>

export type TextKey = keyof typeof TEXTS
export type SiteTexts = Record<TextKey, string>

export function resolveTexts(stored: unknown): SiteTexts {
  const saved = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>
  const out = {} as SiteTexts
  for (const key of Object.keys(TEXTS) as TextKey[]) {
    const v = saved[key]
    out[key] = typeof v === "string" && v.trim() ? v : TEXTS[key].default
  }
  return out
}

/** Troca {variavel} pelos valores; variáveis sem valor somem. */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : ""))
}
