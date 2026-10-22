import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Áreas isoladas: só a LP ((marketing)) usa as seções de marketing e o motion pesado.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/(marketing)/**", "src/features/marketing/**", "src/components/motion/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/marketing", "@/features/marketing/*", "@/components/motion", "@/components/motion/*"],
              message: "Só a área (marketing) importa features/marketing e components/motion.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
