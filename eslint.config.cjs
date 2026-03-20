const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const pluginVue = require("eslint-plugin-vue");
const vueParser = require("vue-eslint-parser");
const eslintConfigPrettier = require("eslint-config-prettier");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "dist-ssr/",
      "coverage/",
      "eslint.config.cjs",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        "import.meta": "readonly",
      },
    },
  },
  eslintConfigPrettier,
  // Runeword stat lines embed trusted `<span class="varies">` from bundled data, not user input.
  {
    files: ["src/components/RuneWordCard.vue"],
    rules: {
      "vue/no-v-html": "off",
    },
  },
];
