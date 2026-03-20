/**
 * Сортировка CSS/SCSS-свойств (Recess order) в .vue и отдельных .scss.
 * Без stylelint-config-standard-scss — только порядок свойств, без лишних правил.
 * @see https://github.com/stormwarning/stylelint-config-recess-order
 */
/** @type {import('stylelint').Config} */
module.exports = {
  extends: ["stylelint-config-html/vue", "stylelint-config-recess-order"],
  overrides: [
    {
      files: ["**/*.scss"],
      customSyntax: "postcss-scss",
    },
  ],
};
