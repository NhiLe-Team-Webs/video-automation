import js from "@eslint/js";

export default [
  {
    languageOptions: {
      globals: {
        ...js.configs.recommended.languageOptions.globals,
        console: "readonly",
        process: "readonly",
      },
    },
  },
];
