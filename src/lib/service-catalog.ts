export type ServiceAudience = "VEHICLE" | "REAL_ESTATE" | "BEAUTY" | "TECHNOLOGY" | "PETS";

export type ServiceCategoryOption = {
  slug: string;
  name: string;
  group: string;
  icon: string;
  audience: ServiceAudience;
};

export const serviceAudiences: Array<{ value: ServiceAudience; label: string }> = [
  { value: "VEHICLE", label: "Serviços para Veículos" },
  { value: "REAL_ESTATE", label: "Serviços para Imóveis" },
  { value: "BEAUTY", label: "Beleza & Estética" },
  { value: "TECHNOLOGY", label: "Tecnologia & Inovação" },
  { value: "PETS", label: "Pets" }
];

export const defaultServiceCategories: ServiceCategoryOption[] = [
  { slug: "mecanico-automotivo", name: "Mecânico Automotivo", group: "Mecânica e Manutenção", icon: "gauge", audience: "VEHICLE" },
  { slug: "centro-automotivo", name: "Centro Automotivo", group: "Mecânica e Manutenção", icon: "car", audience: "VEHICLE" },
  { slug: "troca-oleo", name: "Troca de Óleo", group: "Mecânica e Manutenção", icon: "droplet", audience: "VEHICLE" },
  { slug: "alinhamento-balanceamento", name: "Alinhamento e Balanceamento", group: "Pneus e Rodas", icon: "circle-dot", audience: "VEHICLE" },
  { slug: "auto-eletrica", name: "Auto Elétrica", group: "Elétrica e Eletrônica", icon: "battery-charging", audience: "VEHICLE" },
  { slug: "chaveiro-automotivo", name: "Chaveiro Automotivo", group: "Elétrica e Eletrônica", icon: "key-round", audience: "VEHICLE" },
  { slug: "borracharia", name: "Borracharia", group: "Pneus e Rodas", icon: "disc-3", audience: "VEHICLE" },
  { slug: "funilaria-pintura", name: "Funilaria e Pintura", group: "Funilaria e Estética", icon: "paintbrush", audience: "VEHICLE" },
  { slug: "martelinho-ouro", name: "Martelinho de Ouro", group: "Funilaria e Estética", icon: "hammer", audience: "VEHICLE" },
  { slug: "insulfilm", name: "Insulfilm", group: "Funilaria e Estética", icon: "shield", audience: "VEHICLE" },
  { slug: "lava-rapido", name: "Lava Rápido", group: "Funilaria e Estética", icon: "sparkles", audience: "VEHICLE" },
  { slug: "ar-condicionado-automotivo", name: "Ar-Condicionado Automotivo", group: "Conforto", icon: "snowflake", audience: "VEHICLE" },
  { slug: "som-automotivo", name: "Som Automotivo", group: "Conforto", icon: "cable", audience: "VEHICLE" },
  { slug: "autopecas", name: "Autopeças", group: "Peças e Acessórios", icon: "settings", audience: "VEHICLE" },
  { slug: "guincho", name: "Guincho", group: "Socorro e Emergência", icon: "truck", audience: "VEHICLE" },
  { slug: "despachante-veicular", name: "Despachante Veicular", group: "Documentação", icon: "file-text", audience: "VEHICLE" },
  { slug: "vistoria-veicular", name: "Vistoria Veicular", group: "Documentação", icon: "clipboard-check", audience: "VEHICLE" },
  { slug: "auto-escola", name: "Auto Escola", group: "Documentação", icon: "clipboard-check", audience: "VEHICLE" },
  { slug: "oficina-motos", name: "Oficina de Motos", group: "Motocicletas", icon: "bike", audience: "VEHICLE" },
  { slug: "fretes-veiculos", name: "Fretes", group: "Fretes e Entregas", icon: "truck", audience: "VEHICLE" },
  { slug: "carretos", name: "Carretos", group: "Fretes e Entregas", icon: "package-open", audience: "VEHICLE" },
  { slug: "mudancas-veiculos", name: "Mudanças", group: "Fretes e Entregas", icon: "truck", audience: "VEHICLE" },
  { slug: "moto-frete", name: "Moto Frete", group: "Fretes e Entregas", icon: "bike", audience: "VEHICLE" },
  { slug: "entregador-motoboy", name: "Entregador / Motoboy", group: "Fretes e Entregas", icon: "bike", audience: "VEHICLE" },

  { slug: "corretor-imoveis", name: "Corretor de Imóveis", group: "Compra, Venda e Locação", icon: "house", audience: "REAL_ESTATE" },
  { slug: "imobiliaria", name: "Imobiliária", group: "Compra, Venda e Locação", icon: "building", audience: "REAL_ESTATE" },
  { slug: "avaliador-imoveis", name: "Avaliador de Imóveis", group: "Compra, Venda e Locação", icon: "clipboard-check", audience: "REAL_ESTATE" },
  { slug: "advogado-imobiliario", name: "Advogado Imobiliário", group: "Jurídico", icon: "scale", audience: "REAL_ESTATE" },
  { slug: "regularizacao-imoveis", name: "Regularização de Imóveis", group: "Documentação", icon: "file-check", audience: "REAL_ESTATE" },
  { slug: "pedreiro", name: "Pedreiro", group: "Construção", icon: "brick-wall", audience: "REAL_ESTATE" },
  { slug: "empreiteira", name: "Empreiteira", group: "Construção", icon: "hard-hat", audience: "REAL_ESTATE" },
  { slug: "eletricista", name: "Eletricista", group: "Instalações", icon: "zap", audience: "REAL_ESTATE" },
  { slug: "encanador", name: "Encanador", group: "Instalações", icon: "wrench", audience: "REAL_ESTATE" },
  { slug: "pintor", name: "Pintor", group: "Reforma e Acabamento", icon: "paint-roller", audience: "REAL_ESTATE" },
  { slug: "gesseiro", name: "Gesseiro", group: "Reforma e Acabamento", icon: "panel-top", audience: "REAL_ESTATE" },
  { slug: "marceneiro", name: "Marceneiro", group: "Móveis e Estruturas", icon: "sofa", audience: "REAL_ESTATE" },
  { slug: "montador-moveis", name: "Montador de Móveis", group: "Móveis e Estruturas", icon: "drill", audience: "REAL_ESTATE" },
  { slug: "serralheria", name: "Serralheria", group: "Móveis e Estruturas", icon: "drill", audience: "REAL_ESTATE" },
  { slug: "vidracaria", name: "Vidraçaria", group: "Móveis e Estruturas", icon: "square", audience: "REAL_ESTATE" },
  { slug: "jardineiro", name: "Jardineiro", group: "Área Externa", icon: "sprout", audience: "REAL_ESTATE" },
  { slug: "piscinas", name: "Limpeza de Piscinas", group: "Área Externa", icon: "waves", audience: "REAL_ESTATE" },
  { slug: "diarista", name: "Diarista", group: "Limpeza e Conservação", icon: "sparkles", audience: "REAL_ESTATE" },
  { slug: "faxina-residencial", name: "Faxina Residencial", group: "Limpeza e Conservação", icon: "sparkles", audience: "REAL_ESTATE" },
  { slug: "limpeza-pos-obra", name: "Limpeza Pós-Obra", group: "Limpeza e Conservação", icon: "sparkles", audience: "REAL_ESTATE" },
  { slug: "dedetizacao", name: "Dedetização", group: "Limpeza e Conservação", icon: "bug", audience: "REAL_ESTATE" },
  { slug: "ar-condicionado", name: "Ar-Condicionado", group: "Climatização", icon: "snowflake", audience: "REAL_ESTATE" },
  { slug: "energia-solar", name: "Instalador de Energia Solar", group: "Instalações", icon: "sun", audience: "REAL_ESTATE" },
  { slug: "seguranca-eletronica", name: "Segurança Eletrônica", group: "Instalações", icon: "shield", audience: "REAL_ESTATE" },
  { slug: "mudancas", name: "Mudanças", group: "Mudanças", icon: "package-open", audience: "REAL_ESTATE" },
  { slug: "fretes", name: "Fretes", group: "Mudanças", icon: "truck", audience: "REAL_ESTATE" },
  { slug: "fotografia-imobiliaria", name: "Fotografia Imobiliária", group: "Marketing Imobiliário", icon: "camera", audience: "REAL_ESTATE" },
  { slug: "sindico-profissional", name: "Síndico Profissional", group: "Condomínios", icon: "building-2", audience: "REAL_ESTATE" },

  { slug: "cabeleireiro", name: "Cabeleireiro(a)", group: "Cabelo", icon: "sparkles", audience: "BEAUTY" },
  { slug: "barbeiro", name: "Barbeiro(a)", group: "Cabelo", icon: "sparkles", audience: "BEAUTY" },
  { slug: "colorista", name: "Colorista", group: "Cabelo", icon: "paintbrush", audience: "BEAUTY" },
  { slug: "trancista", name: "Trancista", group: "Cabelo", icon: "sparkles", audience: "BEAUTY" },
  { slug: "mega-hair", name: "Especialista em Mega Hair", group: "Cabelo", icon: "sparkles", audience: "BEAUTY" },
  { slug: "alongamento-capilar", name: "Especialista em Alongamento Capilar", group: "Cabelo", icon: "sparkles", audience: "BEAUTY" },
  { slug: "visagista", name: "Visagista", group: "Cabelo", icon: "sparkles", audience: "BEAUTY" },
  { slug: "escovista", name: "Escovista", group: "Cabelo", icon: "sparkles", audience: "BEAUTY" },
  { slug: "manicure", name: "Manicure", group: "Unhas", icon: "sparkles", audience: "BEAUTY" },
  { slug: "pedicure", name: "Pedicure", group: "Unhas", icon: "sparkles", audience: "BEAUTY" },
  { slug: "nail-designer", name: "Nail Designer", group: "Unhas", icon: "sparkles", audience: "BEAUTY" },
  { slug: "unhas-gel", name: "Alongamento de Unhas em Gel", group: "Unhas", icon: "sparkles", audience: "BEAUTY" },
  { slug: "fibra-vidro", name: "Alongamento em Fibra de Vidro", group: "Unhas", icon: "sparkles", audience: "BEAUTY" },
  { slug: "blindagem-unhas", name: "Blindagem de Unhas", group: "Unhas", icon: "shield", audience: "BEAUTY" },
  { slug: "spa-pes", name: "Spa dos Pés", group: "Unhas", icon: "sparkles", audience: "BEAUTY" },
  { slug: "designer-sobrancelhas", name: "Designer de Sobrancelhas", group: "Sobrancelhas e Cílios", icon: "sparkles", audience: "BEAUTY" },
  { slug: "micropigmentador", name: "Micropigmentador(a)", group: "Sobrancelhas e Cílios", icon: "paintbrush", audience: "BEAUTY" },
  { slug: "lash-designer", name: "Lash Designer", group: "Sobrancelhas e Cílios", icon: "sparkles", audience: "BEAUTY" },
  { slug: "extensao-cilios", name: "Extensão de Cílios", group: "Sobrancelhas e Cílios", icon: "sparkles", audience: "BEAUTY" },
  { slug: "brow-lamination", name: "Brow Lamination", group: "Sobrancelhas e Cílios", icon: "sparkles", audience: "BEAUTY" },
  { slug: "henna-sobrancelhas", name: "Henna para Sobrancelhas", group: "Sobrancelhas e Cílios", icon: "paintbrush", audience: "BEAUTY" },
  { slug: "maquiador", name: "Maquiador(a)", group: "Maquiagem", icon: "paintbrush", audience: "BEAUTY" },
  { slug: "maquiagem-noivas", name: "Maquiagem para Noivas", group: "Maquiagem", icon: "paintbrush", audience: "BEAUTY" },
  { slug: "maquiagem-artistica", name: "Maquiagem Artística", group: "Maquiagem", icon: "paintbrush", audience: "BEAUTY" },
  { slug: "maquiagem-social", name: "Maquiagem Social", group: "Maquiagem", icon: "paintbrush", audience: "BEAUTY" },
  { slug: "consultor-imagem", name: "Consultor(a) de Imagem", group: "Imagem Pessoal", icon: "briefcase-business", audience: "BEAUTY" },
  { slug: "esteticista-facial", name: "Esteticista Facial", group: "Estética Facial", icon: "sparkles", audience: "BEAUTY" },
  { slug: "limpeza-pele", name: "Limpeza de Pele", group: "Estética Facial", icon: "sparkles", audience: "BEAUTY" },
  { slug: "peeling", name: "Peeling", group: "Estética Facial", icon: "sparkles", audience: "BEAUTY" },
  { slug: "drenagem-facial", name: "Drenagem Facial", group: "Estética Facial", icon: "sparkles", audience: "BEAUTY" },
  { slug: "tratamentos-antiacne", name: "Tratamentos Antiacne", group: "Estética Facial", icon: "sparkles", audience: "BEAUTY" },
  { slug: "rejuvenescimento-facial", name: "Rejuvenescimento Facial", group: "Estética Facial", icon: "sparkles", audience: "BEAUTY" },
  { slug: "esteticista-corporal", name: "Esteticista Corporal", group: "Estética Corporal", icon: "sparkles", audience: "BEAUTY" },
  { slug: "drenagem-linfatica", name: "Drenagem Linfática", group: "Estética Corporal", icon: "sparkles", audience: "BEAUTY" },
  { slug: "massagem-modeladora", name: "Massagem Modeladora", group: "Estética Corporal", icon: "sparkles", audience: "BEAUTY" },
  { slug: "massagem-relaxante", name: "Massagem Relaxante", group: "Massagens", icon: "sparkles", audience: "BEAUTY" },
  { slug: "massagem-terapeutica", name: "Massagem Terapêutica", group: "Massagens", icon: "sparkles", audience: "BEAUTY" },
  { slug: "massagem-desportiva", name: "Massagem Desportiva", group: "Massagens", icon: "sparkles", audience: "BEAUTY" },
  { slug: "shiatsu", name: "Shiatsu", group: "Massagens", icon: "sparkles", audience: "BEAUTY" },
  { slug: "reflexologia", name: "Reflexologia", group: "Massagens", icon: "sparkles", audience: "BEAUTY" },
  { slug: "bronzeamento-natural", name: "Bronzeamento Natural", group: "Bronzeamento", icon: "sun", audience: "BEAUTY" },
  { slug: "bronzeamento-jato", name: "Bronzeamento a Jato", group: "Bronzeamento", icon: "sun", audience: "BEAUTY" },
  { slug: "bronzeamento-fita", name: "Bronzeamento em Fita", group: "Bronzeamento", icon: "sun", audience: "BEAUTY" },
  { slug: "depilacao-cera", name: "Depilação com Cera", group: "Depilação", icon: "sparkles", audience: "BEAUTY" },
  { slug: "depilacao-egipcia", name: "Depilação Egípcia", group: "Depilação", icon: "sparkles", audience: "BEAUTY" },
  { slug: "depilacao-laser", name: "Depilação a Laser", group: "Depilação", icon: "zap", audience: "BEAUTY" },
  { slug: "designer-barba", name: "Designer de Barba", group: "Barba", icon: "sparkles", audience: "BEAUTY" },
  { slug: "spa-bem-estar", name: "Spa e Bem-Estar", group: "Bem-Estar", icon: "sparkles", audience: "BEAUTY" },
  { slug: "dia-noiva", name: "Dia da Noiva", group: "Eventos", icon: "sparkles", audience: "BEAUTY" },
  { slug: "dia-noivo", name: "Dia do Noivo", group: "Eventos", icon: "sparkles", audience: "BEAUTY" },
  { slug: "beleza-domicilio", name: "Beleza a Domicílio", group: "Eventos", icon: "house", audience: "BEAUTY" },
  { slug: "producao-festas", name: "Produção para Festas", group: "Eventos", icon: "sparkles", audience: "BEAUTY" },
  { slug: "producao-formaturas", name: "Produção para Formaturas", group: "Eventos", icon: "sparkles", audience: "BEAUTY" },

  { slug: "tecnico-informatica", name: "Técnico de Informática", group: "Suporte e Manutenção", icon: "settings", audience: "TECHNOLOGY" },
  { slug: "tecnico-celular", name: "Técnico de Celular", group: "Suporte e Manutenção", icon: "settings", audience: "TECHNOLOGY" },
  { slug: "redes-internet", name: "Redes e Internet", group: "Redes e Internet", icon: "cable", audience: "TECHNOLOGY" },
  { slug: "seguranca-eletronica-tech", name: "Segurança Eletrônica", group: "Segurança e Automação", icon: "shield", audience: "TECHNOLOGY" },
  { slug: "audio-video", name: "Áudio e Vídeo", group: "Áudio e Vídeo", icon: "camera", audience: "TECHNOLOGY" },
  { slug: "desenvolvimento-sites", name: "Desenvolvimento de Sites", group: "Desenvolvimento", icon: "briefcase-business", audience: "TECHNOLOGY" },
  { slug: "desenvolvimento-aplicativos", name: "Desenvolvimento de Aplicativos", group: "Desenvolvimento", icon: "briefcase-business", audience: "TECHNOLOGY" },
  { slug: "marketing-digital", name: "Marketing Digital", group: "Marketing e Conteúdo", icon: "sparkles", audience: "TECHNOLOGY" },
  { slug: "design-grafico", name: "Design Gráfico", group: "Marketing e Conteúdo", icon: "paintbrush", audience: "TECHNOLOGY" },
  { slug: "e-commerce", name: "E-commerce", group: "Negócios Digitais", icon: "package-open", audience: "TECHNOLOGY" },
  { slug: "inteligencia-artificial", name: "Inteligência Artificial", group: "Dados e IA", icon: "sparkles", audience: "TECHNOLOGY" },
  { slug: "consultoria-ti", name: "Consultoria em TI", group: "Consultoria", icon: "briefcase-business", audience: "TECHNOLOGY" },
  { slug: "automacao-residencial-comercial", name: "Automação Residencial e Comercial", group: "Segurança e Automação", icon: "settings", audience: "TECHNOLOGY" },
  { slug: "banco-dados", name: "Banco de Dados", group: "Dados e IA", icon: "briefcase-business", audience: "TECHNOLOGY" },
  { slug: "seguranca-informacao", name: "Segurança da Informação", group: "Segurança e Automação", icon: "shield", audience: "TECHNOLOGY" },
  { slug: "cloud-servidores", name: "Cloud e Servidores", group: "Infraestrutura", icon: "building-2", audience: "TECHNOLOGY" },
  { slug: "suporte-tecnico", name: "Suporte Técnico", group: "Suporte e Manutenção", icon: "wrench", audience: "TECHNOLOGY" },
  { slug: "treinamento-informatica", name: "Treinamento em Informática", group: "Treinamento", icon: "clipboard-check", audience: "TECHNOLOGY" },
  { slug: "producao-conteudo-digital", name: "Produção de Conteúdo Digital", group: "Marketing e Conteúdo", icon: "camera", audience: "TECHNOLOGY" },
  { slug: "analise-dados", name: "Análise de Dados", group: "Dados e IA", icon: "gauge", audience: "TECHNOLOGY" },

  { slug: "banho-tosa", name: "Banho e Tosa", group: "Cuidados Pet", icon: "sparkles", audience: "PETS" },
  { slug: "passeador-pets", name: "Passeador de Pets", group: "Cuidados Pet", icon: "map-pin", audience: "PETS" },
  { slug: "hospedagem-pet", name: "Hospedagem Pet", group: "Hospedagem e Cuidados", icon: "house", audience: "PETS" },
  { slug: "adestrador", name: "Adestrador", group: "Treinamento Pet", icon: "clipboard-check", audience: "PETS" },
  { slug: "cuidador-animais", name: "Cuidador de Animais", group: "Hospedagem e Cuidados", icon: "heart", audience: "PETS" }
];

