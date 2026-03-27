const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** FastAPI returns `{ "detail": "..." }` — show that instead of raw JSON in the UI. */
export function errorMessageFromBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "Request failed";
  try {
    const j = JSON.parse(trimmed) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail))
      return j.detail.map((x) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: string }).msg) : String(x))).join("; ");
  } catch {
    /* not JSON */
  }
  return trimmed;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ApiGetOptions = {
  /** Extra attempts after the first (for cold starts, e.g. Render free tier). */
  retries?: number;
  /** Pause between attempts (ms). */
  retryDelayMs?: number;
  /** Abort single attempt after this long (ms). Omit for no per-attempt timeout. */
  timeoutMs?: number;
};

export async function apiGet<T>(
  path: string,
  options?: ApiGetOptions
): Promise<T> {
  const maxAttempts = (options?.retries ?? 0) + 1;
  const retryDelayMs = options?.retryDelayMs ?? 3000;
  const timeoutMs = options?.timeoutMs;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await delay(retryDelayMs);
    }

    const controller = timeoutMs != null ? new AbortController() : null;
    const timeoutId =
      timeoutMs != null
        ? setTimeout(() => controller!.abort(), timeoutMs)
        : null;

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        cache: "no-store",
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(errorMessageFromBody(detail) || `GET ${path} failed`);
      }
      return (await response.json()) as T;
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = e;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(String(lastError));
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(errorMessageFromBody(detail) || `POST ${path} failed`);
  }
  return (await response.json()) as T;
}

export function downloadUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(errorMessageFromBody(detail) || `UPLOAD ${path} failed`);
  }
  return (await response.json()) as T;
}
