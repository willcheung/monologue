import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// A real socket around the existing Web Request/Response handlers. No Next build,
// fetch stub, hosted endpoint, or additional authentication route is involved.
export async function loopbackServer(handler: (request: Request) => Promise<Response> | Response) {
  const failures: Error[] = [];
  const requests: string[] = [];
  let origin = "";
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (let i = 0; i < incoming.rawHeaders.length; i += 2) headers.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1]);
      const method = incoming.method ?? "GET";
      // Resolve only the path; never let an absolute request target choose a host.
      const pathname = new URL(incoming.url ?? "/", origin).pathname;
      requests.push(`${method} ${pathname}`);
      const request = new Request(`${origin}${incoming.url ?? "/"}`, {
        method, headers, ...(chunks.length && method !== "GET" && method !== "HEAD" ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await handler(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error("Loopback handler failed"));
      outgoing.writeHead(500).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    origin, requests, failures,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
