import * as webpack from "webpack";
import * as WebpackDevServer from "webpack-dev-server";
import { buildConfig } from "../../webpack.config";

async function start() {
  const config = buildConfig({
    appEntry: "./src/index.tsx",
    backendHost: "http://localhost:3001",
    devConfig: {
      port: 3000,
      enableHmr: true,
      appId: process.env.CANVA_APP_ID || "your-app-id",
      appOrigin: "http://localhost:3000",
      enableHttps: false
    }
  });

  const compiler = webpack(config);
  const server = new WebpackDevServer(config.devServer, compiler);
  
  console.log("Starting development server...");
  await server.start();
  console.log("Development server is running at http://localhost:3000");
}

start().catch(console.error); 