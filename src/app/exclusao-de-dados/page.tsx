import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exclusao de Dados | UaiFlow",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12 text-zinc-950">
      <article className="mx-auto max-w-3xl leading-7">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">UaiFlow</p>
        <h1 className="mt-3 text-3xl font-semibold">Exclusao de Dados</h1>
        <p className="mt-6">
          Usuarios podem solicitar a exclusao dos dados operacionais associados ao seu identificador do Instagram.
        </p>
        <p className="mt-4">
          Para remover dados, envie uma mensagem ao responsavel pela conta do Instagram conectada informando seu @ do Instagram e solicitando a exclusao. Os registros de contato, fila e eventos relacionados serao removidos do banco quando a solicitacao for confirmada.
        </p>
        <p className="mt-4">
          Esta pagina existe para atender ao cadastro do app na Meta. Antes da publicacao final, podemos trocar este texto por um e-mail ou formulario oficial do seu negocio.
        </p>
      </article>
    </main>
  );
}
