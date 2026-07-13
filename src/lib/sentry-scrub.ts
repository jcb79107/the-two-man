const SENSITIVE_KEY_PATTERN =
  /(admin|authorization|cookie|database|dsn|email|password|phone|private|secret|token)/i;

type ScrubbableSentryEvent = {
  request?: {
    url?: string;
    query_string?: unknown;
    headers?: unknown;
    cookies?: unknown;
    data?: unknown;
  };
  user?: {
    email?: string;
    ip_address?: string | null;
    [key: string]: unknown;
  };
};

function redactMatchUrls(value: string) {
  return value
    .replace(/\/admin\/match\/[^/?#]+/g, "/admin/match/[token]")
    .replace(/\/match\/[^/?#]+/g, "/match/[token]")
    .replace(/\/invite\/[^/?#]+/g, "/invite/[token]");
}

function redactRecord(record: unknown) {
  if (!record || typeof record !== "object") {
    return;
  }

  for (const key of Object.keys(record as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      (record as Record<string, unknown>)[key] = "[Filtered]";
    }
  }
}

export function scrubSentryEvent<TEvent extends ScrubbableSentryEvent>(event: TEvent) {
  if (event.request) {
    if (event.request.url) {
      event.request.url = redactMatchUrls(event.request.url);
    }

    if (event.request.query_string) {
      event.request.query_string = "[Filtered]";
    }

    redactRecord(event.request.headers);
    redactRecord(event.request.cookies);
    redactRecord(event.request.data);
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }

  return event;
}
