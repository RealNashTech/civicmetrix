import { spawn } from "child_process"

const proc = spawn("next", ["start"], {
  stdio: "inherit",
  shell: true
})

proc.on("close", (code) => {
  process.exit(code ?? 0)
})
