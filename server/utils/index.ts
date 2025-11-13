import * as cheerio from 'cheerio';

/**
 * url是否是合法的微信公众号文章url
 * @param url
 */
export function urlIsValidMpArticle(url: string) {
  try {
    return new URL(url).hostname === 'mp.weixin.qq.com';
  } catch (e) {
    return false;
  }
}

/**
 * 处理文章的 html 内容
 * @description 服务端采用 cheerio 库解析并修改 html 内容
 * @param rawHTML 公众号文章的原始 html
 * @param format 要处理的格式
 * @remarks 服务端工具函数
 */
export function normalizeHtml(rawHTML: string, format: 'html' | 'text' = 'html'): string {
  const $ = cheerio.load(rawHTML);
  const $jsArticleContent = $('#js_article');

  // #js_content 默认是不可见的(通过js修改为可见)，需要移除该样式
  $jsArticleContent.find('#js_content').removeAttr('style');

  // 删除无用dom元素
  $jsArticleContent.find('#js_top_ad_area').remove();
  $jsArticleContent.find('#js_tags_preview_toast').remove();
  $jsArticleContent.find('#content_bottom_area').remove();

  // 删除所有 script 标签（在 #js_article 上下文中）
  $jsArticleContent.find('script').remove();

  $jsArticleContent.find('#js_pc_qr_code').remove();
  $jsArticleContent.find('#wx_stream_article_slide_tip').remove();

  // 处理图片懒加载（全局处理所有 img）
  $('img').each((i, el) => {
    const $img = $(el);
    const imgUrl = $img.attr('src') || $img.attr('data-src');
    if (imgUrl) {
      $img.attr('src', imgUrl);
    }
  });

  if (format === 'text') {
    // 获取纯文本内容
    const text = $jsArticleContent.text().trim().replace(/\n+/g, '\n').replace(/ +/g, ' ');
    // 分割成行
    const lines = text.split('\n');
    // 过滤掉全空白行（^\s*$ 表示行首到行尾全是空白字符）
    const filteredLines = lines.filter(line => !/^\s*$/.test(line));

    // 重新连接行
    return filteredLines.join('\n');
  } else if (format === 'html') {
    // 获取修改后的 HTML
    let bodyCls = $('body').attr('class');
    const pageContentHTML = $('<div>').append($jsArticleContent.clone()).html();
    return `<!DOCTYPE html>
  <html lang="zh_CN">
  <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0,viewport-fit=cover">
      <meta name="referrer" content="no-referrer">
      <style>
          #js_row_immersive_stream_wrap {
              max-width: 667px;
              margin: 0 auto;
          }
          #js_row_immersive_stream_wrap .wx_follow_avatar_pic {
            display: block;
            margin: 0 auto;
          }
          #page-content,
          #js_article_bottom_bar,
          .__page_content__ {
              max-width: 667px;
              margin: 0 auto;
          }
          img {
              max-width: 100%;
          }
          .sns_opr_btn::before {
              width: 16px;
              height: 16px;
              margin-right: 3px;
          }
      </style>
  </head>
  <body class="${bodyCls}">
  ${pageContentHTML}
  </body>
  </html>
    `;
  } else {
    throw new Error(`format not supported: ${format}`);
  }
}
