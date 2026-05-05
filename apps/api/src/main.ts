import { buildApp } from "./server.js";
import { config } from "./config.js";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
