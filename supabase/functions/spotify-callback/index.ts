const APP_RETURN_URI = 'ev://spotify';

const ALLOWED_PARAMS = [
  'code',
  'state',
  'error',
  'error_description',
] as const;

Deno.serve((request) => {
  const incoming = new URL(request.url);
  const appReturn = new URL(APP_RETURN_URI);

  for (const key of ALLOWED_PARAMS) {
    const value = incoming.searchParams.get(key);
    if (value) appReturn.searchParams.set(key, value);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: appReturn.toString(),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
