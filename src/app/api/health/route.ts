/** Liveness probe for process managers and load balancers: GET /api/health */
export function GET() {
  return Response.json({ status: 'ok', uptime: process.uptime() })
}
