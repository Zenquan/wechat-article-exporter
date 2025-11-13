<template>
  <div :class="isDev ? 'debug-screens' : ''" class="flex flex-col h-screen">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <UNotifications />
    <UModals />
  </div>
</template>

<script setup lang="ts">
import { ModuleRegistry } from 'ag-grid-community';
import { AllEnterpriseModule, LicenseManager } from 'ag-grid-enterprise';
import { isDev } from '~/config';

const runtimeConfig = useRuntimeConfig();

ModuleRegistry.registerModules([AllEnterpriseModule]);
LicenseManager.setLicenseKey(runtimeConfig.public.aggridLicense);
</script>

<style>
@import 'style.css';
</style>
