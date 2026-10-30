import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { setupSocketHandlers } from "./sockets/socketHandler.js";

async function bootstrap() {
  try {
    await connectDB();

    const app = createApp();
    const server = http.createServer(app);

    const io = new SocketIOServer(server, {
      cors: {
        origin: [env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
        credentials: true
      }
    });

    setupSocketHandlers(io);

    server.listen(env.PORT, () => {
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
