import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de privacidade | UaiFlow",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[var(--ms-background)] px-6 py-12 text-[var(--ms-foreground)]">
      <article className="panel mx-auto max-w-3xl p-6 leading-7 sm:p-8">
        <p className="eyebrow">UaiFlow</p>
        <h1 className="mt-3 text-3xl font-semibold">Politica de privacidade</h1>
        <p className="mt-6">
          Este app automatiza respostas no Instagram apenas depois de interacoes iniciadas pelo usuario, como comentarios, respostas a stories ou mensagens diretas.
        </p>
        <p className="mt-4">
          Armazenamos somente os dados operacionais necessarios para processar automacoes: identificadores do Instagram, nomes de usuario quando disponiveis, eventos recebidos, automacoes acionadas e status da fila de mensagens.
        </p>
        <p className="mt-4">
          Nao vendemos dados, nao fazemos disparos em massa para bases frias e nao compartilhamos informacoes fora dos provedores necessarios para operar o servico.
        </p>
      </article>
    </main>
  );
}
