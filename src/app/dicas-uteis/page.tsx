import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Car, ExternalLink, Home, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Dicas úteis",
  description: "Guias curtos para vender, comprar, financiar e se proteger em classificados."
};

type Article = {
  title: string;
  category: string;
  readTime: string;
  summary: string;
  tips: string[];
  sourceLabel: string;
  sourceUrl: string;
  videoUrl: string;
};

const categories = [
  {
    name: "Vender carro rápido",
    icon: Car,
    tone: "from-yellow-300/20 via-amber-500/10 to-transparent",
    description: "Preço certo, anúncio claro e documentação sem atrito.",
    imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=82"
  },
  {
    name: "Evitar golpes em classificados",
    icon: ShieldCheck,
    tone: "from-emerald-300/20 via-teal-500/10 to-transparent",
    description: "Sinais de risco antes de conversar, pagar ou entregar.",
    imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=82"
  },
  {
    name: "Imóveis: Caixa e aluguel",
    icon: Home,
    tone: "from-sky-300/20 via-cyan-500/10 to-transparent",
    description: "CET, entrada, FGTS, simulação e negociação com banco.",
    imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=82"
  },
  {
    name: "Avaliar carro usado",
    icon: BookOpenText,
    tone: "from-rose-300/20 via-orange-500/10 to-transparent",
    description: "Checklist visual, mecânico, documental e de preço.",
    imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=82"
  }
];

const heroImage = "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1400&q=84";

const articleImages: Record<string, string[]> = {
  "Vender carro rápido": [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1511918984145-48de785d4c4e?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=720&q=82"
  ],
  "Evitar golpes em classificados": [
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=720&q=82"
  ],
  "Imóveis: Caixa e aluguel": [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=720&q=82"
  ],
  "Avaliar carro usado": [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=720&q=82",
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=720&q=82"
  ]
};

