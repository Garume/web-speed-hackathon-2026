import type { JSX, ReactNode } from "react";

import * as TermPageModule from "../../../client/src/components/term/TermPage";
import * as TermsStandaloneShellModule from "../../../client/src/components/term/TermsStandaloneShell";

type TermPageExport = {
  TermPage: () => JSX.Element;
};

type TermsStandaloneShellExport = {
  TermsStandaloneShell: ({
    children,
    onOpenAuthModal,
  }: {
    children: ReactNode;
    onOpenAuthModal: () => void;
  }) => JSX.Element;
};

const TermPage = (
  "default" in TermPageModule &&
  typeof TermPageModule.default === "object" &&
  TermPageModule.default !== null
    ? (TermPageModule.default as TermPageExport)
    : (TermPageModule as unknown as TermPageExport)
).TermPage;

const TermsStandaloneShell = (
  "default" in TermsStandaloneShellModule &&
  typeof TermsStandaloneShellModule.default === "object" &&
  TermsStandaloneShellModule.default !== null
    ? (TermsStandaloneShellModule.default as TermsStandaloneShellExport)
    : (TermsStandaloneShellModule as unknown as TermsStandaloneShellExport)
).TermsStandaloneShell;

export const TermsStaticApp = () => {
  return (
    <TermsStandaloneShell onOpenAuthModal={() => {}}>
      <TermPage />
    </TermsStandaloneShell>
  );
};
