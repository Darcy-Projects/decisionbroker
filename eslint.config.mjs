import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Architectural boundaries (see docs/live/architecture.md). Dependencies point
// inward: interface tier → core → ports ← infrastructure. These rules make the
// boundaries mechanical so they can't silently erode.
const DATA_TIER_ADAPTERS = [
  "@/infra/db/**",
  "@/infra/storage/**",
  "@/infra/auth/**",
  "@/infra/clock/**",
  "@/infrastructure/db/**",
  "@/infrastructure/storage/**",
  "@/infrastructure/auth/**",
  "@/infrastructure/clock/**",
  "**/infrastructure/db/**",
  "**/infrastructure/storage/**",
  "**/infrastructure/auth/**",
];

const ANY_INFRASTRUCTURE = [
  "@/infra/**",
  "@/infrastructure/**",
  "**/infrastructure/**",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Interface tier: may call application services (and the composition root in
    // infrastructure/config), but NEVER a data-tier adapter directly.
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: DATA_TIER_ADAPTERS,
              message:
                "Interface tier must not touch the data tier. Go through an application service (see @/infra/config/container).",
            },
            {
              group: ["drizzle-orm", "drizzle-orm/*", "postgres"],
              message:
                "No direct DB access in the interface tier. Use an application service.",
            },
          ],
        },
      ],
    },
  },
  {
    // Core (middle tier): pure business logic. No framework, no I/O, no adapters.
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ANY_INFRASTRUCTURE,
              message:
                "The core must not depend on infrastructure. Define a port in @/core/ports and let an adapter implement it.",
            },
            {
              group: [
                "next",
                "next/*",
                "react",
                "react-dom",
                "drizzle-orm",
                "drizzle-orm/*",
                "postgres",
                "@/app/**",
              ],
              message:
                "The core is framework- and I/O-free. Keep web/db/UI concerns in the outer tiers.",
            },
          ],
        },
      ],
    },
  },
  {
    // Infrastructure may implement core ports, but must not depend on the
    // interface tier.
    files: ["src/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**", "**/app/**"],
              message: "Infrastructure must not import the interface tier.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
