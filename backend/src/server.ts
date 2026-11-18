import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.info(`TEKNOPIPE API escuchando en el puerto ${env.PORT}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error("No fue posible iniciar la API", error);
  process.exitCode = 1;
});
