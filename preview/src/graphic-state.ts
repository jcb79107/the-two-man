// Key results by selection and attempt so stale downloads/errors stay hidden.
export type GraphicResult =
  | { key: string; status: "ready"; url: string }
  | { key: string; status: "failed"; error: string };
