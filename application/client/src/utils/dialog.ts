function getDialogElement(id: string): HTMLDialogElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLDialogElement ? element : null;
}

const DIALOG_OPEN_REQUEST_EVENT = "cax:dialog-open-request";

type DialogOpenRequestEvent = CustomEvent<{ id: string }>;

export function openDialog(id: string) {
  const dialog = getDialogElement(id);
  if (dialog != null && !dialog.open) {
    dialog.showModal();
    return true;
  }

  return dialog != null;
}

export function showDialog(id: string) {
  if (openDialog(id)) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(DIALOG_OPEN_REQUEST_EVENT, {
      detail: { id },
    }),
  );
}

export function closeDialog(id: string) {
  const dialog = getDialogElement(id);
  if (dialog != null && dialog.open) {
    dialog.close();
  }
}

export function addDialogOpenRequestListener(listener: (id: string) => void) {
  const handleOpenRequest = (event: Event) => {
    const { detail } = event as DialogOpenRequestEvent;
    if (typeof detail?.id === "string") {
      listener(detail.id);
    }
  };

  window.addEventListener(DIALOG_OPEN_REQUEST_EVENT, handleOpenRequest);
  return () => {
    window.removeEventListener(DIALOG_OPEN_REQUEST_EVENT, handleOpenRequest);
  };
}
