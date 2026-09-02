import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { bootstrapWebMcp } from "./webmcp-bootstrap.js";
import "./styles.css";

bootstrapWebMcp();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
