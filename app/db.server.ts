import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb+srv://ronitshrestha1101_db_user:898EYEcetVfrjhjD@cluster0.yxihcio.mongodb.net/?appName=Cluster0";

declare global {
  var __dbClient: MongoClient | undefined;
}

let client: MongoClient;

if (process.env.NODE_ENV === "production") {
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
} else {
  if (!globalThis.__dbClient) {
    globalThis.__dbClient = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }
  client = globalThis.__dbClient;
}

export { client };
