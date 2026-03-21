import { createRoot, hydrateRoot } from "react-dom/client";

import { TermsStandaloneContainer } from "@web-speed-hackathon-2026/client/src/containers/TermsStandaloneContainer";

import "@web-speed-hackathon-2026/client/src/index.css";

const rootElement = document.getElementById("app");

if (rootElement != null) {
  if (rootElement.hasChildNodes()) {
    hydrateRoot(rootElement, <TermsStandaloneContainer />);
  } else {
    createRoot(rootElement).render(<TermsStandaloneContainer />);
  }
}
