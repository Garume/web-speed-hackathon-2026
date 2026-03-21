import type { ReactNode } from "react";

import { TermsNavigation } from "@web-speed-hackathon-2026/client/src/components/term/TermsNavigation";

interface Props {
  authModalId: string;
  children: ReactNode;
}

export const TermsStandaloneShell = ({ authModalId, children }: Props) => {
  return (
    <div className="relative z-0 flex justify-center font-sans">
      <div className="bg-cax-surface text-cax-text flex min-h-screen max-w-full">
        <aside className="relative z-10">
          <TermsNavigation authModalId={authModalId} />
        </aside>
        <main className="relative z-0 w-screen max-w-screen-sm min-w-0 shrink pb-12 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
};
