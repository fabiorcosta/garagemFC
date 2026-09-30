/** Itens de exemplo do seed (desenvolvimento). Também usados para removê-los com segurança da produção. */
export type SeedItem = {
  title: string
  description: string
  price: number
  originalPrice?: number
  condition: string
  status?: "disponivel" | "reservado" | "vendido"
  acceptsOffers?: boolean
  featured?: boolean
  category: string
}

export const SAMPLE_ITEMS: SeedItem[] = [
  {
    title: "Sofá retrátil 3 lugares cinza",
    description: "Sofá retrátil e reclinável, tecido suede cinza, 2,30 m. Muito confortável, sem rasgos. Desmonta para transporte.",
    price: 1800,
    originalPrice: 2400,
    condition: "Ótimo estado",
    featured: true,
    acceptsOffers: true,
    category: "Sofás e Poltronas",
  },
  {
    title: "Poltrona do papai em couro",
    description: "Poltrona reclinável em couro sintético marrom. Mecanismo funcionando perfeitamente.",
    price: 650,
    condition: "Bom estado",
    category: "Sofás e Poltronas",
  },
  {
    title: "Smart TV Samsung 55\" 4K",
    description: "TV Samsung Crystal UHD 55 polegadas, 2023. Acompanha controle, suporte de parede e caixa original.",
    price: 2100,
    originalPrice: 2600,
    condition: "Seminovo",
    featured: true,
    category: "Eletrônicos",
  },
  {
    title: "Soundbar JBL Bar 2.1",
    description: "Soundbar com subwoofer sem fio. Bluetooth e HDMI ARC. Som excelente.",
    price: 900,
    condition: "Ótimo estado",
    status: "reservado",
    category: "Eletrônicos",
  },
  {
    title: "Geladeira Brastemp Frost Free 400L",
    description: "Geladeira duplex inox, frost free, 400 litros. Funcionando perfeitamente, sem amassados.",
    price: 2300,
    condition: "Bom estado",
    featured: true,
    acceptsOffers: true,
    category: "Eletrodomésticos",
  },
  {
    title: "Máquina de lavar Electrolux 12kg",
    description: "Lavadora top load 12 kg com cesto inox. Uso de 3 anos, nunca deu problema.",
    price: 1100,
    condition: "Bom estado",
    status: "vendido",
    category: "Eletrodomésticos",
  },
  {
    title: "Micro-ondas Panasonic 32L",
    description: "Micro-ondas inox 32 litros, painel digital. Limpo e funcionando.",
    price: 350,
    originalPrice: 450,
    condition: "Seminovo",
    category: "Eletrodomésticos",
  },
  {
    title: "Mesa de jantar 6 lugares madeira maciça",
    description: "Mesa em madeira maciça (1,80 x 0,90 m) com 6 cadeiras estofadas. Pequenas marcas de uso no tampo.",
    price: 2500,
    condition: "Com marcas de uso",
    featured: true,
    acceptsOffers: true,
    category: "Móveis",
  },
  {
    title: "Rack para sala com painel",
    description: "Rack 1,80 m com painel para TV até 65\". Cor off-white com freijó.",
    price: 480,
    condition: "Bom estado",
    status: "reservado",
    category: "Móveis",
  },
  {
    title: "Cama box queen com colchão",
    description: "Cama box queen size com colchão de molas ensacadas. Sempre usado com protetor.",
    price: 1200,
    condition: "Ótimo estado",
    status: "vendido",
    category: "Cama/Mesa/Banho",
  },
  {
    title: "Jogo de toalhas 100% algodão (8 peças)",
    description: "Kit com 4 toalhas de banho e 4 de rosto, cor areia. Usadas poucas vezes.",
    price: 120,
    condition: "Seminovo",
    category: "Cama/Mesa/Banho",
  },
  {
    title: "Bicicleta aro 29 Caloi",
    description: "Mountain bike aro 29, 21 marchas, freio a disco. Revisada recentemente.",
    price: 950,
    originalPrice: 1200,
    condition: "Bom estado",
    category: "Diversos",
  },
]