const articleGroups: Record<string, Omit<Article, "category">[]> = {
  "Vender carro rápido": [
    {
      title: "Como definir um preço que atrai interessados de verdade",
      readTime: "2 min",
      summary: "Preço bom não é o mais alto: é o que gera visita qualificada. Compare FIPE, anúncios da sua região, quilometragem e estado real antes de publicar.",
      tips: ["Compare carros do mesmo ano e versão.", "Considere pneus, revisão e documentação.", "Deixe uma margem realista para negociação."],
      sourceLabel: "Instacarro",
      sourceUrl: "https://www.instacarro.com/blog/manual-do-vendedor/como-vender-carro",
      videoUrl: "https://www.youtube.com/watch?v=PbZCqZHBHlk"
    },
    {
      title: "Fotos que fazem o anúncio parecer confiável",
      readTime: "2 min",
      summary: "Boas fotos reduzem perguntas repetidas e passam transparência. Mostre frente, traseira, laterais, painel, bancos, pneus e detalhes importantes.",
      tips: ["Fotografe de dia e com o carro limpo.", "Mostre avarias sem esconder.", "Evite filtros e fotos tremidas."],
      sourceLabel: "Mercado Livre",
      sourceUrl: "https://www.mercadolivre.com.br/blog/mo-como-preparar-seu-carro-usado-para-vender-rapido",
      videoUrl: "https://www.youtube.com/watch?v=H6kQw23f6d8"
    },
    {
      title: "Descrição curta, completa e sem enrolação",
      readTime: "2 min",
      summary: "Informe versão, ano, km, revisões, opcionais, motivo da venda e cidade. Quanto mais claro, menos curioso e mais comprador sério.",
      tips: ["Diga se aceita vistoria cautelar.", "Liste itens de segurança e conforto.", "Evite promessas vagas como 'nada a fazer'."],
      sourceLabel: "Pattini",
      sourceUrl: "https://pattini.com.br/como-vender-carro/",
      videoUrl: "https://www.youtube.com/watch?v=ZydVfWv6WVc"
    },
    {
      title: "Documentos que deixam a venda mais rápida",
      readTime: "2 min",
      summary: "CRLV-e, ATPV-e, consulta de débitos e notas de manutenção ajudam o comprador a decidir com menos medo.",
      tips: ["Confira multas e IPVA antes.", "Separe comprovantes de revisão.", "Explique pendências com transparência."],
      sourceLabel: "Detran-MG",
      sourceUrl: "https://detran.mg.gov.br/publico/files/upload/cartilha%20atpv-e.pdf",
      videoUrl: "https://www.youtube.com/watch?v=hqzS3o4v5mY"
    },
    {
      title: "Como responder interessados sem perder tempo",
      readTime: "2 min",
      summary: "Prepare respostas para perguntas comuns: menor preço, histórico, cautelar, financiamento do comprador, troca e local de visita.",
      tips: ["Responda rápido, mas sem pressa para fechar.", "Priorize quem faz perguntas objetivas.", "Marque visita em local seguro."],
      sourceLabel: "OLX Ajuda",
      sourceUrl: "https://ajuda.olx.com.br/s/article/dicas-compra-venda-veiculos",
      videoUrl: "https://www.youtube.com/watch?v=IE2bLC4p6w4"
    },
    {
      title: "Vale aceitar troca?",
      readTime: "2 min",
      summary: "Troca pode acelerar negócio, mas precisa avaliação fria. O carro recebido pode ter manutenção cara, leilão, débitos ou preço inflado.",
      tips: ["Avalie o bem recebido como se fosse comprar.", "Peça laudo e documentos.", "Não aceite diferença sem calcular reparos."],
      sourceLabel: "InstaCarro",
      sourceUrl: "https://www.instacarro.com/blog/manual-do-comprador/como-comprar-carro-usado",
      videoUrl: "https://www.youtube.com/watch?v=Zm_JWBf3rJg"
    },
    {
      title: "O que revisar antes de anunciar",
      readTime: "2 min",
      summary: "Pequenos ajustes podem aumentar a confiança: limpeza, lâmpadas, calibragem, fluidos, palhetas e itens simples de acabamento.",
      tips: ["Resolva defeitos baratos e visíveis.", "Não esconda defeitos caros.", "Guarde notas do que foi feito."],
      sourceLabel: "Serasa",
      sourceUrl: "https://www.serasa.com.br/carteira-digital/blog/trocar-de-carro/",
      videoUrl: "https://www.youtube.com/watch?v=0wQG3fMn5Yw"
    },
    {
      title: "Como vender moto usada com mais confiança",
      readTime: "2 min",
      summary: "Moto exige atenção a pneus, relação, freios, bengala, quadro e histórico de queda. Fotos e descrição devem mostrar esses pontos.",
      tips: ["Mostre painel e quilometragem.", "Informe troca de óleo e relação.", "Aceite vistoria com mecânico."],
      sourceLabel: "OLX Ajuda",
      sourceUrl: "https://ajuda.olx.com.br/s/article/dicas-compra-venda-veiculos",
      videoUrl: "https://www.youtube.com/watch?v=JzlwJPRJxXU"
    },
    {
      title: "Quando baixar o preço do anúncio",
      readTime: "2 min",
      summary: "Se há muitas visualizações e poucos interessados, o problema pode ser preço, fotos ou descrição. Ajuste uma coisa por vez.",
      tips: ["Revise título e primeiras fotos.", "Compare anúncios ativos semanalmente.", "Baixe aos poucos, não no impulso."],
      sourceLabel: "Instacarro",
      sourceUrl: "https://www.instacarro.com/blog/manual-do-vendedor/como-vender-carro",
      videoUrl: "https://www.youtube.com/watch?v=vX4p3IWsYHk"
    },
    {
      title: "Como evitar curiosos e focar no comprador certo",
      readTime: "2 min",
      summary: "Um anúncio específico filtra melhor. Detalhes reais atraem quem já sabe o que quer e reduzem conversa improdutiva.",
      tips: ["Coloque versão correta no título.", "Informe cidade e bairro aproximado.", "Deixe claro se aceita proposta ou troca."],
      sourceLabel: "Pattini",
      sourceUrl: "https://pattini.com.br/como-vender-carro/",
      videoUrl: "https://www.youtube.com/watch?v=93G7-MkR6YQ"
    }
  ],
  "Evitar golpes em classificados": [
    {
      title: "Golpe do intermediário: como reconhecer",
      readTime: "2 min",
      summary: "O fraudador conversa com comprador e vendedor ao mesmo tempo, muda a história e tenta receber no lugar do verdadeiro dono.",
      tips: ["Comprador deve pagar ao titular do documento.", "Nunca aceite 'não fale de preço com ele'.", "Confirme identidade das duas pontas."],
      sourceLabel: "OLX Veículos",
      sourceUrl: "https://ajuda.olx.com.br/s/article/dicas-compra-venda-veiculos",
      videoUrl: "https://www.youtube.com/watch?v=bkRF_8Gv8kE"
    },
    {
      title: "Anúncio clonado: preço baixo demais é alerta",
      readTime: "2 min",
      summary: "Fotos bonitas, preço muito baixo e pressa para fechar costumam aparecer em anúncio clonado. Pesquise imagem, placa e perfil.",
      tips: ["Compare preço em vários anúncios.", "Peça vídeo atual do veículo ou imóvel.", "Desconfie de reserva antecipada."],
      sourceLabel: "Serasa",
      sourceUrl: "https://www.serasa.com.br/premium/blog/golpe-na-olx-como-identificar-o-falso-anuncio-de-venda-de-carros/",
      videoUrl: "https://www.youtube.com/watch?v=JHXfe3DZx30"
    },
    {
      title: "Pedido de sinal antes da visita",
      readTime: "2 min",
      summary: "Sinal para 'segurar' anúncio sem visita, contrato ou identificação clara é um dos atalhos mais usados por golpistas.",
      tips: ["Visite antes de qualquer compromisso.", "Confirme titularidade.", "Guarde conversas e comprovantes."],
      sourceLabel: "OLX Segurança",
      sourceUrl: "https://dicas.olx.com.br/seguranca/golpes-conhecidos/a-olx-e-segura-confira-como-comprar-com-seguranca/",
      videoUrl: "https://www.youtube.com/watch?v=8eFjQz9Fh9g"
    },
    {
      title: "Link falso de plataforma ou banco",
      readTime: "2 min",
      summary: "Golpistas enviam links parecidos com sites conhecidos. Não informe senha, token, cartão ou código recebido por SMS.",
      tips: ["Digite o endereço manualmente.", "Confira domínio antes de clicar.", "Nunca compartilhe código de verificação."],
      sourceLabel: "Serasa",
      sourceUrl: "https://www.serasa.com.br/premium/blog/golpe-na-olx-como-identificar-o-falso-anuncio-de-venda-de-carros/",
      videoUrl: "https://www.youtube.com/watch?v=JQXgR4k7bL8"
    },
    {
      title: "Como proteger seus dados pessoais",
      readTime: "2 min",
      summary: "CPF, endereço completo, documento e fotos com QR Code podem ser usados em engenharia social. Compartilhe só quando necessário.",
      tips: ["Cubra dados sensíveis em fotos.", "Use o contato inicial pelo Achei X.", "Desconfie de insistência por documento."],
      sourceLabel: "Serasa",
      sourceUrl: "https://www.serasa.com.br/premium/blog/golpe-na-olx-como-identificar-o-falso-anuncio-de-venda-de-carros/",
      videoUrl: "https://www.youtube.com/watch?v=Z5C8E2RTbR0"
    },
    {
      title: "Como verificar se o vendedor existe",
      readTime: "2 min",
      summary: "Nome, telefone, histórico do perfil, cidade e documentos precisam fazer sentido entre si. Inconsistência pequena pode revelar golpe.",
      tips: ["Procure o nome em fontes públicas.", "Confirme se o telefone é do titular.", "Faça chamada de vídeo se necessário."],
      sourceLabel: "OLX Ajuda",
      sourceUrl: "https://ajuda.olx.com.br/s/article/dicas-compra-venda-veiculos",
      videoUrl: "https://www.youtube.com/watch?v=KxJk9IMhQYI"
    },
    {
      title: "Imóvel fantasma: como evitar visita falsa",
      readTime: "2 min",
      summary: "Fotos de imóvel real podem ser usadas por quem não é proprietário ou corretor. Verifique matrícula, endereço e autorização.",
      tips: ["Pesquise as imagens no Google.", "Compare endereço com fotos.", "Peça identificação do anunciante."],
      sourceLabel: "QuintoAndar",
      sourceUrl: "https://www.quintoandar.com.br/guias/evitar-golpes-imobiliarios/",
      videoUrl: "https://www.youtube.com/watch?v=mwiWPXoQCEQ"
    },
    {
      title: "Contrato apressado é sinal de cuidado",
      readTime: "2 min",
      summary: "Pressa para assinar sem ler, sem vistoria ou sem dados completos favorece erro. Contrato precisa refletir exatamente o combinado.",
      tips: ["Leia cláusulas de multa e prazo.", "Confira dados das partes.", "Guarde uma cópia assinada."],
      sourceLabel: "Procon-SP",
      sourceUrl: "https://www.procon.sp.gov.br/",
      videoUrl: "https://www.youtube.com/watch?v=X0zKxEwKIbE"
    },
    {
      title: "Como reportar um problema no anúncio",
      readTime: "2 min",
      summary: "Um aviso rápido ajuda a proteger outros usuários. Junte prints, links, nomes, telefones e comprovantes antes de apagar conversas.",
      tips: ["Registre o link do anúncio.", "Faça boletim se houve prejuízo.", "Use o botão Reportar Problema."],
      sourceLabel: "OLX Segurança",
      sourceUrl: "https://dicas.olx.com.br/seguranca/golpes-conhecidos/a-olx-e-segura-confira-como-comprar-com-seguranca/",
      videoUrl: "https://www.youtube.com/watch?v=oS9w2nTqYOc"
    },
    {
      title: "Golpes comuns em compra de moto",
      readTime: "2 min",
      summary: "Moto com documento atrasado, chassi raspado, leilão não informado ou preço muito baixo exige checagem extra.",
      tips: ["Confira chassi e motor.", "Consulte débitos e restrições.", "Leve mecânico se não conhecer motos."],
      sourceLabel: "Procon-PR",
      sourceUrl: "https://www.procon.pr.gov.br/sites/procon-pr/arquivos_restritos/files/documento/2025-01/cartilha_veiculos_2025.1c.pdf",
      videoUrl: "https://www.youtube.com/watch?v=dEg8cyxP2fI"
    }
  ],
  "Imóveis: Caixa e aluguel": [
    {
      title: "Como financiar um imóvel pela Caixa",
      readTime: "3 min",
      summary: "Antes de escolher o imóvel, simule renda, entrada, prazo, sistema de amortização e modalidade. A Caixa informa condições e documentos por perfil.",
      tips: ["Simule antes de visitar imóveis caros.", "Compare SAC e Price.", "Veja se cabe no limite de renda."],
      sourceLabel: "Caixa",
      sourceUrl: "https://www.caixa.gov.br/voce/habitacao/financiamento-de-imoveis/Paginas/default.aspx",
      videoUrl: "https://www.youtube.com/watch?v=vgHwU9xJ-z0"
    },
    {
      title: "Como usar o FGTS na compra do imóvel",
      readTime: "2 min",
      summary: "FGTS pode ajudar na entrada ou amortização quando as regras são atendidas. Confirme enquadramento do imóvel e do comprador antes de contar com ele.",
      tips: ["Verifique tempo de trabalho sob FGTS.", "Confira se o imóvel se enquadra.", "Use simulação com e sem FGTS."],
      sourceLabel: "Caixa",
      sourceUrl: "https://www.caixa.gov.br/voce/habitacao/financiamento-de-imoveis/Paginas/default.aspx",
      videoUrl: "https://www.youtube.com/watch?v=gWLx1ubfIkg"
    },
    {
      title: "CET: o número que importa no financiamento",
      readTime: "2 min",
      summary: "CET inclui juros, seguros e tarifas. Duas propostas com juros parecidos podem ter custos totais bem diferentes.",
      tips: ["Compare CET, não só juros.", "Use mesmo prazo nas simulações.", "Inclua seguros obrigatórios."],
      sourceLabel: "Banco Central",
      sourceUrl: "https://www.bcb.gov.br/meubc/faqs/s/credito-imobiliario",
      videoUrl: "https://www.youtube.com/watch?v=1O7fX_bJ7Ew"
    },
    {
      title: "SAC ou Price: qual tabela escolher?",
      readTime: "2 min",
      summary: "SAC costuma começar mais alto e cair ao longo do tempo. Price começa menor, mas pode custar mais no total dependendo do contrato.",
      tips: ["Compare valor total pago.", "Pense na sua renda futura.", "Veja impacto de amortizações."],
      sourceLabel: "Banco Central",
      sourceUrl: "https://www.bcb.gov.br/meubc/faqs/s/credito-imobiliario",
      videoUrl: "https://www.youtube.com/watch?v=6Tt2HQQXrWk"
    },
    {
      title: "Como escolher bem uma casa de aluguel",
      readTime: "2 min",
      summary: "Além do preço, avalie transporte, barulho, umidade, segurança, sol, comércio, garagem e custo total com condomínio e contas.",
      tips: ["Visite em horários diferentes.", "Teste torneiras e tomadas.", "Pergunte sobre reajuste e garantias."],
      sourceLabel: "QuintoAndar",
      sourceUrl: "https://www.quintoandar.com.br/guias/alugar-imovel/",
      videoUrl: "https://www.youtube.com/watch?v=Mz9nKX6s-74"
    },
    {
      title: "Vistoria de entrada no aluguel",
      readTime: "2 min",
      summary: "A vistoria registra o estado do imóvel e evita cobrança indevida na saída. Fotografe paredes, pisos, portas, janelas e medidores.",
      tips: ["Guarde fotos datadas.", "Peça correção do laudo se faltar algo.", "Teste chuveiro, descarga e fechaduras."],
      sourceLabel: "QuintoAndar",
      sourceUrl: "https://www.quintoandar.com.br/guias/vistoria-de-imovel/",
      videoUrl: "https://www.youtube.com/watch?v=1SxfCLmD84U"
    },
    {
      title: "Contrato de aluguel: cláusulas para olhar",
      readTime: "2 min",
      summary: "Prazo, multa, reajuste, garantia, responsabilidade por reparos e regras de saída precisam estar claros antes da assinatura.",
      tips: ["Leia índice de reajuste.", "Confira multa proporcional.", "Veja quem paga IPTU e condomínio."],
      sourceLabel: "QuintoAndar",
      sourceUrl: "https://www.quintoandar.com.br/guias/contrato-de-aluguel/",
      videoUrl: "https://www.youtube.com/watch?v=RPiPrfkAz24"
    },
    {
      title: "Como avaliar bairro antes de alugar",
      readTime: "2 min",
      summary: "O imóvel pode ser bom e a rotina ruim. Teste trajeto, ruído, iluminação, segurança, mercado, escola, trabalho e transporte.",
      tips: ["Visite de noite e no fim de semana.", "Converse com moradores.", "Calcule deslocamento real."],
      sourceLabel: "Money Times",
      sourceUrl: "https://www.moneytimes.com.br/comprar-ou-alugar-confira-dicas-de-como-escolher-o-seu-imovel/",
      videoUrl: "https://www.youtube.com/watch?v=bQln70bRQUk"
    },
    {
      title: "Matrícula do imóvel: por que consultar",
      readTime: "2 min",
      summary: "A matrícula mostra proprietário, ônus, alienações e restrições. É essencial antes de comprar ou financiar.",
      tips: ["Peça matrícula atualizada.", "Confira se vendedor é proprietário.", "Veja se há penhora ou alienação."],
      sourceLabel: "Pharos",
      sourceUrl: "https://www.pharosnegocios.com.br/guias/financiamento-imobiliario",
      videoUrl: "https://www.youtube.com/watch?v=TP4ZWETuR1U"
    },
    {
      title: "Como negociar aluguel sem parecer aventureiro",
      readTime: "2 min",
      summary: "Boa negociação usa dados: imóveis parecidos, tempo anunciado, reparos necessários e prazo de contrato.",
      tips: ["Compare imóveis semelhantes.", "Ofereça garantia clara.", "Negocie reparos antes de assinar."],
      sourceLabel: "QuintoAndar",
      sourceUrl: "https://www.quintoandar.com.br/guias/alugar-imovel/",
      videoUrl: "https://www.youtube.com/watch?v=tUw8B-jEX6A"
    }
  ],
  "Avaliar carro usado": [
    {
      title: "Como saber se um carro é de leilão",
      readTime: "2 min",
      summary: "Histórico de leilão pode aparecer em consultas por placa, RENAVAM, relatórios privados e sinais físicos de reparo estrutural.",
      tips: ["Consulte placa e RENAVAM.", "Desconfie de preço muito baixo.", "Faça vistoria cautelar independente."],
      sourceLabel: "InstaCarro",
      sourceUrl: "https://www.instacarro.com/blog/manual-do-comprador/como-saber-se-o-carro-veio-de-leilao",
      videoUrl: "https://www.youtube.com/watch?v=0Pd9H9uO8U0"
    },
    {
      title: "Laudo cautelar: o que ele mostra",
      readTime: "2 min",
      summary: "O laudo ajuda a verificar estrutura, chassi, motor, câmbio, histórico e indícios de colisão ou adulteração.",
      tips: ["Faça em empresa independente.", "Leia observações, não só aprovado/reprovado.", "Use o resultado na negociação."],
      sourceLabel: "Motoriza",
      sourceUrl: "https://www.motoriza.net/blog/vistoria-cautelar-carro-usado",
      videoUrl: "https://www.youtube.com/watch?v=0Pd9H9uO8U0"
    },
    {
      title: "Como identificar carro batido",
      readTime: "2 min",
      summary: "Diferença de cor, parafusos marcados, vãos irregulares e soldas podem indicar reparos. Nem todo reparo é ruim, mas precisa ser declarado.",
      tips: ["Veja de dia e contra a luz.", "Compare vãos das portas.", "Observe longarinas e etiquetas."],
      sourceLabel: "Serasa",
      sourceUrl: "https://www.serasa.com.br/seguros/blog/como-saber-se-um-carro-foi-batido/",
      videoUrl: "https://www.youtube.com/watch?v=N1_Cu80YR1I"
    },
    {
      title: "Test drive com checklist",
      readTime: "2 min",
      summary: "Teste motor frio, câmbio, freio, direção, suspensão, ar-condicionado e ruídos. O passeio precisa virar diagnóstico.",
      tips: ["Ligue todos os itens elétricos.", "Teste em ruas diferentes.", "Observe luzes no painel."],
      sourceLabel: "Procon-PR",
      sourceUrl: "https://www.procon.pr.gov.br/sites/procon-pr/arquivos_restritos/files/documento/2025-01/cartilha_veiculos_2025.1c.pdf",
      videoUrl: "https://www.youtube.com/watch?v=U0g1X3UFTsE"
    },
    {
      title: "Quilometragem adulterada: sinais comuns",
      readTime: "2 min",
      summary: "Volante, pedais, banco, pneus, revisões e histórico de anúncios ajudam a perceber se a quilometragem combina com o estado do carro.",
      tips: ["Compare desgaste interno.", "Peça histórico de revisões.", "Desconfie de km baixo demais."],
      sourceLabel: "Olho no Carro",
      sourceUrl: "https://www.olhonocarro.com.br/",
      videoUrl: "https://www.youtube.com/watch?v=pUeyLC0Me88"
    },
    {
      title: "Como avaliar uma moto usada",
      readTime: "2 min",
      summary: "Moto usada pede atenção a quadro, bengalas, relação, pneus, freios, partida, motor e sinais de queda.",
      tips: ["Confira alinhamento do guidão.", "Veja vazamento nas bengalas.", "Cheque chassi e documento."],
      sourceLabel: "Procon-PR",
      sourceUrl: "https://www.procon.pr.gov.br/sites/procon-pr/arquivos_restritos/files/documento/2025-01/cartilha_veiculos_2025.1c.pdf",
      videoUrl: "https://www.youtube.com/watch?v=dEg8cyxP2fI"
    },
    {
      title: "Débitos e restrições antes de comprar",
      readTime: "2 min",
      summary: "IPVA, multas, alienação, bloqueio judicial e comunicação de venda podem impedir transferência ou gerar custo inesperado.",
      tips: ["Consulte Detran do estado.", "Confira alienação fiduciária.", "Só avance com pendências claras."],
      sourceLabel: "Detran-SP",
      sourceUrl: "https://www.detran.sp.gov.br/",
      videoUrl: "https://www.youtube.com/watch?v=_PegAkzDU6E"
    },
    {
      title: "Carro de locadora vale a pena?",
      readTime: "2 min",
      summary: "Pode ser bom se tiver manutenção e preço compatível, mas exige análise de uso, documentação, revisões e estado interno.",
      tips: ["Veja histórico de manutenção.", "Compare preço abaixo da média.", "Faça cautelar e avaliação mecânica."],
      sourceLabel: "Instacarro",
      sourceUrl: "https://www.instacarro.com/blog/manual-do-comprador/como-comprar-carro-usado",
      videoUrl: "https://www.youtube.com/watch?v=ELJrJwQ0IEw"
    },
    {
      title: "Tabela FIPE não é preço final",
      readTime: "2 min",
      summary: "FIPE é referência, mas versão, estado, região, cor, histórico e manutenção mudam o valor real de mercado.",
      tips: ["Compare anúncios ativos.", "Some reparos imediatos.", "Use FIPE como ponto de partida."],
      sourceLabel: "Serasa",
      sourceUrl: "https://www.serasa.com.br/carteira-digital/blog/trocar-de-carro/",
      videoUrl: "https://www.youtube.com/watch?v=8VKhShW0eHI"
    },
    {
      title: "Quando levar mecânico junto",
      readTime: "2 min",
      summary: "Se você não entende de mecânica, levar especialista pode evitar prejuízo alto em motor, câmbio, suspensão e elétrica.",
      tips: ["Leve antes de fechar negócio.", "Combine avaliação em oficina.", "Não aceite pressa do vendedor."],
      sourceLabel: "Procon-PR",
      sourceUrl: "https://www.procon.pr.gov.br/sites/procon-pr/arquivos_restritos/files/documento/2025-01/cartilha_veiculos_2025.1c.pdf",
      videoUrl: "https://www.youtube.com/watch?v=0Pd9H9uO8U0"
    }
  ]
};

