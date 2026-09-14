import { providerErrorMessage } from "./provider-errors";
import { env } from "cloudflare:workers";
type ProviderResponse = {
  data?: { index: number; embedding: number[] }[];
  choices?: { message?: { content?: string } }[];
  usage?: Record<string, number>;
};
export function database() {
  if (!env.DB)
    throw Error("Storage is temporarily unavailable. Please try again.");
  return env.DB;
}
export function runtimeValue(key: string) {
  return (env as unknown as Record<string, string>)[key] || "";
}
/**
 * Tenant isolation depends entirely on `oai-authenticated-user-id`, injected by a trusted
 * identity gateway in front of this Worker. The header is unauthenticated at this layer: if
 * the app is ever reachable without that gateway, anyone can set the header and read any
 * tenant's datasets.
 *
 * Documenting that risk is not a control, so a deployment must assert the gateway exists by
 * setting IDENTITY_GATEWAY. Without the assertion the API refuses to serve rather than
 * silently trusting a client-supplied header. See docs/delivery/ai-risk-assessment.md
 * (RISK-07) and docs/delivery/raid-log.md (ISS-01).
 */
export function ownerOf(request: Request) {
  if (!runtimeValue("IDENTITY_GATEWAY"))
    throw new ApiError(
      "This deployment has not declared a trusted identity gateway, so requests cannot be attributed to an owner. Set IDENTITY_GATEWAY for a gateway-fronted deployment, or use the local single-user demo.",
      503,
    );
  const id = request.headers.get("oai-authenticated-user-id");
  if (!id)
    throw new ApiError("Sign in to access your private review workspace.", 401);
  return id;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 3 * 1024 * 1024)
    throw new ApiError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Request body is missing.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 3 * 1024 * 1024) {
      await reader.cancel();
      throw new ApiError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError("Request must contain valid JSON.");
  }
}
export async function seal(value: string) {
  const secret = runtimeValue("KEY_ENCRYPTION_SECRET");
  if (!secret)
    throw new ApiError(
      "Secure key storage is not configured. Contact the app owner.",
      503,
    );
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(value),
    ),
  );
  return btoa(String.fromCharCode(...iv, ...data));
}
export async function unseal(value: string) {
  const data = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(runtimeValue("KEY_ENCRYPTION_SECRET")),
  );
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "decrypt",
  ]);
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: data.slice(0, 12) },
      key,
      data.slice(12),
    ),
  );
}
export async function providerSettings(owner: string) {
  const s = await database()
    .prepare("SELECT * FROM settings WHERE owner = ?")
    .bind(owner)
    .first<{
      encrypted_key: string | null;
      model: string;
      embedding_model: string;
    }>();
  let key = "",
    keyInvalid = false;
  if (s?.encrypted_key)
    try {
      key = await unseal(s.encrypted_key);
    } catch {
      keyInvalid = true;
    }
  return {
    key,
    configured: !!s?.encrypted_key,
    keyInvalid,
    model: s?.model || "gpt-4.1-mini",
    embeddingModel: s?.embedding_model || "text-embedding-3-small",
  };
}
export async function consumeBudget(owner: string) {
  const day = new Date().toISOString().slice(0, 10),
    id = owner + ":" + day;
  const r = await database()
    .prepare(
      "INSERT INTO usage (id,owner,day,requests,input_tokens,output_tokens) VALUES (?,?,?,1,0,0) ON CONFLICT(id) DO UPDATE SET requests=requests+1 WHERE requests<100 RETURNING requests",
    )
    .bind(id, owner, day)
    .first();
  if (!r)
    throw new ApiError(
      "Daily limit reached: 100 AI requests. Try again tomorrow or use the evidence engine.",
      429,
    );
  return id;
}
export async function providerCall(
  owner: string,
  key: string,
  path: string,
  payload: unknown,
) {
  const usageId = await consumeBudget(owner);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/" + path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    throw new ApiError(
      "The AI provider could not be reached. Your data is saved; please retry.",
      503,
    );
  }
  if (!response.ok) {
    let code = "";
    try {
      const body = (await response.json()) as {
        error?: { code?: string; type?: string };
      };
      code = body.error?.code || body.error?.type || "";
    } catch {}
    throw new ApiError(providerErrorMessage(response.status, code), 503);
  }
  const result = (await response.json()) as ProviderResponse;
  const usage = result.usage || {};
  await database()
    .prepare(
      "UPDATE usage SET input_tokens=input_tokens+?,output_tokens=output_tokens+? WHERE id=?",
    )
    .bind(
      usage.prompt_tokens || usage.input_tokens || usage.total_tokens || 0,
      usage.completion_tokens || usage.output_tokens || 0,
      usageId,
    )
    .run();
  return result;
}
