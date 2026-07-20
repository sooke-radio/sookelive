import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-vars':'off',
      '@typescript-eslint/no-explicit-any': 'off'
      //  [
      //   'warn',
      //   {
      //     vars: 'all',
      //     args: 'after-used',
      //     ignoreRestSiblings: false,
      //     argsIgnorePattern: '^_',
      //     varsIgnorePattern: '^_',
      //     destructuredArrayIgnorePattern: '^_',
      //     caughtErrorsIgnorePattern: '^(_|ignore)',
      //   },
      // ],
    },
  },
]

export default eslintConfig
