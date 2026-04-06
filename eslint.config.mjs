import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
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
