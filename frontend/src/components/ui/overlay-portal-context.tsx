import * as React from "react";

const OverlayPortalContext = React.createContext<HTMLElement | null>(null);

const OVERLAY_DISMISS_EVENT = "vms:overlay-dismiss";

type OverlayDismissDetail = {
  sourceId?: string;
};

function dismissOtherOverlays(sourceId?: string) {
  document.dispatchEvent(new CustomEvent<OverlayDismissDetail>(OVERLAY_DISMISS_EVENT, { detail: { sourceId } }));
}

function useOverlayDismissListener(sourceId: string, onDismiss: () => void) {
  React.useEffect(() => {
    const onDismissEvent = (event: Event) => {
      const source = event instanceof CustomEvent ? (event.detail as OverlayDismissDetail | undefined)?.sourceId : undefined;
      if (source === sourceId) return;
      onDismiss();
    };

    document.addEventListener(OVERLAY_DISMISS_EVENT, onDismissEvent);
    return () => document.removeEventListener(OVERLAY_DISMISS_EVENT, onDismissEvent);
  }, [onDismiss, sourceId]);
}

function OverlayPortalProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: React.ReactNode;
}) {
  return <OverlayPortalContext.Provider value={container}>{children}</OverlayPortalContext.Provider>;
}

function useOverlayPortalContainer() {
  return React.useContext(OverlayPortalContext);
}

/**
 * Radix Select enables RemoveScroll while open, which blocks wheel/touch scrolling on
 * dialog content. Mirror react-remove-scroll's allow-interactivity class onto the
 * overlay container so the form stays scrollable while a select list is open.
 */
function useOverlaySelectScrollFix(container: HTMLElement | null) {
  React.useEffect(() => {
    if (!container) return;

    const syncAllowScroll = () => {
      const selectOpen = document.querySelector('[role="listbox"][data-state="open"]');
      const blockClass = Array.from(document.body.classList).find((className) =>
        className.startsWith("block-interactivity-")
      );

      Array.from(container.classList)
        .filter((className) => className.startsWith("allow-interactivity-"))
        .forEach((className) => container.classList.remove(className));

      if (!selectOpen || !blockClass) return;

      const allowClass = blockClass.replace("block-interactivity-", "allow-interactivity-");
      container.classList.add(allowClass);
    };

    syncAllowScroll();

    const bodyObserver = new MutationObserver(syncAllowScroll);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    const domObserver = new MutationObserver(syncAllowScroll);
    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });

    return () => {
      bodyObserver.disconnect();
      domObserver.disconnect();
      Array.from(container.classList)
        .filter((className) => className.startsWith("allow-interactivity-"))
        .forEach((className) => container.classList.remove(className));
    };
  }, [container]);
}

export {
  dismissOtherOverlays,
  OverlayPortalProvider,
  useOverlayDismissListener,
  useOverlayPortalContainer,
  useOverlaySelectScrollFix,
};
