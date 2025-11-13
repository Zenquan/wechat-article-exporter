interface UrlQuery {
  url: string;
}

export default defineEventHandler(async event => {
  let { url } = getQuery<UrlQuery>(event);

  const name = await $fetch('/api/web/misc/accountname?url=' + encodeURIComponent(url));
  if (name) {
    console.log(`解析的公众号名称为: <${name}>`);
    const resp = await $fetch(`/api/web/mp/searchbiz?keyword=${name}&size=1`, {
      headers: {
        'X-Auth-Key': getHeader(event, 'X-Auth-Key')!,
        Cookie: getHeader(event, 'Cookie')!,
      },
    });
    if (resp.base_resp.ret === 0 && resp.list.length === 1 && resp.list[0].nickname === name) {
      return resp;
    } else {
      return {
        base_resp: {
          ret: -1,
          err_msg: '根据解析的名称搜索公众号失败',
        },
      };
    }
  } else {
    return {
      base_resp: {
        ret: -1,
        err_msg: 'url解析公众号名称失败',
      },
    };
  }
});
