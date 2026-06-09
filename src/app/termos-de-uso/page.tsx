import { BackButton } from "@/components/back-button";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Termos de Uso</h1>
        <BackButton label="Voltar" />
      </div>
      <section className="mt-6 space-y-7 rounded-lg border border-white/10 bg-neutral-900 p-6 text-neutral-200">
        <Block title="Responsabilidade dos Anunciantes">
          <p>O anunciante é o único responsável pela veracidade, legalidade, autenticidade, procedência e atualização das informações, imagens, vídeos, textos, preços, documentos e contatos que informar ou tentar publicar.</p>
          <p>É proibida a publicação, tentativa de publicação, envio ou divulgação de anúncios, imagens, textos, links ou contatos:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Com informações falsas, enganosas, duplicadas ou usadas para obter vantagem indevida;</li>
            <li>Relacionados a produtos, serviços, atividades, documentos, dados pessoais, pagamentos ou negociações ilícitas;</li>
            <li>Que violem direitos de terceiros, propriedade intelectual, imagem, honra, privacidade ou normas aplicáveis;</li>
            <li>Que contenham conteúdo ofensivo, discriminatório, sexual, violento, fraudulento, criminoso ou proibido por lei.</li>
          </ul>
          <p>A plataforma poderá remover anúncios, bloquear contas e negar reembolso quando houver violação destes Termos, tentativa de burlar sistemas de segurança ou risco jurídico para o Achei X.</p>
        </Block>

        <Block title="Conteúdos Proibidos">
          <p>São expressamente proibidos conteúdos envolvendo nudez, seminudez, pornografia, prostituição, serviços sexuais, exploração sexual, exploração infantil, abuso infantil, sexualização de menores, violência extrema, sangue excessivo, gore, tortura, cadáveres, mutilações, drogas ilícitas, armas, munições, explosivos, documentos pessoais, cartões bancários, comprovantes financeiros, QR Codes suspeitos, golpes, produtos roubados ou furtados, crimes cibernéticos, clonagem, venda de dados pessoais, ferramentas para atividades ilegais, animais silvestres protegidos, tráfico de animais, caça ilegal, contrabando, descaminho, medicamentos ilegais ou qualquer produto cuja comercialização seja proibida pela legislação brasileira.</p>
          <p>Pessoas podem aparecer em imagens quando estiverem em contexto comum e não sensível. Crianças em contexto familiar ou cotidiano podem aparecer desde que não exista indício de exploração, exposição inadequada, sexualização, violência, risco ou violação de direitos.</p>
        </Block>

        <Block title="Moderação Automática e Manual">
          <p>Toda imagem enviada para anúncio poderá passar por análise automática de segurança, incluindo detecção de pessoas, nudez, violência, drogas, armas, documentos, QR Codes, produtos ilegais, animais silvestres, mercadorias contrabandeadas, atividades criminosas e leitura de textos presentes nas imagens por OCR.</p>
          <p>Nenhuma imagem tem garantia de publicação. Imagens podem ser aprovadas, reprovadas automaticamente ou encaminhadas para revisão manual em caso de baixa confiança, suspeita, denúncia ou inconsistência.</p>
          <p>Por segurança, a plataforma poderá exibir apenas uma mensagem genérica de reprovação, sem revelar critérios técnicos, modelos, pontuações, regras internas ou detalhes que possam facilitar burla da moderação.</p>
          <p>A aprovação automática de uma imagem ou anúncio não significa validação jurídica, garantia de procedência ou endosso da plataforma. O usuário continua integralmente responsável pelo conteúdo e por qualquer consequência civil, administrativa ou criminal decorrente de sua conduta.</p>
        </Block>

        <Block title="Links, Contatos e Tentativas de Fraude">
          <p>O Achei X poderá bloquear mensagens, interesses, links externos, QR Codes, termos de captação, propostas suspeitas, tentativas de retirar usuários da plataforma, comprovantes suspeitos, documentos, dados bancários ou qualquer conteúdo que indique fraude, golpe, spam, prospecção indevida ou risco aos usuários.</p>
          <p>O usuário não deve enviar senhas, códigos, documentos de terceiros, dados bancários, links suspeitos ou informações sensíveis. O envio desses dados é de responsabilidade de quem os envia.</p>
        </Block>

        <Block title="Risco, Auditoria e Cooperação Legal">
          <p>A plataforma poderá gerar logs administrativos, hash de imagens, registros de tentativas de envio, score de risco, histórico de moderação, casos de confiança e segurança, bloqueios preventivos e evidências técnicas para proteger usuários, a plataforma e cumprir obrigações legais.</p>
          <p>Quando exigido por lei, ordem de autoridade competente ou necessidade legítima de defesa de direitos, o Achei X poderá preservar e fornecer registros relacionados a conteúdos, contas, anúncios, imagens, pagamentos, IPs, logs e demais informações pertinentes.</p>
        </Block>

        <Block title="Duração, Renovação e Exclusão de Anúncios">
          <p>Os anúncios publicados na plataforma possuem prazo de validade determinado conforme o plano contratado:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Plano Grátis: 30 dias, limitado a 1 anúncio gratuito por categoria a cada 90 dias.</li>
            <li>Plano Bronze: 60 dias.</li>
            <li>Plano Prata: 90 dias.</li>
            <li>Plano Ouro: 120 dias.</li>
            <li>Plano X6 Profissional: 6 meses, com até 10 anúncios ativos de veículos ou imóveis.</li>
            <li>Plano X12 Profissional: 12 meses, com até 20 anúncios ativos de veículos ou imóveis.</li>
          </ul>
          <p>Ao término do prazo contratado, o anúncio será automaticamente desativado e deixará de ser exibido em pesquisas, listagens e demais áreas públicas da plataforma.</p>
          <p>O anunciante poderá renovar ou republicar o anúncio durante o período de recuperação de até 7 dias após sua expiração.</p>
          <p>Após esse período, o anúncio, suas imagens, vídeos, descrições, interesses associados e demais conteúdos relacionados poderão ser excluídos permanentemente do sistema, sem possibilidade de recuperação.</p>
        </Block>

        <Block title="Negociações Entre Usuários">
          <p>A plataforma atua exclusivamente como intermediadora de anúncios e não participa das negociações realizadas entre compradores, vendedores, locadores, locatários ou prestadores.</p>
          <p>A plataforma não garante a concretização de negócios, a qualidade dos produtos ou serviços anunciados, a identidade plena dos usuários, a capacidade financeira das partes, a procedência de bens ou o cumprimento de acordos firmados fora da plataforma.</p>
          <p>Os usuários assumem integral responsabilidade pelas negociações, pagamentos, entregas, visitas, contratos, garantias, documentos e relações estabelecidas entre si.</p>
        </Block>

        <Block title="Contas, Bloqueios e Reincidência">
          <p>Cada usuário poderá manter apenas uma conta principal, salvo autorização expressa da plataforma.</p>
          <p>A criação de contas múltiplas para contornar limites, bloqueios, moderação, suspensões, denúncias ou regras comerciais poderá resultar no cancelamento permanente de todas as contas relacionadas.</p>
          <p>Tentativas repetidas de envio de conteúdo proibido, fraudulento, sensível ou criminoso poderão elevar o score de risco do usuário e resultar em bloqueio automático ou manual.</p>
        </Block>

        <Block title="Planos Pagos">
          <p>Os recursos contratados nos planos pagos permanecem disponíveis apenas durante o período de vigência correspondente, desde que o anúncio e a conta estejam em conformidade com estes Termos.</p>
          <p>Planos pagos oferecem prazo de publicação, limites de fotos, limites de anúncios e ferramentas operacionais, mas não garantem posição privilegiada nas buscas, aprovação de conteúdo, fechamento de negócio, visibilidade mínima ou resultado comercial.</p>
          <p>O Achei X não vende destaque pago, impulsionamento, anúncio fixo no topo, leilão de palavras-chave ou compra de posição.</p>
          <p>Salvo disposição legal em contrário, valores pagos não serão reembolsados quando o anúncio ou conta for removido, suspenso ou bloqueado por violação destes Termos, tentativa de fraude, envio de conteúdo proibido ou prática ilícita do usuário.</p>
        </Block>

        <Block title="Ordem de Exibição nas Buscas">
          <p>A ordem de exibição dos anúncios e prestadores poderá considerar relevância da busca, localização, categoria, qualidade das informações, reputação, taxa de resposta, quantidade de exposições recentes, tempo desde a última exibição e aleatoriedade controlada entre resultados equivalentes.</p>
          <p>Nenhum anunciante poderá ocupar permanentemente as primeiras posições apenas por pagamento. A plataforma busca distribuir oportunidades de exposição de forma equilibrada.</p>
        </Block>

        <Block title="Direito de Remoção de Conteúdo">
          <p>A plataforma reserva-se o direito de remover, ocultar, editar, suspender, reprovar ou excluir anúncios, imagens, conteúdos, interesses, pagamentos pendentes ou contas que:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Descumpram estes Termos de Uso;</li>
            <li>Gerem risco jurídico, reputacional, financeiro, técnico ou operacional à plataforma;</li>
            <li>Recebam denúncias fundamentadas ou sinais automáticos de risco;</li>
            <li>Sejam considerados incompatíveis com políticas internas, legislação brasileira ou proteção dos usuários.</li>
          </ul>
        </Block>

        <Block title="Limitação de Responsabilidade">
          <p>O Achei X adota medidas razoáveis de prevenção, moderação e segurança, mas não se responsabiliza por atos, omissões, crimes, fraudes, declarações, imagens, documentos, links, produtos, serviços, negociações ou conteúdos enviados por usuários.</p>
          <p>A plataforma não será responsável por prejuízos decorrentes de negociações entre usuários, informações incorretas fornecidas por anunciantes, condutas ilícitas de terceiros, links externos, comprovantes falsos, documentos indevidos, perda de dados após prazo de recuperação, falhas de provedores externos ou interrupções temporárias por manutenção, atualização ou falhas técnicas.</p>
          <p>Ao utilizar a plataforma, o usuário declara ter lido, compreendido e aceitado integralmente estes Termos de Uso.</p>
          <p className="font-black text-yellow-300">Obrigado e seja muito bem-vindo !!!</p>
        </Block>
      </section>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black text-yellow-300">{title}</h2>
      {children}
    </section>
  );
}
