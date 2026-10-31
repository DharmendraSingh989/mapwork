import mongoose from "mongoose";
import path from "path";
import dns from "dns";
import { env } from "./env.js";

let mongod: any = null;
let isUsingInMemory = false;

export async function connectDB(): Promise<void> {
  try {
    let uri = env.MONGODB_URI;

    if (uri && uri.startsWith("mongodb+srv://")) {
      // Configure DNS servers to handle Windows DNS SRV query limitations
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
      } catch (dnsErr) {
        console.warn("Could not set custom DNS servers for SRV resolution:", dnsErr);
      }

      // Ensure database name is included
      if (uri.endsWith("/")) {
        uri = `${uri}mapforge?retryWrites=true&w=majority`;
      }
    }

    if (!uri) {
      if (env.NODE_ENV === "production") {
        throw new Error("MONGODB_URI is required in production.");
      }

      console.log("ℹ️ No MONGODB_URI provided. Starting in-memory MongoDB instance for local demonstration/testing...");
      process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(process.cwd(), ".cache/mongodb-binaries");
      const { MongoMemoryServer } = await import("mongodb-memory-server-core");
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      isUsingInMemory = true;
      console.log("✅ In-memory MongoDB started successfully at:", uri);
    } else {
      console.log("Connecting to MongoDB Atlas / configured cluster...");
    }

    await mongoose.connect(uri);

    if (isUsingInMemory) {
      console.log("⚠️ [PERSISTENCE MODE]: IN-MEMORY FALLBACK (Data will not persist across server restarts)");
    } else {
      console.log(`✅ [PERSISTENCE MODE]: REAL MONGODB ATLAS CONNECTED -> Host: ${mongoose.connection.host}, Database: ${mongoose.connection.name}`);
    }
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }
}

export function isInMemoryPersistence(): boolean {
  return isUsingInMemory;
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
    console.log("MongoDB disconnected.");
  } catch (error) {
    console.error("Error disconnecting MongoDB:", error);
  }
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
