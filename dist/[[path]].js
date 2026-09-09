/**
 * CF Pages Functions — 统一入口
 * 文件: functions/[[path]].js（位于项目根目录，拦截全部路径）
 *
 * 策略：
 *   - /api/*（含 /api）→ API 路由：path 去掉 /api 前缀，交给 apiHandler
 *   - 其他路径        → 静态文件/SPA：通过 env.ASSETS.fetch() 透传
 *
 * env.ASSETS.fetch() 是 Pages 内置静态资产 fetcher，不会触发函数重入。
 */

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const pathname = url.pathname

  // API 路由：去掉 /api 前缀后转交 apiHandler
  if (pathname.startsWith('/api/') || pathname === '/api') {
    const stripped = pathname === '/api' ? '/' : pathname.slice(4)
    const apiUrl = new URL(stripped + url.search, url.origin)

    const isBody = !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    const bodyText = isBody ? await request.clone().text() : undefined
    const apiReq = new Request(apiUrl, {
      method: request.method,
      headers: request.headers,
      body: bodyText,
      redirect: request.redirect
    })

    // 动态导入 apiHandler（来自同级的 functions/api/[[path]].js）
    const { onRequest: apiHandler } = await import('./functions/api/[[path]].js')
    return apiHandler({ request: apiReq, env, params: {}, waitUntil: context.waitUntil, passThroughOnException: context.passThroughOnException })
  }

  // 非 API → 静态文件（SPA fallback via Pages 内置 ASSETS）
  return env.ASSETS.fetch(request)
}
