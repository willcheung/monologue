import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import { z } from "zod";

const LIMIT = 32 * 1024;
const TIMEOUT = 5000;
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]] as const)
  blocked.addSubnet(address, prefix, "ipv6");

export function publicMetadataAddress(address: string) {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, "ipv4") :
    family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function metadataClientUrl(value: string) {
  try {
    const url = new URL(value);
    // Reject normalization tricks before URL parsing can remove dot segments.
    const rawPath = value.replace(/^https:\/\/[^/]+/i, "").split(/[?#]/)[0];
    if (value.length > 2048 || url.protocol !== "https:" || url.username || url.password ||
      value.includes("#") || value.includes("?") || /[\s\x00-\x1f\x7f]/.test(value) || (url.port && url.port !== "443") || url.pathname === "/" ||
      /\\/.test(value) || rawPath.split("/").some(part => /^(?:\.|%2e){1,2}$/i.test(part))) return null;
    return url;
  } catch { return null; }
}

const redirect = (value: string) => {
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.hash && (url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
  } catch { return false; }
};
const schema = z.object({
  client_id: z.string(), client_name: z.string().trim().min(1).max(80),
  redirect_uris: z.array(z.string().max(2048).refine(redirect)).min(1).max(5),
  token_endpoint_auth_method: z.literal("none").default("none"),
  grant_types: z.array(z.enum(["authorization_code", "refresh_token"])).min(1).default(["authorization_code", "refresh_token"]),
  response_types: z.array(z.literal("code")).length(1).default(["code"]),
  client_secret: z.never().optional(), client_secret_expires_at: z.never().optional(),
});

let activeLoads = 0;
export async function loadClientMetadata(clientId: string) {
  if (activeLoads >= 8) throw new Error("Metadata discovery busy");
  activeLoads++;
  try { return await fetchClientMetadata(clientId); }
  finally { activeLoads--; }
}

async function fetchClientMetadata(clientId: string) {
  const url = metadataClientUrl(clientId);
  if (!url) throw new Error("Invalid client metadata URL");
  const deadline = AbortSignal.timeout(TIMEOUT);
  // DNS is part of the total deadline; do not make a request after it expires.
  const addresses = await Promise.race([
    lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true }),
    new Promise<never>((_, reject) => deadline.addEventListener("abort", () => reject(new Error("Metadata timeout")), { once: true })),
  ]);
  if (deadline.aborted || !addresses.length || addresses.some(item => !publicMetadataAddress(item.address)))
    throw new Error("Client metadata must use public addresses");
  const pinned = addresses[0];
  const body = await new Promise<string>((resolve, reject) => {
    // One fresh socket, pinned DNS, normal TLS hostname/certificate verification.
    const req = request(url, { agent: false, family: pinned.family, signal: deadline, method: "GET",
      headers: { Accept: "application/json", "Accept-Encoding": "identity" },
      lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
    }, res => {
      const type = (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
      if (res.statusCode !== 200 || !/^application\/(?:json|[a-z0-9.+-]+\+json)$/.test(type) ||
        (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") ||
        Number(res.headers["content-length"] ?? 0) > LIMIT) {
        res.destroy(); req.destroy(new Error("Invalid metadata response")); return;
      }
      let size = 0; const chunks: Buffer[] = [];
      res.on("data", chunk => {
        const bytes = Buffer.from(chunk); size += bytes.length;
        if (size > LIMIT) { res.destroy(); req.destroy(new Error("Metadata too large")); }
        else chunks.push(bytes);
      });
      res.on("error", reject);
      res.on("aborted", () => reject(new Error("Incomplete metadata response")));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    req.on("error", reject); req.end();
  });
  const metadata = schema.parse(JSON.parse(body));
  if (metadata.client_id !== clientId || !metadata.grant_types.includes("authorization_code"))
    throw new Error("Invalid client metadata");
  return metadata;
}
