<template>
  <div class="credentials">
    <UIcon
      @click="isOpen = true"
      name="i-famicons:grid-sharp"
      class="size-8"
      :class="
        status === 'active'
          ? 'bg-blue-500'
          : status === 'inactive'
            ? 'bg-gray-400'
            : status === 'warning'
              ? 'bg-orange-500'
              : ''
      "
    />

    <USlideover v-model="isOpen">
      <UCard
        class="flex flex-col flex-1"
        :ui="{ body: { base: 'flex-1' }, ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }"
      >
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="font-bold text-2xl">自动抓取 Credentials</h2>
          </div>
        </template>

        <div>
          <UTabs :items="tabs" class="w-full">
            <template #item="{ item }">
              <div v-if="item.key === 'wxdown'">
                <div class="text-sm my-5">
                  <p class="flex justify-between items-end">
                    <UButton size="xs" @click="downloadProgram" color="blue">下载 wxdown-service 程序</UButton>
                  </p>
                </div>
                <div class="flex items-center gap-3 mb-3">
                  <UInput
                    class="w-80"
                    type="url"
                    v-model="wsURL"
                    :disabled="monitoring || wsMonitoring"
                    placeholder="请输入 ws 监听地址"
                  />
                  <UButton
                    v-if="!wsMonitoring"
                    :disabled="!wsURL || monitoring"
                    color="black"
                    @click="startListenService"
                    >开始监控</UButton
                  >
                  <UButton icon="i-line-md:loading-twotone-loop" color="green" v-else @click="stopListenService"
                    >监控中，结束监控</UButton
                  >
                </div>
              </div>
              <div v-if="item.key === 'mitmproxy'">
                <div class="text-sm my-5">
                  <p class="flex justify-between items-end">
                    <span>执行以下命令启动 mitmproxy 代理服务：</span>
                    <UButton size="xs" @click="downloadPlugin" color="blue">下载 credential.py</UButton>
                  </p>
                  <p class="bg-black text-white p-2 my-2 rounded-md"><code>mitmdump -s credential.py -q</code></p>
                </div>
                <div class="flex items-center gap-3 mb-3">
                  <UInput
                    class="w-60"
                    v-model="apiKey"
                    :disabled="authorized || wsMonitoring"
                    placeholder="请输入API Key"
                  />
                  <UButton
                    class="px-5"
                    :loading="authorizeBtnLoading"
                    :disabled="!apiKey || authorized || wsMonitoring || monitoring"
                    @click="authorize"
                    >认证</UButton
                  >

                  <UButton v-if="!monitoring" :disabled="!authorized || wsMonitoring" color="black" @click="start"
                    >开始监控</UButton
                  >
                  <UButton icon="i-line-md:loading-twotone-loop" color="green" v-else @click="stop"
                    >监控中，结束监控</UButton
                  >
                </div>
              </div>
            </template>
          </UTabs>
          <ul class="flex flex-col gap-4 p-1 overflow-y-scroll h-[calc(100vh-20rem)] no-scrollbar">
            <li
              v-for="credential in credentials"
              :key="credential.biz"
              class="border rounded-md hover:ring ring-blue-500 hover:shadow-md transition-all duration-300 px-8 py-3"
            >
              <p>公众号名称：{{ credential.nickname || '--' }}</p>
              <p>fakeid: {{ credential.biz }}</p>
              <p>获取时间: {{ credential.time }}</p>
              <span v-if="credential.valid" class="font-sans font-bold text-green-500">有效</span>
              <span v-else class="font-sans font-bold text-rose-500">已过期</span>
            </li>
          </ul>
        </div>
      </UCard>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import type { ParsedCredential } from '~/types/credential';
import { getInfoCache } from '~/store/v2/info';
import { CREDENTIAL_LIVE_MINUTES, CREDENTIAL_API_HOST } from '~/config';

const isOpen = ref(false);

const tabs = [
  {
    key: 'wxdown',
    label: 'wxdown 程序版',
  },
  {
    key: 'mitmproxy',
    label: 'mitmproxy 插件版',
  },
];

const credentials = useLocalStorage<ParsedCredential[]>('auto-detect-credentials:credentials', []);
for (const item of credentials.value) {
  item.valid = Date.now() < item.timestamp + 1000 * 60 * CREDENTIAL_LIVE_MINUTES;
}
const validCredentialCount = computed(() => credentials.value.filter(c => c.valid).length);

interface Credential {
  url: string;
  set_cookie: string;
  timestamp: number;
}

let timer: number;
const monitoring = ref(JSON.parse(localStorage.getItem('auto-detect-credentials:monitoring') as string) || false);
const status = computed(() => {
  if (!monitoring.value && !wsMonitoring.value) {
    return 'inactive';
  } else if (validCredentialCount.value > 0) {
    return 'active';
  } else {
    return 'warning';
  }
});

function start() {
  monitoring.value = true;
  const oldTimer = localStorage.getItem('auto-detect-credentials:monitoring-timer');
  if (oldTimer) {
    window.clearInterval(parseInt(oldTimer));
  }
  fetchCredentials();
  timer = window.setInterval(() => {
    fetchCredentials();
  }, 3000);
  localStorage.setItem('auto-detect-credentials:monitoring', 'true');
  localStorage.setItem('auto-detect-credentials:monitoring-timer', timer.toString());
}
function stop() {
  monitoring.value = false;
  localStorage.setItem('auto-detect-credentials:monitoring', 'false');
  window.clearInterval(timer);
}

