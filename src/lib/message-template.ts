export type MessageTemplateContext = Record<string, string | number | boolean | null | undefined>;

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const availableMessageVariables = [
  { key: "username", label: "Usuario do Instagram" },
  { key: "name", label: "Nome retornado pela Meta" },
  { key: "first_name", label: "Primeiro nome" },
  { key: "instagram_user_id", label: "ID do lead" },
  { key: "is_follower", label: "Segue o perfil" },
  { key: "automation_name", label: "Nome da automacao" },
  { key: "profile_url", label: "URL do perfil" },
] as const;

export function renderMessageTemplate(value: string, context: MessageTemplateContext) {
  return value.replace(VARIABLE_PATTERN, (_match, key: string) => {
    const replacement = context[key];
    return replacement === null || replacement === undefined ? "" : String(replacement);
  });
}