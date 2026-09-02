import { serve } from "@hono/node-server";
import { buildApp } from "./app.js";
import { buildComposition } from "./composition.js";

const composition = buildComposition();
const app = buildApp(composition);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`zero-api listening on http://localhost:${info.port}`);
});
