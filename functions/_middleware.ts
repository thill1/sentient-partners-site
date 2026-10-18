/**
 * www → apex, permanently, preserving path and query
 * (e.g. www.sentientpartners.ai/capabilities.pdf → sentientpartners.ai/capabilities.pdf).
 * Pages' _redirects cannot match on host, so this runs as middleware.
 * _routes.json excludes hashed/static asset folders to keep invocations low.
 */
interface MiddlewareContext {
  request: Request;
  next: () => Promise<Response>;
}

export const onRequest = async ({ request, next }: MiddlewareContext) => {
  const url = new URL(request.url);
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }
  return next();
};