const articles: Article[] = Object.entries(articleGroups).flatMap(([category, items]) =>
  items.map((item) => ({ ...item, category }))
);

/*
  {
    category: "Vender carro rápido",
    title: "Comece pelo preço que gera visita, não pelo preço dos sonhos",
    readTime: "2 min",
    summary: "Compare FIPE, anúncios parecidos e estado real do carro. Um preço 3% a 7% acima do alvo deixa margem para negociar; muito acima espanta bons compradores.",
    tips: ["Use anúncios da mesma cidade como referência.", "Desconte pneus, revisão atrasada e detalhes de pintura.", "Explique no anúncio por que o preço é justo."],
    sourceLabel: "Instacarro",
    sourceUrl: "https://www.instacarro.com/blog/manual-do-vendedor/como-vender-carro",
    videoUrl: "https://www.youtube.com/results?search_query=como+vender+carro+rapido+preco+justo"
  },
  {
    category: "Vender carro rápido",
    title: "Fotos vendem antes da mensagem",
    readTime: "2 min",
    summary: "Lave o carro, fotografe em local claro e mostre todos os ângulos. Foto honesta de detalhe evita curiosos e aumenta confiança.",
    tips: ["Inclua painel, bancos, pneus e motor.", "Evite filtros pesados.", "Mostre riscos relevantes em vez de escondê-los."],
    sourceLabel: "Mercado Livre",
    sourceUrl: "https://www.mercadolivre.com.br/blog/mo-como-preparar-seu-carro-usado-para-vender-rapido",
    videoUrl: "https://www.youtube.com/results?search_query=como+tirar+fotos+para+vender+carro+usado"
  },
  {
    category: "Vender carro rápido",
    title: "Documentos prontos encurtam a negociação",
    readTime: "2 min",
    summary: "Tenha CRLV-e, recibo/ATPV-e, comprovantes de manutenção e débitos consultados. Quem compra rápido costuma escolher o vendedor mais organizado.",
    tips: ["Quite multas antes de anunciar, se possível.", "Separe notas de revisão e peças.", "Combine cartório e pagamento com antecedência."],
    sourceLabel: "Detran-MG",
    sourceUrl: "https://detran.mg.gov.br/publico/files/upload/cartilha%20atpv-e.pdf",
    videoUrl: "https://www.youtube.com/results?search_query=documentos+para+vender+carro+ATPV-e"
  },
  {
    category: "Vender carro rápido",
    title: "Descrição boa responde dúvidas antes do primeiro contato",
    readTime: "2 min",
    summary: "Informe ano, versão, quilometragem, revisões, pneus, opcionais, motivo da venda e cidade. Texto direto reduz perguntas repetidas.",
    tips: ["Diga se aceita vistoria cautelar.", "Liste itens de conforto e segurança.", "Evite frases vagas como 'carro de garagem' sem provas."],
    sourceLabel: "Pattini",
    sourceUrl: "https://pattini.com.br/como-vender-carro/",
    videoUrl: "https://www.youtube.com/results?search_query=como+fazer+anuncio+de+carro+usado"
  },
  {
    category: "Vender carro rápido",
    title: "Combine visita segura e objetiva",
    readTime: "2 min",
    summary: "Marque em local movimentado, leve documento com dados sensíveis protegidos e só entregue o carro após confirmação real do pagamento.",
    tips: ["Prefira horário comercial.", "Não aceite comprovante como confirmação sozinho.", "Faça comunicação de venda após concluir."],
    sourceLabel: "OLX Ajuda",
    sourceUrl: "https://ajuda.olx.com.br/s/article/dicas-compra-venda-veiculos",
    videoUrl: "https://www.youtube.com/results?search_query=como+vender+carro+com+seguranca+golpes"
  },
  {
    category: "Evitar golpes em classificados",
    title: "Negocie dentro da plataforma sempre que puder",
    readTime: "2 min",
    summary: "Golpistas tentam levar a conversa para WhatsApp, e-mail ou links externos. Manter o histórico na plataforma ajuda suporte, prova e análise.",
    tips: ["Desconfie de urgência exagerada.", "Não clique em links de pagamento enviados por terceiros.", "Guarde prints e protocolos."],
    sourceLabel: "OLX Segurança",
    sourceUrl: "https://dicas.olx.com.br/seguranca/golpes-conhecidos/a-olx-e-segura-confira-como-comprar-com-seguranca/",
    videoUrl: "https://www.youtube.com/results?search_query=como+evitar+golpes+em+classificados+online"
  },
  {
    category: "Evitar golpes em classificados",
    title: "Falso pagamento: o golpe que parece venda concluída",
    readTime: "2 min",
    summary: "Comprovante falso, e-mail imitando plataforma e pressão para envio são sinais clássicos. Dinheiro só conta quando aparece confirmado na conta.",
    tips: ["Abra o app do banco, não o link recebido.", "Confira titularidade do pagador.", "Espere compensação em TED, boleto ou depósito."],
    sourceLabel: "OLX",
    sourceUrl: "https://dicas.olx.com.br/seguranca/falso-pagamento-ou-golpe-da-compra-aprovada-como-se-proteger-com-a-olx/",
    videoUrl: "https://www.youtube.com/results?search_query=golpe+do+falso+pagamento+classificados"
  },
  {
    category: "Evitar golpes em classificados",
    title: "Preço bom demais pede verificação extra",
    readTime: "2 min",
    summary: "Oferta muito abaixo da média pode esconder produto inexistente, veículo com problema, intermediário falso ou anúncio clonado.",
    tips: ["Compare com pelo menos cinco anúncios.", "Peça documento e histórico antes de sinal.", "Nunca pague reserva para desconhecido."],
    sourceLabel: "Serasa",
    sourceUrl: "https://www.serasa.com.br/premium/blog/golpe-na-olx-como-identificar-o-falso-anuncio-de-venda-de-carros/",
    videoUrl: "https://www.youtube.com/results?search_query=anuncio+falso+carro+como+identificar"
  },
  {
    category: "Evitar golpes em classificados",
    title: "Golpe do intermediário: duas vítimas na mesma negociação",
    readTime: "2 min",
    summary: "O fraudador conversa com comprador e vendedor, muda a história para cada lado e tenta receber no lugar do dono real.",
    tips: ["Comprador deve pagar ao titular do documento.", "Vendedor deve conhecer quem está pagando.", "Desconfie de 'não fale de preço com ele'."],
    sourceLabel: "OLX Veículos",
    sourceUrl: "https://ajuda.olx.com.br/s/article/dicas-compra-venda-veiculos",
    videoUrl: "https://www.youtube.com/results?search_query=golpe+do+intermediario+compra+venda+carro"
  },
  {
    category: "Evitar golpes em classificados",
    title: "Dados pessoais: mostre só o necessário",
    readTime: "2 min",
    summary: "Documento, endereço e telefone podem ser usados em engenharia social. Envie dados completos apenas quando a negociação estiver madura.",
    tips: ["Cubra QR codes e números sensíveis em fotos.", "Use o contato inicial pelo Achei X.", "Denuncie perfis insistentes ou incoerentes."],
    sourceLabel: "Serasa",
    sourceUrl: "https://www.serasa.com.br/premium/blog/golpe-na-olx-como-identificar-o-falso-anuncio-de-venda-de-carros/",
    videoUrl: "https://www.youtube.com/results?search_query=seguranca+dados+pessoais+classificados+online"
  },
  {
    category: "Financiar um imóvel",
    title: "Compare CET, não só taxa de juros",
    readTime: "2 min",
    summary: "O Custo Efetivo Total inclui juros, seguros, tarifas e despesas obrigatórias. É ele que mostra o custo real do financiamento.",
    tips: ["Peça simulação com CET em todos os bancos.", "Compare prazo igual e entrada igual.", "Veja seguros MIP e DFI no contrato."],
    sourceLabel: "Banco Central",
    sourceUrl: "https://www.bcb.gov.br/meubc/faqs/s/credito-imobiliario",
    videoUrl: "https://www.youtube.com/results?search_query=CET+financiamento+imobiliario+Banco+Central"
  },
  {
    category: "Financiar um imóvel",
    title: "SFH e SFI mudam as regras do jogo",
    readTime: "2 min",
    summary: "No SFH há regras federais, teto de valor e possibilidade de FGTS em situações específicas. No SFI, as condições são mais livres.",
    tips: ["Verifique se o imóvel entra no SFH.", "Confirme se você pode usar FGTS.", "Peça ao banco a regra por escrito."],
    sourceLabel: "Banco Central",
    sourceUrl: "https://www.bcb.gov.br/meubc/faqs/s/credito-imobiliario",
    videoUrl: "https://www.youtube.com/results?search_query=SFH+SFI+financiamento+imobiliario+explicado"
  },
  {
    category: "Financiar um imóvel",
    title: "Entrada maior reduz risco e juros pagos",
    readTime: "2 min",
    summary: "Quanto menor o valor financiado, menor tende a ser a parcela e o total de juros. Entrada também ajuda na aprovação de crédito.",
    tips: ["Simule 20%, 30% e 40% de entrada.", "Reserve custos de cartório e imposto.", "Não use toda sua reserva de emergência."],
    sourceLabel: "CNN Brasil",
    sourceUrl: "https://www.cnnbrasil.com.br/branded-content/economia/negocios/como-financiar-um-imovel-em-2026-e-pagar-menos-juros/",
    videoUrl: "https://www.youtube.com/results?search_query=como+financiar+imovel+entrada+juros"
  },
  {
    category: "Financiar um imóvel",
    title: "Pré-aprovação evita perder tempo com imóvel inviável",
    readTime: "2 min",
    summary: "Antes de se apaixonar por um imóvel, saiba quanto o banco financiaria. Isso dá poder de negociação e reduz frustração.",
    tips: ["Organize renda, IR e extratos.", "Reduza dívidas antes da análise.", "Evite novas compras parceladas no processo."],
    sourceLabel: "Select Imob",
    sourceUrl: "https://www.selectimob.com.br/blog/como-financiar-um-imovel-2026/",
    videoUrl: "https://www.youtube.com/results?search_query=pre+aprovacao+financiamento+imobiliario+dicas"
  },
  {
    category: "Financiar um imóvel",
    title: "Leia a matrícula antes de assinar proposta",
    readTime: "2 min",
    summary: "A matrícula revela proprietário, ônus, alienações e restrições. Problema jurídico pode atrasar ou impedir o financiamento.",
    tips: ["Peça matrícula atualizada.", "Confira se vendedor é o proprietário.", "Consulte corretor, advogado ou cartório quando houver dúvida."],
    sourceLabel: "Pharos",
    sourceUrl: "https://www.pharosnegocios.com.br/guias/financiamento-imobiliario",
    videoUrl: "https://www.youtube.com/results?search_query=matricula+do+imovel+financiamento+imobiliario"
  },
  {
    category: "Avaliar carro usado",
    title: "Laudo cautelar é barato perto do prejuízo",
    readTime: "2 min",
    summary: "O laudo ajuda a identificar sinistro, leilão, chassi remarcado, estrutura reparada e inconsistências documentais.",
    tips: ["Escolha empresa independente.", "Não dependa só do laudo enviado pelo vendedor.", "Use apontamentos para negociar preço."],
    sourceLabel: "Motoriza",
    sourceUrl: "https://www.motoriza.net/blog/vistoria-cautelar-carro-usado",
    videoUrl: "https://www.youtube.com/results?search_query=laudo+cautelar+carro+usado+como+funciona"
  },
  {
    category: "Avaliar carro usado",
    title: "Pintura e alinhamento contam a história do carro",
    readTime: "2 min",
    summary: "Diferença de tonalidade, parafusos marcados, vãos irregulares e soldas fora do padrão podem indicar reparos estruturais.",
    tips: ["Veja o carro de dia.", "Observe contra a luz.", "Compare datas de vidros e cintos."],
    sourceLabel: "Serasa",
    sourceUrl: "https://www.serasa.com.br/seguros/blog/como-saber-se-um-carro-foi-batido/",
    videoUrl: "https://www.youtube.com/results?search_query=como+saber+se+carro+foi+batido"
  },
  {
    category: "Avaliar carro usado",
    title: "Test drive é diagnóstico, não passeio",
    readTime: "2 min",
    summary: "Use o trajeto para sentir freios, câmbio, direção, suspensão, ar-condicionado e ruídos. Carro bom não precisa de desculpa.",
    tips: ["Teste em baixa e média velocidade.", "Cheque luzes no painel.", "Ligue todos os itens elétricos."],
    sourceLabel: "Serasa",
    sourceUrl: "https://www.serasa.com.br/seguros/blog/como-saber-se-um-carro-foi-batido/",
    videoUrl: "https://www.youtube.com/results?search_query=test+drive+carro+usado+checklist"
  },
  {
    category: "Avaliar carro usado",
    title: "Preço justo junta FIPE, mercado e estado real",
    readTime: "2 min",
    summary: "FIPE é referência, mas quilometragem, versão, cor, histórico, região e manutenção mudam o valor final.",
    tips: ["Compare anúncios equivalentes.", "Some reparos imediatos.", "Desconfie de desconto sem explicação."],
    sourceLabel: "Serasa",
    sourceUrl: "https://www.serasa.com.br/carteira-digital/blog/trocar-de-carro/",
    videoUrl: "https://www.youtube.com/results?search_query=como+avaliar+preco+carro+usado+tabela+fipe"
  },
  {
    category: "Avaliar carro usado",
    title: "Documento precisa bater com a conversa",
    readTime: "2 min",
    summary: "Confirme proprietário, placa, chassi, débitos, restrições e histórico. Se o vendedor evita documentação, a melhor compra pode ser ir embora.",
    tips: ["Consulte Detran do estado.", "Confira nome do titular.", "Não pague para terceiros sem contrato claro."],
    sourceLabel: "OLX Ajuda",
    sourceUrl: "https://ajuda.olx.com.br/s/article/dicas-compra-venda-veiculos",
    videoUrl: "https://www.youtube.com/results?search_query=checklist+documentos+comprar+carro+usado"
  }
];

*/

