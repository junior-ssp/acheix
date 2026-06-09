import { BackButton } from "@/components/back-button";
import { NoCopyPolicyGuard } from "@/components/no-copy-policy-guard";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Política de Privacidade</h1>
        <BackButton label="Voltar" />
      </div>
      <NoCopyPolicyGuard />
      <section data-no-copy-policy className="mt-6 select-none space-y-7 rounded-lg border border-white/10 bg-neutral-900 p-6 text-neutral-200">
        <Block title="Dados Tratados">
          <p>O Achei X poderá tratar dados cadastrais, dados de contato, localização informada, anúncios, imagens, vídeos, textos, interesses enviados, pagamentos, preferências, dados técnicos do dispositivo, IP, logs, evidências de segurança e registros de uso da plataforma.</p>
          <p>Ao enviar imagens, o usuário declara possuir autorização e responsabilidade sobre o conteúdo enviado, incluindo pessoas, placas, objetos, documentos, imóveis, bens e qualquer informação visível.</p>
        </Block>

        <Block title="Moderação, OCR e Segurança">
          <p>Para proteger usuários e reduzir exposição a conteúdos ilegais, o Achei X poderá analisar automaticamente imagens, textos e links enviados à plataforma. Essa análise pode incluir moderação por IA, leitura de textos presentes em imagens por OCR, geração de hash de imagens, classificação de risco, verificação de links, identificação de QR Codes suspeitos e criação de logs administrativos.</p>
          <p>Esses tratamentos são realizados para prevenção a fraudes, proteção da vida e integridade dos usuários, prevenção de crimes, exercício regular de direitos, cumprimento de obrigações legais e legítimo interesse de segurança da plataforma.</p>
        </Block>

        <Block title="LGPD e Bases Legais">
          <p>O tratamento de dados poderá ocorrer com base em execução de contrato, cumprimento de obrigação legal ou regulatória, exercício regular de direitos, proteção da vida ou da incolumidade física, prevenção a fraudes e legítimo interesse, sempre observando a legislação aplicável.</p>
          <p>Quando o tratamento depender de consentimento, o usuário poderá revogá-lo pelos canais disponíveis, ciente de que isso pode limitar funcionalidades essenciais da plataforma.</p>
        </Block>

        <Block title="Compartilhamento">
          <p>Dados poderão ser compartilhados com provedores de infraestrutura, armazenamento, pagamentos, notificações, segurança, moderação, suporte técnico e serviços necessários ao funcionamento do Achei X.</p>
          <p>Quando exigido por lei, ordem de autoridade competente, investigação, defesa de direitos ou prevenção de danos, o Achei X poderá preservar e fornecer registros, logs, hashes, imagens, textos, dados cadastrais, pagamentos, IPs e demais informações pertinentes.</p>
        </Block>

        <Block title="Responsabilidade do Usuário">
          <p>O usuário é responsável por não enviar documentos de terceiros, dados sensíveis, imagens íntimas, conteúdo infantil inadequado, materiais ilícitos, links suspeitos, QR Codes fraudulentos, comprovantes falsos, dados bancários indevidos ou qualquer conteúdo que viole direitos, leis ou estes Termos.</p>
          <p>A plataforma não se responsabiliza por crimes, fraudes, violações de direitos, dados ou conteúdos inseridos por usuários, sem prejuízo das medidas de moderação, bloqueio, auditoria e cooperação legal cabíveis.</p>
        </Block>

        <Block title="Retenção e Exclusão de Dados">
          <p>Os dados dos anúncios são armazenados pelo período necessário para prestação do serviço, cumprimento de obrigações legais, prevenção a fraudes, segurança da plataforma e exercício regular de direitos.</p>
          <p>Anúncios expirados poderão ser mantidos temporariamente para possibilitar renovação pelo usuário. Após o período de recuperação, os dados poderão ser excluídos permanentemente dos servidores da plataforma.</p>
          <p>Logs de segurança, auditoria, moderação, pagamentos, hashes, bloqueios e registros relacionados a suspeitas de fraude ou ilegalidade poderão ser preservados por prazo maior quando necessário para proteção dos usuários, defesa da plataforma ou cumprimento de exigências legais.</p>
        </Block>

        <Block title="Direitos do Titular">
          <p>Nos termos da LGPD, o usuário poderá solicitar confirmação de tratamento, acesso, correção, portabilidade, anonimização, eliminação, informação sobre compartilhamento e revisão de decisões automatizadas quando aplicável.</p>
          <p>Solicitações poderão ser limitadas quando houver obrigação legal de retenção, necessidade de preservação de prova, prevenção a fraude, segurança, abuso de direito ou proteção de terceiros.</p>
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
