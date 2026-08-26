"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitive.Provider

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const TOAST_ICON_CLASSNAMES = {
  success: "text-success",
  error: "text-destructive",
  info: "text-primary",
}

function ToastViewport({
  className,
  ...props
}) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed top-auto right-4 bottom-4 z-100 mx-auto flex w-full max-w-[calc(100%-2rem)] flex-col gap-2 sm:right-6 sm:bottom-6 sm:max-w-sm",
        className
      )}
      {...props} />
  );
}

function ToastRoot({
  className,
  toast,
  ...props
}) {
  const Icon = TOAST_ICONS[toast.type]
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      toast={toast}
      className={cn(
        "absolute inset-x-0 bottom-0 rounded-lg border bg-card p-3.5 text-card-foreground shadow-lg select-none",
        "transition-[transform,opacity] duration-500 ease-out",
        "[transform:translateY(calc(var(--toast-offset-y)*1px))_scale(calc(max(0,1-var(--toast-index)*0.1)))]",
        "data-expanded:[transform:translateY(calc(var(--toast-offset-y)*1px))_scale(1)]",
        "data-starting-style:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "data-ending-style:opacity-0",
        "data-swiping:transition-none",
        "data-[swipe-direction=right]:data-swiping:[transform:translateX(var(--toast-swipe-movement-x))]",
        "data-[swipe-direction=down]:data-swiping:[transform:translateY(var(--toast-swipe-movement-y))]",
        className
      )}
      {...props}>
      <div className="flex items-start gap-2.5">
        {Icon && <Icon className={cn("mt-0.5 size-4.5 shrink-0", TOAST_ICON_CLASSNAMES[toast.type])} />}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {toast.title && (
            <ToastPrimitive.Title data-slot="toast-title" className="text-sm font-medium" />
          )}
          {toast.description && (
            <ToastPrimitive.Description
              data-slot="toast-description"
              className="text-sm text-muted-foreground" />
          )}
        </div>
        <ToastPrimitive.Close
          data-slot="toast-close"
          aria-label="Cerrar"
          className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          <X className="size-4" />
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  );
}

function Toaster() {
  const { toasts } = ToastPrimitive.useToastManager()
  return (
    <ToastPrimitive.Portal>
      <ToastViewport>
        {toasts.map(toast => (
          <ToastRoot key={toast.id} toast={toast} />
        ))}
      </ToastViewport>
    </ToastPrimitive.Portal>
  );
}

// Reemplaza alert(error.message): notificación no bloqueante en vez del
// diálogo nativo del navegador. Uso: const toast = useToast(); toast.error(msg)
function useToast() {
  const manager = ToastPrimitive.useToastManager()
  return React.useMemo(
    () => ({
      ...manager,
      success: (description, options) =>
        manager.add({ type: "success", description, ...options }),
      error: (description, options) =>
        manager.add({ type: "error", description, ...options }),
      info: (description, options) =>
        manager.add({ type: "info", description, ...options }),
    }),
    [manager]
  )
}

export { ToastProvider, Toaster, useToast }