export default function TipsPage() {
  return (
    <main className="bg-[radial-gradient(circle_at_top_left,rgb(250_204_21/0.12),transparent_28rem),linear-gradient(180deg,#050505,#101010_45%,#050505)]">
      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-xs font-black uppercase text-yellow-200">
              <Sparkles size={14} />
              Guias atualizados para negociar melhor
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black text-white sm:text-6xl">Dicas úteis</h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-neutral-300 sm:text-lg">
              Conteúdo rápido para vender com mais segurança, comprar com menos risco e tomar decisões melhores em veículos e imóveis.
            </p>
            <div className="mt-8 grid max-w-xl grid-cols-3 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] text-center">
              <div className="p-4">
                <strong className="block text-2xl text-white">20</strong>
                <span className="text-xs font-bold text-neutral-400">matérias</span>
              </div>
              <div className="border-x border-white/10 p-4">
                <strong className="block text-2xl text-white">4</strong>
                <span className="text-xs font-bold text-neutral-400">categorias</span>
              </div>
              <div className="p-4">
                <strong className="block text-2xl text-white">+vídeos</strong>
                <span className="text-xs font-bold text-neutral-400">YouTube</span>
              </div>
            </div>
          </div>
          <div className="relative min-h-[22rem] overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-900 shadow-2xl shadow-black/35">
            <img src={heroImage} alt="Mesa moderna com notebook para leitura de dicas úteis" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
              <p className="text-xs font-black uppercase text-yellow-200">Especial Achei X</p>
              <h2 className="mt-2 max-w-lg text-2xl font-black leading-tight text-white sm:text-4xl">Aprenda antes de negociar. Economize depois.</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.name} href={`/dicas-uteis#${slugify(category.name)}`} className="group relative min-h-48 overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 transition hover:-translate-y-0.5 hover:border-yellow-300/40">
                  <img src={category.imageUrl} alt={category.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.tone}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
                  <div className="relative flex h-full flex-col justify-end p-5">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-yellow-100 backdrop-blur">
                      <Icon size={21} />
                    </span>
                    <strong className="mt-4 block text-lg text-white">{category.name}</strong>
                    <span className="mt-1 block max-w-sm text-sm leading-5 text-neutral-200">{category.description}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="grid gap-8">
          {categories.map((category) => (
            <CategoryBlock key={category.name} category={category.name} description={category.description} />
          ))}
        </div>
      </section>
    </main>
  );
}

