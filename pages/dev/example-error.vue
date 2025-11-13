<script setup>
import * as Sentry from '@sentry/nuxt';
function triggerClientError() {
  throw new Error('Nuxt Button Error');
}
function getSentryData() {
  Sentry.startSpan(
    {
      name: 'Example Frontend Span',
      op: 'test',
    },
    async () => {
      await $fetch('/api/sentry-example');
    }
  );
}
</script>

<template>
  <button id="errorBtn" @click="triggerClientError">Throw Client Error</button>
  <button type="button" @click="getSentryData">Throw Server Error</button>
</template>
