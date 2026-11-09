import { cp, mkdir, readdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("out");
const output = path.resolve(".vercel/output");
const live = process.argv.includes("--live");
const html = await readFile(path.join(root, "index.html"), "utf8");
if (live && (!html.includes("Between seasons") || html.includes("Reset demo"))) {
  throw new Error("Refusing live packaging: run npm run build:live first.");
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(root, path.join(output, "static"), { recursive: true });
const files = await readdir(root, { recursive: true });
const routes = [{
  src: "/(.*)",
  headers: {
    ...(!live ? {"X-Robots-Tag": "noindex, nofollow"} : {}),
    "X-Content-Type-Options": "nosniff",
  },
  continue: true,
}];
if (live) {
  const config = JSON.parse(await readFile("../vercel.json", "utf8"));
  for (const r of config.redirects) {
    routes.push({src: "^" + r.source.replace(":slug", "[^/]+") + "/?$", headers: {Location:r.destination}, status:r.permanent ? 308 : 307});
  }
  routes.push({src:"^/review/?$",headers:{"X-Robots-Tag":"noindex, nofollow"},continue:true});
}
for (const file of files.filter(f=>f.endsWith(".html") && f!=="404.html")) {
  const route = file === "index.html" ? "" : file.slice(0,-5);
  routes.push({src:`^/${route}/?$`,dest:`/${file}`});
}
routes.push({handle:"filesystem"},{src:"/(.*)",dest:"/404.html",status:404});
await writeFile(path.join(output,"config.json"),JSON.stringify({version:3,routes},null,2));
console.log(`Packaged ${files.length} static files for ${live ? "offseason production" : "preview"}. No functions or environment variables.`);