function CategoryBlock({ category, description }: { category: string; description: string }) {
  const filtered = articles.filter((article) => article.category === category);
  const categoryMeta = categories.find((item) => item.name === category) ?? categories[0];
  const Icon = categoryMeta.icon;

  return (
    <section id={slugify(category)} className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-yellow-200">
            <Icon size={18} />
            <p className="text-xs font-black uppercase">{category}</p>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{description}</h2>
        </div>
        <span className="hidden rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-neutral-300 sm:inline-flex">10 matérias</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {filtered.map((article, index) => (
          <article key={article.title} className="flex min-h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 xl:flex-col">
            <div className="relative h-auto w-28 shrink-0 overflow-hidden bg-neutral-800 xl:h-44 xl:w-full">
              <img src={articleImages[article.category]?.[index] ?? heroImage} alt={article.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
              <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-black text-yellow-100 backdrop-blur">{article.readTime}</span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-yellow-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-yellow-200">{article.category}</span>
                <BookOpenText size={16} className="text-neutral-400" />
              </div>
              <h3 className="mt-4 text-lg font-black leading-tight text-white">{article.title}</h3>
              <p className="mt-3 text-sm leading-6 text-neutral-300">{article.summary}</p>
              <ul className="mt-4 grid gap-2 text-sm text-neutral-200">
                {article.tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <ArrowRight size={14} className="mt-1 shrink-0 text-yellow-300" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto grid gap-2 pt-5">
                <a href={article.videoUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-red-500/15 px-3 text-xs font-black text-red-100 transition hover:bg-red-500/25">
                  <PlayCircle size={16} />
                  Vídeo no YouTube
                </a>
                <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 px-3 text-xs font-black text-neutral-100 transition hover:border-yellow-300/40 hover:text-yellow-200">
                  <ExternalLink size={15} />
                  Fonte: {article.sourceLabel}
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
