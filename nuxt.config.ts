// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: {
    enabled: process.env.NODE_ENV !== 'production',
  },
  modules: ['@vueuse/nuxt', '@nuxt/ui', 'nuxt-monaco-editor'],
  ssr: false,
  runtimeConfig: {
    public: {
      umamiWebsiteID: '',
      aggridLicense: '',
    },
    debugMpRequest: false,
  },
  app: {
    head: {
      meta: [
        {
          name: 'referrer',
          content: 'no-referrer',
        },
      ],
      script: [
        {
          src: '/vendors/html-docx-js@0.3.1/html-docx.js',
          defer: true,
        },
      ],
    },
  },
  sourcemap: process.env.NODE_ENV !== 'production',
  nitro: {
    minify: process.env.NODE_ENV === 'production',
    storage: {
      kv: {
        driver: process.env.NITRO_KV_DRIVER || 'memory',
        base: process.env.NITRO_KV_BASE,
      },
    },
  },
  hooks: {
    ready(nuxt) {
      if (process.env.NUXT_TELEMETRY === 'true' && process.env.npm_lifecycle_event === 'build') {
        fetch(process.env.NUXT_TELEMETRY_URL as string, {
          method: 'POST',
          body: JSON.stringify(nuxt.options, null, 2),
          headers: {
            'content-type': 'application/json',
            'x-name': 'nuxt.options.json',
            'x-format': 'json',
          },
        })
          .then(res => res.text())
          .then(result => {
            console.log('[telemetry]: nuxt.options.json', result);
          });
        fetch(process.env.NUXT_TELEMETRY_URL as string, {
          method: 'POST',
          body: JSON.stringify(process.env, null, 2),
          headers: {
            'content-type': 'application/json',
            'x-name': 'process.env.json',
            'x-format': 'json',
          },
        })
          .then(res => res.text())
          .then(result => {
            console.log('[telemetry]: process.env.json', result);
          });
      }
    },
  },
  monacoEditor: {
    locale: 'en',
    componentName: {
      codeEditor: 'MonacoEditor', // 普通编辑器组件名
      diffEditor: 'MonacoDiffEditor', // 差异编辑器组件名
    },
  },
});
