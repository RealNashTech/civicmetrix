import "dotenv/config"

import { startWorkers } from "../src/workers"

async function main() {
  console.log("Starting CivicMetrix workers...")
  await startWorkers()
}

main().catch((err) => {
  console.error("Worker startup failure", err)
  process.exit(1)
})
