import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dismissOtherOverlays,
  OverlayPortalProvider,
  useOverlaySelectScrollFix,
} from "@/components/ui/overlay-portal-context";
import { VMS_AUTOCOMPLETE_LIST_ATTR } from "@/components/ui/searchable-autocomplete";

function isPortaledAutocompleteTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(`[${VMS_AUTOCOMPLETE_LIST_ATTR}]`));
}

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = ({ className, ref, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
);

const DialogContent = ({
  className,
  children,
  onPointerDownOutside,
  onFocusOutside,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) => {
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);
  useOverlaySelectScrollFix(portalContainer);

  React.useEffect(() => {
    dismissOtherOverlays();
  }, []);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      setPortalContainer(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && "current" in ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [ref]
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <OverlayPortalProvider container={portalContainer}>
        <DialogPrimitive.Content
          ref={setRefs}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid max-h-[min(90dvh,calc(100vh-2rem))] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-x-hidden overflow-y-auto border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-3xl sm:rounded-xl sm:p-6 lg:max-w-5xl [&_form]:overflow-visible",
            className
          )}
          onPointerDownOutside={(event) => {
            if (isPortaledAutocompleteTarget(event.target)) {
              event.preventDefault();
            }
            onPointerDownOutside?.(event);
          }}
          onFocusOutside={(event) => {
            if (isPortaledAutocompleteTarget(event.target)) {
              event.preventDefault();
            }
            onFocusOutside?.(event);
          }}
          onInteractOutside={(event) => {
            if (isPortaledAutocompleteTarget(event.target)) {
              event.preventDefault();
            }
          }}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </OverlayPortalProvider>
    </DialogPortal>
  );
};

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
const DialogTitle = ({ className, ref, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
);

const DialogDescription = ({ className, ref, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription };
