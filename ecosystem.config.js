module.exports = {
  apps: [
    {
      name: "civicmetrix",
      script: "npm",
      args: "start",
      cwd: "/root/civicmetrix",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      node_args: "--max-old-space-size=1024",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
