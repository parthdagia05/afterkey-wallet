import { getCloudflareContext } from "@opennextjs/cloudflare";

// Production: Cloudflare secrets are copied onto process.env by the OpenNext runtime.
// Local `next dev`: secrets live in .dev.vars and arrive via the Cloudflare dev context.
export async function secret(name: string): Promise<string | undefined> {
  if (process.env[name]) return process.env[name];
  try {
    const { env } = await getCloudflareContext({ async: true });
    const v = (env as Record<string, unknown>)[name];
    return typeof v === "string" ? v : undefined;
  } catch {
    return undefined;
  }
}
