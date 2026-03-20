import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { AppContainer } from "@web-speed-hackathon-2026/client/src/containers/AppContainer";

const rootElement = document.getElementById("app");

if (rootElement != null) {
  createRoot(rootElement).render(
    <BrowserRouter>
      <AppContainer />
    </BrowserRouter>,
  );
}
