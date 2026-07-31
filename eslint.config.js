import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'stats.html'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Правило изоляции (Architecture.md).
  // Обращения к Supabase живут только в src/api/. Без линтера это правило
  // не держится: через месяц появится «ну тут же быстрее напрямую».
  // ─────────────────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Supabase вызывается только из src/api/. Добавь функцию в слой api и импортируй её.',
            },
          ],
          patterns: [
            {
              group: ['**/api/client', '**/api/supabase/**', '@/api/client', '@/api/supabase/**'],
              message: 'Клиент Supabase — внутренняя деталь src/api/. Импортируй публичные функции из @/api.',
            },
          ],
        },
      ],
    },
  },
)
