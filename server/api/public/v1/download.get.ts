import TurndownService from 'turndown';
import { USER_AGENT } from '~/config';
import { urlIsValidMpArticle, normalizeHtml } from '~/server/utils';

interface SearchBizQuery {
  url: string;
  format: string;
}

export default defineEventHandler(async event => {
  const query = getQuery<SearchBizQuery>(event);
  if (!query.url) {
    return {
      base_resp: {
        ret: -1,
        err_msg: 'url不能为空',
      },
    };
  }

  const url = decodeURIComponent(query.url.trim());
  if (!urlIsValidMpArticle(url)) {
    return {
      base_resp: {
        ret: -1,
        err_msg: 'url不合法',
      },
    };
  }

  const format: string = (query.format || 'html').toLowerCase();
  if (!['html', 'markdown', 'text'].includes(format)) {
    return {
      base_resp: {
        ret: -1,
        err_msg: '不支持的format',
      },
    };
  }

  const rawHtml = await fetch(url, {
    headers: {
      Referer: 'https://mp.weixin.qq.com/',
      Origin: 'https://mp.weixin.qq.com',
      'User-Agent': USER_AGENT,
    },
  }).then(res => res.text());

  switch (format) {
    case 'html':
      return normalizeHtml(rawHtml, 'html');
    case 'text':
      return normalizeHtml(rawHtml, 'text');
    case 'markdown':
      const turndownService = new TurndownService();
      return turndownService.turndown(normalizeHtml(rawHtml, 'html'));
    default:
      throw new Error(`Unknown format ${format}`);
  }
});
