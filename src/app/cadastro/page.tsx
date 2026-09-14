import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "../auth-form";
import { BrandMark } from "@/components/brand-mark";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Criar Conta | UaiFlow",
};

export default async function CadastroPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 text-foreground md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6 sm:max-w-md">
        <Link className="flex items-center gap-2 self-center font-medium text-foreground" href="/">
          <div className="flex size-7 items-center justify-center overflow-hidden rounded-md bg-background shadow-sm ring-1 ring-border">
            <BrandMark className="size-7 object-cover" priority size={28} />
          </div>
          UaiFlow
        </Link>
        <AuthForm mode="signup" next="/dashboard" />
      </div>
    </main>
  );
}
