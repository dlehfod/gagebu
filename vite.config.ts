import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 로컬 개발(npm run dev)에서도 배포 환경(Vercel)처럼 /api/advice 가 동작하도록 하는 개발용 미들웨어
const devApiPlugin = (env: Record<string, string>) => ({
  name: 'dev-api-advice',
  configureServer(server: any) {
    server.middlewares.use('/api/advice', async (req: any, res: any) => {
      try {
        process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk)
        const mod = await server.ssrLoadModule('/api/advice.ts')
        const request = new Request('http://localhost/api/advice', {
          method: req.method,
          headers: { 'Content-Type': 'application/json' },
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        })
        const response: Response = await mod.POST(request)
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(await response.text())
      } catch (e) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: String(e) }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), devApiPlugin(env)],
  }
})
