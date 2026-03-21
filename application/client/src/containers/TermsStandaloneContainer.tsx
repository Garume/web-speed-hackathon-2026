import { lazy, Suspense, useEffect, useId, useState } from "react";

import { TermPage } from "@web-speed-hackathon-2026/client/src/components/term/TermPage";
import { TermsStandaloneShell } from "@web-speed-hackathon-2026/client/src/components/term/TermsStandaloneShell";
import { useDocumentTitle } from "@web-speed-hackathon-2026/client/src/hooks/use_document_title";
import {
  addDialogOpenRequestListener,
  openDialog,
} from "@web-speed-hackathon-2026/client/src/utils/dialog";

const AuthModalContainer = lazy(() =>
  import("@web-speed-hackathon-2026/client/src/containers/AuthModalContainer").then((module) => ({
    default: module.AuthModalContainer,
  })),
);

export const TermsStandaloneContainer = () => {
  useDocumentTitle("利用規約 - CaX");

  const authModalId = useId();
  const [isAuthModalMounted, setIsAuthModalMounted] = useState(false);
  const [pendingDialogId, setPendingDialogId] = useState<string | null>(null);

  useEffect(() => {
    return addDialogOpenRequestListener((dialogId) => {
      if (dialogId === authModalId) {
        setIsAuthModalMounted(true);
        setPendingDialogId(dialogId);
      }
    });
  }, [authModalId]);

  useEffect(() => {
    if (pendingDialogId == null) {
      return;
    }

    let requestId = 0;
    const tryOpen = () => {
      if (openDialog(pendingDialogId)) {
        setPendingDialogId((currentId) => (currentId === pendingDialogId ? null : currentId));
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
  }, [pendingDialogId]);

  return (
    <>
      <TermsStandaloneShell authModalId={authModalId}>
        <TermPage />
      </TermsStandaloneShell>

      <Suspense fallback={null}>
        {isAuthModalMounted ? <AuthModalContainer id={authModalId} onUpdateActiveUser={() => {}} /> : null}
      </Suspense>
    </>
  );
};
