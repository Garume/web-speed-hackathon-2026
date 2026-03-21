import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { TermsStandaloneContainer } from "@web-speed-hackathon-2026/client/src/containers/TermsStandaloneContainer";

import "@web-speed-hackathon-2026/client/src/index.css";

const rootElement = document.getElementById("app");

if (rootElement != null) {
  createRoot(rootElement).render(
    <BrowserRouter>
      <TermsStandaloneContainer />
    </BrowserRouter>,
  );
}
