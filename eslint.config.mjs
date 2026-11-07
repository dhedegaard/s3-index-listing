import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier/flat'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  tseslint.configs.strictTypeChecked,
  {
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      // Namespace-only zod imports let bundlers tree-shake it and keep its locales out.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportDeclaration[source.value=/^zod(\\/v[34])?(\\/mini)?$/] > :matches(ImportSpecifier, ImportDefaultSpecifier)',
          message: "Import zod as a namespace: `import * as z from 'zod'`.",
        },
        {
          // A fixed name lets the `z.core`/`z.locales` checks below see every access.
          selector:
            "ImportNamespaceSpecifier[parent.source.value=/^zod(\\/v[34])?(\\/mini)?$/]:not([local.name='z'])",
          message: 'Name the zod namespace `z`.',
        },
        {
          selector:
            ':matches(ExportNamedDeclaration, ExportAllDeclaration, ImportExpression)[source.value=/^zod/]',
          message: 'Import zod statically in the module that uses it; no re-exports or `import()`.',
        },
        {
          selector: 'ImportDeclaration[source.value=/^zod(\\/v4)?\\/locales(\\/index(\\.js)?)?$/]',
          message: 'Import a single locale from `zod/v4/locales/<lang>.js` instead.',
        },
        {
          selector:
            ":matches(MemberExpression[object.name='z'][property.name=/^(core|locales)$/], MemberExpression[object.name='z'][computed=true][property.value=/^(core|locales)$/], VariableDeclarator[init.name='z'] > ObjectPattern)",
          message:
            "Runtime `z.core`/`z.locales` access pulls in every locale; import from 'zod/v4/core' instead.",
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'src/codegen/**',
    // Config files aren't part of the TypeScript project, so the type-aware
    // rules can't parse them.
    '*.config.mjs',
  ]),
])

export default eslintConfig