onMounted(() => {
  if (monitoring.value) {
    start();
  }
});

// 下载 credential.py 插件
async function downloadPlugin() {
  const link = document.createElement('a');
  link.href = '/plugins/credential.py';
  link.download = 'credential.py';
  link.click();
}

// 下载 wxdown-service 程序
async function downloadProgram() {
  const link = document.createElement('a');
  link.target = '_blank';
  link.href = 'https://github.com/wechat-article/wxdown-service/releases';
  link.download = 'wxdown-service';
  link.click();
}

const apiKey = ref(localStorage.getItem('auto-detect-credentials:apikey') as string);
const authorizeBtnLoading = ref(false);
const authorized = ref(false);

// 认证
async function authorize() {
  try {
    authorizeBtnLoading.value = true;
    const response = await fetch(`${CREDENTIAL_API_HOST}/authorize`, {
      method: 'GET',
      headers: {
        Authorization: apiKey.value,
      },
    });
    if (response.status === 200) {
      authorized.value = true;
      localStorage.setItem('auto-detect-credentials:apikey', apiKey.value);
      alert('认证成功');
    } else {
      authorized.value = false;
      localStorage.removeItem('auto-detect-credentials:apikey');
      alert('认证失败，请确认 API Key 是否正确');
    }
  } catch (error: any) {
    if (error.message === 'Failed to fetch') {
      alert('mitmproxy 服务未启动');
    } else {
      alert(error.message);
    }
    authorized.value = false;
  } finally {
    authorizeBtnLoading.value = false;
  }
}

// 获取数据
async function fetchCredentials() {
  let result: Credential[] = [];
  try {
    const response = await fetch(`${CREDENTIAL_API_HOST}/credentials`, {
      method: 'GET',
      headers: {
        Authorization: apiKey.value,
      },
    });
    if (response.status === 404) {
      result = [];
    } else if (response.status !== 200) {
      authorized.value = false;
      stop();
      return;
    } else {
      result = await response.json();
    }
  } catch (error) {
    console.error(error);
    authorized.value = false;
    stop();
    return;
  }

  const _credentials: ParsedCredential[] = [];
  for (const item of result) {
    const searchParams = new URL(item.url).searchParams;
    const __biz = searchParams.get('__biz')!;
    const uin = searchParams.get('uin')!;
    const key = searchParams.get('key')!;
    const pass_ticket = searchParams.get('pass_ticket')!;

    let wap_sid2 = null;
    const matchResult = item.set_cookie.match(/wap_sid2=(?<wap_sid2>.+?);/);
    if (matchResult && matchResult.groups && matchResult.groups.wap_sid2) {
      wap_sid2 = matchResult.groups.wap_sid2;
    }
    // 验证完整性
    if (!__biz || !uin || !key || !pass_ticket || !wap_sid2) {
      continue;
    }

    const info = await getInfoCache(__biz);
    _credentials.push({
      nickname: info?.nickname,
      biz: __biz,
      uin: uin,
      key: key,
      pass_ticket: pass_ticket,
      wap_sid2: wap_sid2,
      timestamp: item.timestamp,
      time: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      valid: Date.now() < item.timestamp + 1000 * 60 * CREDENTIAL_LIVE_MINUTES,
    });
  }
  credentials.value = _credentials.sort((a, b) => b.timestamp - a.timestamp);
}

const wsURL = ref('');
const wsMonitoring = ref(false);
let _ws: WebSocket | null = null;

async function startListenService() {
  const ws = new WebSocket(wsURL.value.trim());
  ws.addEventListener('open', () => {
    wsMonitoring.value = true;
    _ws = ws;
  });
  ws.addEventListener('message', async evt => {
    let result = [];
    try {
      result = JSON.parse(evt.data);
    } catch (e) {
      console.warn('解析失败: ', e);
    }
    const _credentials: ParsedCredential[] = [];
    for (const item of result) {
      const searchParams = new URL(item.url).searchParams;
      const __biz = searchParams.get('__biz')!;
      const uin = searchParams.get('uin')!;
      const key = searchParams.get('key')!;
      const pass_ticket = searchParams.get('pass_ticket')!;

      let wap_sid2 = null;
      const matchResult = item.set_cookie.match(/wap_sid2=(?<wap_sid2>.+?);/);
      if (matchResult && matchResult.groups && matchResult.groups.wap_sid2) {
        wap_sid2 = matchResult.groups.wap_sid2;
      }
      // 验证完整性
      if (!__biz || !uin || !key || !pass_ticket || !wap_sid2) {
        continue;
      }

      const info = await getInfoCache(__biz);
      _credentials.push({
        nickname: info?.nickname,
        biz: __biz,
        uin: uin,
        key: key,
        pass_ticket: pass_ticket,
        wap_sid2: wap_sid2,
        timestamp: item.timestamp,
        time: dayjs(item.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        valid: Date.now() < item.timestamp + 1000 * 60 * CREDENTIAL_LIVE_MINUTES,
      });
    }
    credentials.value = _credentials.sort((a, b) => b.timestamp - a.timestamp);
  });
  ws.addEventListener('close', () => {
    wsMonitoring.value = false;
    _ws = null;
  });
  ws.addEventListener('error', evt => {
    console.error(evt);
    alert('websocket连接失败');
  });
}
async function stopListenService() {
  if (_ws) {
    _ws.close();
  }
}
</script>
