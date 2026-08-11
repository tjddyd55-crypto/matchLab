"use client";

/**
 * Imperative MATCHON Confirm/Alert SSOT.
 * - backdrop/outside click 로 닫히지 않음 (Dialog dismissible=false)
 * - Escape / 취소 / X / 확인 버튼으로만 닫힘
 * - window.confirm / window.alert 대체
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type AppConfirmVariant = "default" | "danger";

export type AppConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: AppConfirmVariant;
};

export type AppAlertOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
};

type ConfirmRequest = {
  kind: "confirm";
  options: AppConfirmOptions;
  resolve: (value: boolean) => void;
};

type AlertRequest = {
  kind: "alert";
  options: AppAlertOptions;
  resolve: () => void;
};

type DialogRequest = ConfirmRequest | AlertRequest;

type AppConfirmDialogApi = {
  confirm: (options: AppConfirmOptions) => Promise<boolean>;
  alert: (options: AppAlertOptions | string) => Promise<void>;
};

const AppConfirmDialogContext = createContext<AppConfirmDialogApi | null>(null);

function normalizeAlertOptions(
  options: AppAlertOptions | string,
): AppAlertOptions {
  if (typeof options === "string") {
    return { title: "알림", description: options };
  }
  return options;
}

export function AppConfirmDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [pending, setPending] = useState(false);
  const queueRef = useRef<DialogRequest[]>([]);
  const activeRef = useRef<DialogRequest | null>(null);

  const pump = useCallback(() => {
    if (activeRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setRequest(null);
      setPending(false);
      return;
    }
    activeRef.current = next;
    setPending(false);
    setRequest(next);
  }, []);

  const finish = useCallback(
    (value: boolean | void) => {
      const current = activeRef.current;
      if (!current) return;
      activeRef.current = null;
      setPending(false);
      setRequest(null);
      if (current.kind === "confirm") {
        current.resolve(Boolean(value));
      } else {
        current.resolve();
      }
      queueMicrotask(() => pump());
    },
    [pump],
  );

  const confirm = useCallback(
    (options: AppConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        queueRef.current.push({ kind: "confirm", options, resolve });
        pump();
      }),
    [pump],
  );

  const alertFn = useCallback(
    (options: AppAlertOptions | string) =>
      new Promise<void>((resolve) => {
        queueRef.current.push({
          kind: "alert",
          options: normalizeAlertOptions(options),
          resolve,
        });
        pump();
      }),
    [pump],
  );

  const api = useMemo(
    () => ({ confirm, alert: alertFn }),
    [confirm, alertFn],
  );

  const open = request !== null;
  const isDanger =
    request?.kind === "confirm" && request.options.variant === "danger";
  const title = request?.options.title ?? "";
  const description = request?.options.description;
  const confirmLabel =
    request?.kind === "confirm"
      ? (request.options.confirmLabel ?? (isDanger ? "삭제" : "확인"))
      : (request?.options.confirmLabel ?? "확인");
  const cancelLabel =
    request?.kind === "confirm"
      ? (request.options.cancelLabel ?? "취소")
      : "취소";

  return (
    <AppConfirmDialogContext.Provider value={api}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) finish(request?.kind === "confirm" ? false : undefined);
        }}
      >
        <DialogContent
          showCloseButton
          className="sm:max-w-md"
          onKeyDown={(e) => {
            if (e.key !== "Enter" || pending) return;
            if (request?.kind === "confirm" && isDanger) return;
            e.preventDefault();
            if (request?.kind === "alert") {
              finish();
              return;
            }
            if (request?.kind === "confirm") {
              setPending(true);
              finish(true);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription className="whitespace-pre-line">
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            {request?.kind === "confirm" ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => finish(false)}
              >
                {cancelLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={pending}
              variant={isDanger ? "destructive" : "default"}
              onClick={() => {
                if (request?.kind === "alert") {
                  finish();
                  return;
                }
                setPending(true);
                finish(true);
              }}
            >
              {pending ? "처리 중…" : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppConfirmDialogContext.Provider>
  );
}

export function useAppConfirmDialog(): AppConfirmDialogApi {
  const ctx = useContext(AppConfirmDialogContext);
  if (!ctx) {
    throw new Error(
      "useAppConfirmDialog must be used within AppConfirmDialogProvider",
    );
  }
  return ctx;
}
