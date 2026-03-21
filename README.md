# Blizzless Runewords

Справочник рунных слов для частного сервера Diablo II Blizzless: на странице собраны **оригинальные и переработанные рунворды**, которые реально используются на сервере — с рунами, типами предметов, уровнем и подсказками по отличиям от классики.

**Опубликованная версия:** [raferty.github.io/blizzless-runewords](https://raferty.github.io/blizzless-runewords/)

---

## Возможности

- таблица и сетка рунвордов, поиск и фильтры (сокеты, переработка, новые);
- выбор рун в сайдбаре — подсветка «собранных» рун и полных рецептов;
- русский и английский интерфейс (язык сохраняется в `localStorage`).

**Стек:** Vue 3, TypeScript, Vite, Pinia, SCSS.

## Локальная разработка

### Требования

- Node.js 18+
- npm или yarn

### Установка

```bash
npm install
# или
yarn install
```

### Запуск dev-сервера

```bash
npm run dev
# или
yarn dev
```

В `vite.config.ts` задан `base: "/blizzless-runewords/"`, поэтому удобно открывать приложение по адресу:

`http://localhost:5173/blizzless-runewords/`

### Сборка

```bash
npm run build
# или
yarn build
```

Артефакты — в каталоге `dist/`.

### Предпросмотр production-сборки

```bash
npm run preview
# или
yarn preview
```

### Проверка типов (TypeScript)

```bash
npm run typecheck     # vue-tsc --noEmit
# или
yarn typecheck
```

### Линтинг и форматирование

```bash
npm run lint          # ESLint + Stylelint (порядок CSS/SCSS-свойств)
npm run lint:fix      # ESLint + Stylelint с автоисправлением
npm run stylelint     # только Stylelint
npm run stylelint:fix # сортировка свойств в .vue / .scss / .css
npm run format        # Prettier
npm run format:check  # проверка стиля без записи
```

Конфиги: `eslint.config.cjs` (flat config), `.prettierrc`, `.prettierignore`, `stylelint.config.cjs` ([Recess order](https://github.com/stormwarning/stylelint-config-recess-order) — сортировка свойств без лишних CSS-правил). Для Prettier подключён `eslint-config-prettier`.

## Деплой на GitHub Pages

```bash
npm run deploy
# или
yarn deploy
```

Скрипт собирает проект (`predeploy` → `build`) и публикует `dist/` в ветку `gh-pages`. В настройках репозитория укажите источник Pages: ветка `gh-pages`, корень.

Итоговый URL (при стандартном имени репозитория):

`https://<username>.github.io/blizzless-runewords/`

Если меняется имя репозитория или путь публикации — обновите `base` в `vite.config.ts`.

## Переменные окружения

Сейчас не используются; базовый путь задаётся в Vite. При появлении API можно вынести настройки в `.env`.

## Структура репозитория

| Путь | Назначение |
|------|------------|
| `src/components/` | UI: таблица, карточки, фильтры, поиск |
| `src/composables/` | композаблы (руны, дебаунс и т.д.) |
| `src/store/` | Pinia: язык, тексты, данные рунвордов |
| `src/types/` | общие TypeScript-типы |
| `src/utils/` | утилиты (массивы, проверка «полного» набора рун) |
| `src/shared/` | константы: руны, типы предметов, данные рунвордов |
