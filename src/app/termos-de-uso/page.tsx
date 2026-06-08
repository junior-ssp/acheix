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
          <p>O anunciante é o único responsável pela veracidade, legalidade, autenticidade e atualização das informações publicadas.</p>
          <p>É proibida a publicação de anúncios:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Com informações falsas ou enganosas;</li>
            <li>Duplicados ou repetidos com o objetivo de obter vantagem indevida;</li>
            <li>Relativos a produtos, serviços ou atividades ilícitas;</li>
            <li>Que violem direitos de terceiros;</li>
            <li>Que utilizem imagens sem autorização;</li>
            <li>Que contenham conteúdo ofensivo, discriminatório ou ilegal.</li>
          </ul>
          <p>A plataforma poderá remover anúncios que violem estas regras sem aviso prévio e sem direito a reembolso.</p>
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
          <p>Após esse período, o anúncio, suas imagens, vídeos, descrições, mensagens associadas e demais conteúdos relacionados poderão ser excluídos permanentemente do sistema, sem possibilidade de recuperação.</p>
          <p>A plataforma não possui obrigação de armazenar ou manter cópias de segurança de anúncios expirados após o período de recuperação.</p>
          <p>Ao utilizar a plataforma, o usuário declara estar ciente e concordar com a política de expiração, renovação e exclusão automática de anúncios.</p>
        </Block>

        <Block title="Negociações Entre Usuários">
          <p>A plataforma atua exclusivamente como intermediadora de anúncios e não participa das negociações realizadas entre compradores, vendedores, locadores ou locatários.</p>
          <p>A plataforma não garante:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>A concretização de negócios;</li>
            <li>A qualidade dos produtos ou serviços anunciados;</li>
            <li>A identidade dos usuários;</li>
            <li>A capacidade financeira das partes envolvidas.</li>
          </ul>
          <p>Os usuários assumem integral responsabilidade pelas negociações realizadas.</p>
        </Block>

        <Block title="Prevenção a Fraudes e Golpes">
          <p>A plataforma poderá realizar verificações automáticas ou manuais para identificar atividades suspeitas.</p>
          <p>Anúncios ou contas que apresentem indícios de fraude, golpe, falsidade ideológica, uso indevido da plataforma ou qualquer atividade irregular poderão ser suspensos ou removidos imediatamente.</p>
          <p>A plataforma poderá solicitar documentos ou informações adicionais para validação da identidade dos usuários.</p>
        </Block>

        <Block title="Contas e Cadastro">
          <p>Cada usuário poderá manter apenas uma conta principal, salvo autorização expressa da plataforma.</p>
          <p>A criação de contas múltiplas para contornar limites de anúncios, bloqueios, suspensões ou regras comerciais poderá resultar no cancelamento permanente de todas as contas relacionadas.</p>
        </Block>

        <Block title="Planos Pagos">
          <p>Os recursos contratados nos planos pagos permanecerão disponíveis apenas durante o período de vigência correspondente.</p>
          <p>Os planos pagos oferecem recursos, prazo de publicação, limites de fotos, limites de anúncios e ferramentas operacionais, mas não garantem posição privilegiada nas buscas.</p>
          <p>O Achei X não vende destaque pago, impulsionamento, anúncio fixo no topo, leilão de palavras-chave ou compra de posição.</p>
          <p>A expiração do plano poderá resultar na perda dos recursos e funcionalidades contratados.</p>
          <p>Salvo disposição legal em contrário, valores pagos não serão reembolsados em razão da expiração natural do plano contratado.</p>
        </Block>

        <Block title="Ordem de Exibição nas Buscas">
          <p>A ordem de exibição dos anúncios e prestadores poderá considerar relevância da busca, localização, categoria, qualidade das informações, reputação, taxa de resposta, quantidade de exposições recentes, tempo desde a última exibição e aleatoriedade controlada entre resultados equivalentes.</p>
          <p>Nenhum anunciante poderá ocupar permanentemente as primeiras posições apenas por pagamento. A plataforma busca distribuir oportunidades de exposição de forma equilibrada entre os participantes.</p>
        </Block>

        <Block title="Direito de Remoção de Conteúdo">
          <p>A plataforma reserva-se o direito de remover, ocultar, editar, suspender ou excluir anúncios, conteúdos ou contas que:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Descumpram estes Termos de Uso;</li>
            <li>Gerem risco jurídico ou operacional à plataforma;</li>
            <li>Recebam denúncias fundamentadas;</li>
            <li>Sejam considerados incompatíveis com as políticas internas.</li>
          </ul>
        </Block>

        <Block title="Limitação de Responsabilidade">
          <p>A plataforma não será responsável por:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Prejuízos decorrentes de negociações entre usuários;</li>
            <li>Danos causados por informações incorretas fornecidas por anunciantes;</li>
            <li>Perda de dados após o prazo de recuperação dos anúncios;</li>
            <li>Interrupções temporárias do serviço por manutenção, atualização ou falhas técnicas.</li>
          </ul>
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
