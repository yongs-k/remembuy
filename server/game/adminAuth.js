export function checkAdminAuth(req) {
  const configured = process.env.ADMIN_KEY
  if (!configured) return 'unconfigured'
  const provided = req.headers['x-admin-key']
  if (typeof provided !== 'string' || provided !== configured) return 'unauthorized'
  return 'ok'
}
