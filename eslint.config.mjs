import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/coverage/**',
      '**/dist/**',
      'final_docs_of_project/**'
    ]
  },
  js.configs.recommended,
  ...nextVitals.map((config) => {
    if (config.ignores) return config;
    return {
      ...config,
      files: config.files
        ? config.files.map((pattern) => `apps/web/${pattern}`)
        : ['apps/web/**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
      rules: {
        ...(config.rules || {}),
        '@next/next/no-img-element': 'off'
      }
    };
  }),
  {
    files: ['apps/api/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        fetch: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        FormData: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    }
  }
];
