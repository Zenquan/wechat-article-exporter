interface UrlQuery {
  url: string;
}

export default defineEventHandler(async event => {
  const { url } = getQuery<UrlQuery>(event);

  const resp = await $fetch('/api/web/mp/searchbyurl?url=' + encodeURIComponent(url), {
    headers: {
      'X-Auth-Key': getHeader(event, 'X-Auth-Key')!,
      Cookie: getHeader(event, 'Cookie')!,
    },
  });

  console.log(resp);

  return resp;
});
