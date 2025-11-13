/**
 * 退出登录接口
 */

import { proxyMpRequest } from '~/server/utils/proxy-request';
import { getTokenFromStore } from '~/server/utils/CookieStore';

export default defineEventHandler(async event => {
  const token = await getTokenFromStore(event);

  const response: Response = await proxyMpRequest({
    event: event,
    method: 'GET',
    endpoint: 'https://mp.weixin.qq.com/cgi-bin/logout',
    query: {
      t: 'wxm-logout',
      token: token!,
      lang: 'zh_CN',
    },
  });
  return {
    statusCode: response.status,
    statusText: response.statusText,
  };
});
