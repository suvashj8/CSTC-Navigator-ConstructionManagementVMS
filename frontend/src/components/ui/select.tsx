import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dismissOtherOverlays,
  useOverlayDismissListener,
  useOverlayPortalContainer,
} from "@/components/ui/overlay-portal-context";

type SelectProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
  modal?: boolean;
};

const Select = ({ modal: _modal, ...props }: SelectProps) => {
  const sourceId = React.useId();
  const { open, defaultOpen, onOpenChange, ...rootProps } = props;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const resolvedOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  useOverlayDismissListener(
    sourceId,
    React.useCallback(() => setOpen(false), [setOpen])
  );

  return (
    <SelectPrimitive.Root
      {...rootProps}
      open={resolvedOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) dismissOtherOverlays(sourceId);
        setOpen(nextOpen);
      }}
    />
  );
};
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = ({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);

const SelectContent = ({
  className,
  children,
  position,
  onCloseAutoFocus,
  ref,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) => {
  const overlayContainer = useOverlayPortalContainer();
  const resolvedPosition = position ?? (overlayContainer ? "popper" : "item-aligned");

  const handleCloseAutoFocus = React.useCallback(
    (event: Event) => {
      event.preventDefault();
      onCloseAutoFocus?.(event);
    },
    [onCloseAutoFocus]
  );

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "z-[300] min-w-[var(--radix-select-trigger-width,12rem)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className
        )}
        position={resolvedPosition}
        sideOffset={4}
        collisionPadding={24}
        onCloseAutoFocus={handleCloseAutoFocus}
        onWheel={(event) => event.stopPropagation()}
        {...props}
      >
        <SelectPrimitive.Viewport className="vms-select-viewport p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
};

const SelectLabel = ({ className, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) => (
  <SelectPrimitive.Label ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
);

const SelectItem = ({ className, children, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);

/** Prevents Radix height calc failure when a select has zero options. */
function SelectEmpty({ message = "No options available" }: { message?: string }) {
  return (
    <SelectItem value="__vms_empty__" disabled className="justify-center text-muted-foreground">
      {message}
    </SelectItem>
  );
}

const SelectSeparator = ({ className, ref, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
);

/** @deprecated Scroll buttons removed — viewport uses native overflow scroll. */
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectEmpty,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
