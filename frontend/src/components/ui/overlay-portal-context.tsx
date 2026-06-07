import * as React from "react";

const OverlayPortalContext = React.createContext<HTMLElement | null>(null);

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

export { OverlayPortalProvider, useOverlayPortalContainer, useOverlaySelectScrollFix };
