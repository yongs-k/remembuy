// Runs the API server and the Vite dev server together; Ctrl+C stops both.
// The game, link/photo analysis and locker sync all need the API server, and
// forgetting it leaves the app on its error states.
import { spawn } from 'node:child_process'

const children = [
  spawn('npm', ['run', 'dev:server'], { stdio: 'inherit', shell: true }),
  spawn('npm', ['run', 'dev:web', '--', ...process.argv.slice(2)], { stdio: 'inherit', shell: true }),
]

function stopAll(code = 0) {
  for (const child of children) if (child.exitCode === null) child.kill()
  process.exit(code)
}

for (const child of children) child.on('exit', (code) => stopAll(code ?? 0))
process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
