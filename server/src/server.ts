import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { env, getAllowedOrigins } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { setupSocketHandlers } from "./sockets/socketHandler.js";

async function bootstrap() {
  try {
    await connectDB();

    const app = createApp();
    const server = http.createServer(app);
    const allowedOrigins = getAllowedOrigins();

    const io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          const isAllowed = allowedOrigins.some((allowed) => {
            if (allowed instanceof RegExp) return allowed.test(origin);
            return allowed === origin;
          });
          if (isAllowed) return callback(null, true);
          return callback(new Error(`Socket.IO CORS error: Origin ${origin} rejected`));
        },
        credentials: true
      }
    });

    setupSocketHandlers(io);

    server.listen(env.PORT, "0.0.0.0", () => {
      console.log(`🚀 MapForge Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`🔗 API Base: http://localhost:${env.PORT}/api/v1`);
      console.log(`📡 Real-Time Socket.IO initialized`);
    });
  } catch (error) {
    console.error("Fatal error starting server:", error);
    process.exit(1);
  }
}

bootstrap();
