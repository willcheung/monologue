import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { RequestOptions } from "node:https";

const fixture = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: fixture.lookup }));
vi.mock("node:https", () => ({ request: fixture.request }));
import { loadClientMetadata, metadataClientUrl, publicMetadataAddress } from "@/lib/mcp-client-metadata";

const id = "https://client.example/oauth/metadata.json";
const document = { client_id: id, client_name: "Metadata agent", redirect_uris: ["https://client.example/callback"], token_endpoint_auth_method: "none" };
function response(body: string, statusCode = 200, headers: Record<string, string | undefined> = { "content-type": "application/json" }) {
  fixture.request.mockImplementation((_url: URL, _options: RequestOptions, callback: (res: unknown) => void) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error: Error) => void };
    req.end = () => queueMicrotask(() => callback(Object.assign(Readable.from([Buffer.from(body)]), { statusCode, headers })));
    req.destroy = error => req.emit("error", error);
    return req;
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  response(JSON.stringify(document));
});

describe("CIMD secure metadata discovery", () => {
  it.each(["http://client.example/client.json", "https://client.example", "https://client.example/", "https://user:pass@client.example/client.json", "https://client.example/client.json#fragment", "https://client.example/client.json#", "https://client.example/client.json?", "https://client.example/client.json?q=1", "https://client.example:8443/client.json", "https://client.example/a/../client.json", "https://client.example/%2e/client.json", "https://client.example/a/.%2e/client.json"])("rejects invalid metadata URL %s before network access", async value => {
    expect(metadataClientUrl(value)).toBeNull();
    await expect(loadClientMetadata(value)).rejects.toThrow();
    expect(fixture.lookup).not.toHaveBeenCalled(); expect(fixture.request).not.toHaveBeenCalled();
  });
  it.each(["127.0.0.1", "10.0.0.1", "100.100.100.200", "169.254.169.254", "172.20.0.1", "192.168.1.1", "192.0.2.1", "198.18.0.1", "224.0.0.1", "255.255.255.255", "::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::1"])("blocks non-public address %s", async address => {
    expect(publicMetadataAddress(address)).toBe(false);
    fixture.lookup.mockResolvedValue([{ address, family: address.includes(":") ? 6 : 4 }]);
    await expect(loadClientMetadata(id)).rejects.toThrow(); expect(fixture.request).not.toHaveBeenCalled();
  });
  it("rejects mixed public/private DNS answers", async () => {
    fixture.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }]);
    await expect(loadClientMetadata(id)).rejects.toThrow(); expect(fixture.request).not.toHaveBeenCalled();
  });
  it("pins the checked IP to a fresh TLS socket, preventing a second DNS lookup", async () => {
    expect(await loadClientMetadata(id)).toMatchObject(document);
    const [url, options] = fixture.request.mock.calls[0];
    expect(url.hostname).toBe("client.example");
    expect(options).toMatchObject({ agent: false, family: 4, method: "GET", headers: { Accept: "application/json", "Accept-Encoding": "identity" } });
    const callback = vi.fn(); options.lookup("client.example", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, "93.184.216.34", 4);
    expect(fixture.lookup).toHaveBeenCalledTimes(1);
    expect(publicMetadataAddress("2606:4700:4700::1111")).toBe(true);
  });
  it.each([302, 401, 404, 500])("rejects HTTP %s without following redirects", async status => {
    response(JSON.stringify(document), status, { "content-type": "application/json", location: "http://127.0.0.1/private" });
    await expect(loadClientMetadata(id)).rejects.toThrow(); expect(fixture.request).toHaveBeenCalledTimes(1);
  });
  it.each([{ "content-type": "text/html" }, { "content-type": "application/json", "content-encoding": "gzip" }, { "content-type": "application/json", "content-length": "40000" }])("rejects unsafe response headers %j", async headers => {
    response(JSON.stringify(document), 200, headers);
    await expect(loadClientMetadata(id)).rejects.toThrow();
  });
  it("bounds streamed responses even without content-length", async () => {
    response(" ".repeat(32769)); await expect(loadClientMetadata(id)).rejects.toThrow();
  });
  it.each(["not json", JSON.stringify({ ...document, client_id: id + "/wrong" }), JSON.stringify({ client_id: id }), JSON.stringify({ ...document, redirect_uris: ["http://evil.example/callback"] }), JSON.stringify({ ...document, token_endpoint_auth_method: "client_secret_basic" }), JSON.stringify({ ...document, client_secret: "not-allowed" }), JSON.stringify({ ...document, grant_types: ["refresh_token"] })])("rejects malformed/unsupported metadata %#", async body => {
    response(body); await expect(loadClientMetadata(id)).rejects.toThrow();
  });
  it("includes DNS in its total deadline and never requests after cancellation", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    fixture.lookup.mockImplementation(() => new Promise(() => {}));
    try {
      const pending = loadClientMetadata(id);
      const rejected = expect(pending).rejects.toThrow("Metadata timeout");
      controller.abort(); await rejected;
      expect(timeout).toHaveBeenCalledWith(5000); expect(fixture.request).not.toHaveBeenCalled();
    } finally { timeout.mockRestore(); }
  });
  it("bounds concurrent discovery attempts and releases slots on errors", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    fixture.lookup.mockImplementation(() => new Promise(() => {}));
    const pending = Array.from({ length: 8 }, () => loadClientMetadata(id));
    const settled = Promise.allSettled(pending);
    try {
      await expect(loadClientMetadata(id)).rejects.toThrow("Metadata discovery busy");
      controller.abort();
      expect((await settled).every(result => result.status === "rejected")).toBe(true);
    } finally { timeout.mockRestore(); }
    fixture.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    expect(await loadClientMetadata(id)).toMatchObject(document);
  });
  it("propagates network failure without caching it; a later fresh attempt can succeed", async () => {
    fixture.lookup.mockRejectedValueOnce(new Error("DNS failed"));
    await expect(loadClientMetadata(id)).rejects.toThrow();
    expect(await loadClientMetadata(id)).toMatchObject(document);
    expect(fixture.lookup).toHaveBeenCalledTimes(2);
  });
});