export const serviceCatalog: Record<ServiceAudience, Array<{ group: string; services: string[] }>> = {
  VEHICLE: groupByAudience("VEHICLE"),
  REAL_ESTATE: groupByAudience("REAL_ESTATE"),
  BEAUTY: groupByAudience("BEAUTY"),
  TECHNOLOGY: groupByAudience("TECHNOLOGY"),
  PETS: groupByAudience("PETS")
};

export function allServiceNames() {
  return defaultServiceCategories.map((category) => category.name);
}

export function normalizeServiceSlug(value: string) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("mecanico")) return "mecanico-automotivo";
  if (normalized.includes("auto") && normalized.includes("escola")) return "auto-escola";
  if (normalized.includes("advogado")) return "advogado-imobiliario";
  if (normalized.includes("corretor") && normalized.includes("imove")) return "corretor-imoveis";
  if (normalized.includes("contador")) return "contador";
  if (normalized.includes("contabilidade")) return "contabilidade";
  if (normalized.includes("corretor") && normalized.includes("seguro")) return "corretor-seguros";
  if (normalized.includes("engenheiro")) return "engenheiro";
  if (normalized.includes("arquiteto")) return "arquiteto";
  if (normalized.includes("montador") && normalized.includes("move")) return "montador-moveis";
  if (normalized.includes("auto") && normalized.includes("eletrica")) return "auto-eletrica";
  if (normalized.includes("funilaria")) return "funilaria-pintura";
  if (normalized.includes("som") && normalized.includes("automotivo")) return "som-automotivo";
  if (normalized.includes("chaveiro") && normalized.includes("automotivo")) return "chaveiro-automotivo";
  if (normalized.includes("despachante")) return "despachante-veicular";
  if (normalized.includes("vistoria") && normalized.includes("veicular")) return "vistoria-veicular";
  if (normalized.includes("frete") && normalized.includes("moto")) return "moto-frete";
  if (normalized.includes("motoboy") || normalized.includes("entregador")) return "entregador-motoboy";
  if (normalized.includes("carreto")) return "carretos";
  if (normalized.includes("mudanca")) return "mudancas-veiculos";
  if (normalized.includes("frete")) return "fretes-veiculos";
  if (normalized.includes("limpeza") && normalized.includes("obra")) return "limpeza-pos-obra";
  if (normalized.includes("seguranca") && normalized.includes("eletronica")) return "seguranca-eletronica";
  if (normalized.includes("cabeleireir")) return "cabeleireiro";
  if (normalized.includes("barbeir")) return "barbeiro";
  if (normalized.includes("mega") && normalized.includes("hair")) return "mega-hair";
  if (normalized.includes("alongamento") && normalized.includes("capilar")) return "alongamento-capilar";
  if (normalized.includes("unha") && normalized.includes("gel")) return "unhas-gel";
  if (normalized.includes("fibra") && normalized.includes("vidro")) return "fibra-vidro";
  if (normalized.includes("spa") && normalized.includes("pes")) return "spa-pes";
  if (normalized.includes("designer") && normalized.includes("sobrancelha")) return "designer-sobrancelhas";
  if (normalized.includes("micropigmentador")) return "micropigmentador";
  if (normalized.includes("extensao") && normalized.includes("cilios")) return "extensao-cilios";
  if (normalized.includes("henna") && normalized.includes("sobrancelha")) return "henna-sobrancelhas";
  if (normalized.includes("maquiador")) return "maquiador";
  if (normalized.includes("maquiagem") && normalized.includes("noiva")) return "maquiagem-noivas";
  if (normalized.includes("maquiagem") && normalized.includes("artistica")) return "maquiagem-artistica";
  if (normalized.includes("maquiagem") && normalized.includes("social")) return "maquiagem-social";
  if (normalized.includes("consultor") && normalized.includes("imagem")) return "consultor-imagem";
  if (normalized.includes("esteticista") && normalized.includes("facial")) return "esteticista-facial";
  if (normalized.includes("limpeza") && normalized.includes("pele")) return "limpeza-pele";
  if (normalized.includes("drenagem") && normalized.includes("facial")) return "drenagem-facial";
  if (normalized.includes("antiacne")) return "tratamentos-antiacne";
  if (normalized.includes("rejuvenescimento")) return "rejuvenescimento-facial";
  if (normalized.includes("esteticista") && normalized.includes("corporal")) return "esteticista-corporal";
  if (normalized.includes("drenagem") && normalized.includes("linfatica")) return "drenagem-linfatica";
  if (normalized.includes("massagem") && normalized.includes("modeladora")) return "massagem-modeladora";
  if (normalized.includes("massagem") && normalized.includes("relaxante")) return "massagem-relaxante";
  if (normalized.includes("massagem") && normalized.includes("terapeutica")) return "massagem-terapeutica";
  if (normalized.includes("massagem") && normalized.includes("desportiva")) return "massagem-desportiva";
  if (normalized.includes("bronzeamento") && normalized.includes("natural")) return "bronzeamento-natural";
  if (normalized.includes("bronzeamento") && normalized.includes("jato")) return "bronzeamento-jato";
  if (normalized.includes("bronzeamento") && normalized.includes("fita")) return "bronzeamento-fita";
  if (normalized.includes("depilacao") && normalized.includes("cera")) return "depilacao-cera";
  if (normalized.includes("depilacao") && normalized.includes("egipcia")) return "depilacao-egipcia";
  if (normalized.includes("depilacao") && normalized.includes("laser")) return "depilacao-laser";
  if (normalized.includes("designer") && normalized.includes("barba")) return "designer-barba";
  if (normalized.includes("bem") && normalized.includes("estar")) return "spa-bem-estar";
  if (normalized.includes("dia") && normalized.includes("noiva")) return "dia-noiva";
  if (normalized.includes("dia") && normalized.includes("noivo")) return "dia-noivo";
  if (normalized.includes("beleza") && normalized.includes("domicilio")) return "beleza-domicilio";
  if (normalized.includes("producao") && normalized.includes("festa")) return "producao-festas";
  if (normalized.includes("producao") && normalized.includes("formatura")) return "producao-formaturas";
  if (normalized.includes("tecnico") && normalized.includes("informatica")) return "tecnico-informatica";
  if (normalized.includes("tecnico") && normalized.includes("celular")) return "tecnico-celular";
  if (normalized.includes("rede") && normalized.includes("internet")) return "redes-internet";
  if (normalized.includes("audio") && normalized.includes("video")) return "audio-video";
  if (normalized.includes("site")) return "desenvolvimento-sites";
  if (normalized.includes("aplicativo")) return "desenvolvimento-aplicativos";
  if (normalized.includes("marketing") && normalized.includes("digital")) return "marketing-digital";
  if (normalized.includes("design") && normalized.includes("grafico")) return "design-grafico";
  if (normalized.includes("commerce")) return "e-commerce";
  if (normalized.includes("inteligencia") && normalized.includes("artificial")) return "inteligencia-artificial";
  if (normalized.includes("consultoria") && normalized.includes("ti")) return "consultoria-ti";
  if (normalized.includes("automacao")) return "automacao-residencial-comercial";
  if (normalized.includes("banco") && normalized.includes("dados")) return "banco-dados";
  if (normalized.includes("seguranca") && normalized.includes("informacao")) return "seguranca-informacao";
  if (normalized.includes("cloud") || normalized.includes("servidor")) return "cloud-servidores";
  if (normalized.includes("suporte") && normalized.includes("tecnico")) return "suporte-tecnico";
  if (normalized.includes("treinamento") && normalized.includes("informatica")) return "treinamento-informatica";
  if (normalized.includes("conteudo") && normalized.includes("digital")) return "producao-conteudo-digital";
  if (normalized.includes("analise") && normalized.includes("dados")) return "analise-dados";
  if (normalized.includes("banho") && normalized.includes("tosa")) return "banho-tosa";
  if (normalized.includes("passeador")) return "passeador-pets";
  if (normalized.includes("hospedagem") && normalized.includes("pet")) return "hospedagem-pet";
  if (normalized.includes("adestrador")) return "adestrador";
  if (normalized.includes("cuidador") && normalized.includes("animais")) return "cuidador-animais";
  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function iconForService(value: string) {
  const exact = defaultServiceCategories.find((category) => category.slug === value);
  if (exact) return exact.icon;
  const slug = normalizeServiceSlug(value);
  return defaultServiceCategories.find((category) => category.slug === slug || normalizeServiceSlug(category.name) === slug)?.icon ?? "briefcase-business";
}

