import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nextVitals from "eslint-config-next/core-web-vitals.js";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url))
});

const config = [
  ...compat.config(nextVitals),
  {
    ignores: [
      ".next/**",
      ".next*/**",
      ".next.*",
      ".next.*/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      "out/**",
    ],
  },
];

export default config;
