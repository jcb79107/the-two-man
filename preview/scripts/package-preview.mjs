import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("out");
const output = path.resolve(".vercel/output");
await mkdir(output, { recursive: true });
await cp(root, path.join(output, "static"), { recursive: true });
const files = await readdir(root, { recursive: true });
const routes = [
  {
    src: "/(.*)",
    headers: {
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
    continue: true,
  },
];
for (const file of files.filter(
  (f) => f.endsWith(".html") && f !== "404.html",
)) {
  const route = file === "index.html" ? "" : file.slice(0, -5);
  routes.push({ src: `^/${route}/?$`, dest: `/${file}` });
}
routes.push(
  { handle: "filesystem" },
  { src: "/(.*)", dest: "/404.html", status: 404 },
);
await writeFile(
  path.join(output, "config.json"),
  JSON.stringify({ version: 3, routes }, null, 2),
);
console.log(
  `Packaged ${files.length} static files. No functions or environment variables.`,
);
