import { lazy, Suspense, useEffect, useId, useState } from "react";

import { TermPage } from "@web-speed-hackathon-2026/client/src/components/term/TermPage";
import { TermsStandaloneShell } from "@web-speed-hackathon-2026/client/src/components/term/TermsStandaloneShell";

const AuthModalContainer = lazy(() =>
  import("@web-speed-hackathon-2026/client/src/containers/AuthModalContainer").then((module) => ({
    default: module.AuthModalContainer,
  })),
);

export const TermsStandaloneContainer = () => {
  const authModalId = useId();
  const [isAuthModalMounted, setIsAuthModalMounted] = useState(false);
  const [shouldOpenDialog, setShouldOpenDialog] = useState(false);

  useEffect(() => {
    if (!shouldOpenDialog) {
      return;
    }

    let requestId = 0;
    const tryOpen = () => {
      const dialog = document.getElementById(authModalId);
      if (dialog instanceof HTMLDialogElement) {
        if (!dialog.open) {
          dialog.showModal();
        }
        setShouldOpenDialog(false);
        return;
      }

      requestId = window.requestAnimationFrame(tryOpen);
    };

    tryOpen();
    return () => {
      if (requestId !== 0) {
        window.cancelAnimationFrame(requestId);
      }
    };
  }, [authModalId, shouldOpenDialog]);

  return (
    <>
      <TermsStandaloneShell
        onOpenAuthModal={() => {
          setIsAuthModalMounted(true);
          setShouldOpenDialog(true);
        }}
      >
        <TermPage />
      </TermsStandaloneShell>

      <Suspense fallback={null}>
        {isAuthModalMounted ? (
          <AuthModalContainer id={authModalId} onUpdateActiveUser={() => {}} />
        ) : null}
      </Suspense>
    </>
  );
};
