import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      globals: {
        AbortController: "readonly",
        console: "readonly",
        document: "readonly",
        Event: "readonly",
        fetch: "readonly",
        navigator: "readonly",
        Response: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        window: "readonly",
        Deno: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      ...reactHooks.configs.recommended.rules
    }
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      globals: {
        caches: "readonly",
        fetch: "readonly",
        Promise: "readonly",
        self: "readonly"
      }
    }
  }
];
