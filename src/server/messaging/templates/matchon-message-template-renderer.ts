import type {
  MatchonTemplateButton,
  MatchonTemplateVariableSchema,
} from "../domain/matchon-message-types";

export type RenderMatchonTemplateResult = {
  renderedBody: string;
  renderedSubject: string | null;
  renderedButtons: MatchonTemplateButton[];
  missingVariables: string[];
  unusedVariables: string[];
  unknownVariables: string[];
  isValid: boolean;
  errors: string[];
};

function collectPlaceholders(text: string): string[] {
  const keys: string[] = [];
  const re = /\{([^{}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    keys.push(m[1].trim());
  }
  return keys;
}

function renderText(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{([^{}]+)\}/g, (_full, key: string) => {
    const k = key.trim();
    return Object.prototype.hasOwnProperty.call(variables, k)
      ? variables[k]
      : `{${k}}`;
  });
}

function stripDangerousHtml(text: string): string {
  return text
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

export function renderMatchonMessageTemplate(params: {
  template: {
    body: string;
    subject?: string | null;
    variables?: MatchonTemplateVariableSchema | null;
    buttons?: MatchonTemplateButton[] | null;
  };
  variables: Record<string, string | number | null | undefined>;
}): RenderMatchonTemplateResult {
  const schema = params.template.variables ?? {};
  const errors: string[] = [];
  const missingVariables: string[] = [];
  const unknownVariables: string[] = [];

  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(params.variables ?? {})) {
    if (v === null || v === undefined || String(v).trim() === "") {
      continue;
    }
    normalized[k] = String(v);
  }

  for (const [key, def] of Object.entries(schema)) {
    if (def?.required && !(key in normalized)) {
      missingVariables.push(key);
    }
  }

  const usedInTemplate = new Set([
    ...collectPlaceholders(params.template.body),
    ...collectPlaceholders(params.template.subject ?? ""),
    ...(params.template.buttons ?? []).flatMap((b) =>
      collectPlaceholders(`${b.url ?? ""}${b.urlMobile ?? ""}${b.urlPc ?? ""}`),
    ),
  ]);

  for (const key of Object.keys(normalized)) {
    if (!usedInTemplate.has(key) && !(key in schema)) {
      unknownVariables.push(key);
    }
  }

  const unusedVariables = Object.keys(normalized).filter(
    (k) => !usedInTemplate.has(k),
  );

  if (missingVariables.length) {
    errors.push(`필수 변수 누락: ${missingVariables.join(", ")}`);
  }

  const renderedBody = stripDangerousHtml(
    renderText(params.template.body, normalized),
  );
  const renderedSubject = params.template.subject
    ? stripDangerousHtml(renderText(params.template.subject, normalized))
    : null;

  const renderedButtons = (params.template.buttons ?? []).map((b) => ({
    ...b,
    url: b.url ? renderText(b.url, normalized) : b.url,
    urlMobile: b.urlMobile ? renderText(b.urlMobile, normalized) : b.urlMobile,
    urlPc: b.urlPc ? renderText(b.urlPc, normalized) : b.urlPc,
  }));

  for (const b of renderedButtons) {
    const urls = [b.url, b.urlMobile, b.urlPc].filter(Boolean) as string[];
    for (const u of urls) {
      if (/\{[^{}]+\}/.test(u)) {
        errors.push(`버튼 URL 변수가 치환되지 않았습니다: ${b.name}`);
      }
    }
  }

  if (!renderedBody.trim()) {
    errors.push("렌더된 본문이 비어 있습니다.");
  }

  return {
    renderedBody,
    renderedSubject,
    renderedButtons,
    missingVariables,
    unusedVariables,
    unknownVariables,
    isValid: errors.length === 0,
    errors,
  };
}