export function audienceForService(value: string): ServiceAudience | null {
  const exact = defaultServiceCategories.find((category) => category.slug === value);
  if (exact) return exact.audience;
  const slug = normalizeServiceSlug(value);
  return defaultServiceCategories.find((category) => category.slug === slug || normalizeServiceSlug(category.name) === slug)?.audience ?? null;
}

export function serviceMatchesAudience(value: string, audience?: string) {
  if (!isServiceAudience(audience)) return true;
  return audienceForService(value) === audience;
}

export function isServiceAudience(value: unknown): value is ServiceAudience {
  return serviceAudiences.some((audience) => audience.value === value);
}

export const regulatedServiceCategorySlugs = new Set([
  "advogado-imobiliario",
  "corretor-imoveis",
  "despachante-veicular",
  "despachante",
  "contador",
  "contabilidade",
  "corretor-seguros",
  "engenheiro",
  "arquiteto"
]);

export const professionalCouncilOptions = ["OAB", "CRECI", "CREA", "CAU", "CFC", "SUSEP", "Outro"] as const;

export function requiresProfessionalCredentials(categories: string[]) {
  return categories.map(normalizeServiceSlug).some((slug) => regulatedServiceCategorySlugs.has(slug));
}

function groupByAudience(audience: ServiceAudience) {
  const groups = new Map<string, string[]>();
  for (const item of defaultServiceCategories.filter((category) => category.audience === audience).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item.name]);
  }
  return Array.from(groups.entries()).map(([group, services]) => ({ group, services }));
}
