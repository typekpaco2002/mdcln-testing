// Pattern → fixture mapping for `scripts/export-figma-html.mjs`.
// Order matters: first match wins. Patterns are matched against the
// request URL pathname (without the origin or query string).

export const FIXTURE_MAP = [
  // Auth + user
  { pattern: /\/api\/(auth\/)?me\b/, fixture: "me.json" },
  { pattern: /\/api\/auth\/refresh\b/, fixture: "auth-refresh.json" },
  { pattern: /\/api\/auth\/credits\b/, fixture: "credits.json" },
  { pattern: /\/api\/credits\b/, fixture: "credits.json" },

  // Branding / config
  { pattern: /\/api\/branding\b/, fixture: "branding.json" },
  { pattern: /\/api\/config\b/, fixture: "config.json" },

  // Models / characters
  { pattern: /\/api\/models\b/, fixture: "models.json" },
  { pattern: /\/api\/characters\b/, fixture: "models.json" },

  // Generations
  { pattern: /\/api\/generations\b/, fixture: "generations.json" },
  { pattern: /\/api\/generation\/\w+/, fixture: "generation-single.json" },

  // Reels
  { pattern: /\/api\/(viral-)?reels\b/, fixture: "reels.json" },

  // Pricing / packages
  { pattern: /\/api\/(pricing|packages|plans)\b/, fixture: "pricing.json" },

  // Stripe / billing
  { pattern: /\/api\/stripe\/.*/, fixture: "stripe-empty.json" },
  { pattern: /\/api\/billing\b/, fixture: "billing.json" },

  // Flows
  { pattern: /\/api\/flows\/node-types\b/, fixture: "flows-node-types.json" },
  { pattern: /\/api\/flows\b/, fixture: "flows.json" },
  { pattern: /\/api\/flows\/runs\b/, fixture: "flows-runs.json" },

  // Voice / avatars
  { pattern: /\/api\/voices\b/, fixture: "voices.json" },
  { pattern: /\/api\/avatars\b/, fixture: "avatars.json" },

  // Admin
  { pattern: /\/api\/admin\/.*/, fixture: "admin-empty.json" },

  // Catch-all: empty 200 OK
  { pattern: /.*/, fixture: "_default.json" },
];
