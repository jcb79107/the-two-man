import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("out");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = decodeURIComponent(url.pathname);
    const base = resolve(root, "." + path);
    if (base !== root && !base.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const candidates =
      path === "/"
        ? [resolve(root, "index.html")]
        : [base, base + ".html", resolve(base, "index.html")];
    for (const file of candidates) {
      try {
        if (!(await stat(file)).isFile()) continue;
        res.writeHead(200, {
          "Content-Type": types[extname(file)] ?? "application/octet-stream",
          "X-Robots-Tag": "noindex, nofollow",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(req.method === "HEAD" ? undefined : await readFile(file));
        return;
      } catch {}
    }
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(await readFile(resolve(root, "404.html")));
  } catch {
    res.writeHead(400);
    res.end("Invalid request");
  }
});
server.listen(3027, "127.0.0.1", () =>
  console.log("Staged preview: http://127.0.0.1:3027"),
);
