import * as express from "express";
import * as cors from "cors";
import { createBaseServer } from "../utils/backend/base_backend/create";
import { createDamRouter } from "./routers/dam";

async function main() {
  const APP_ID = process.env.CANVA_APP_ID;

  if (!APP_ID) {
    throw new Error(
      `The CANVA_APP_ID environment variable is undefined. Set the variable in the project's .env file.`,
    );
  }

  const router = express.Router();

  router.use(cors());

  const damRouter = createDamRouter();
  router.use(damRouter);

  const server = createBaseServer(router);
  server.start(process.env.CANVA_BACKEND_PORT);
}

main();
