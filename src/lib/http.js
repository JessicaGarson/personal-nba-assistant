const DEFAULT_TIMEOUT_MS = 15000;

export async function getJson(url, options = {}) {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await safeReadText(response);
    throw new Error(`Request failed ${response.status} for ${url}: ${body}`);
  }

  return response.json();
}

export async function postJson(url, body, options = {}) {
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    ...options,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(options.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await safeReadText(response);
    throw new Error(`Request failed ${response.status} for ${url}: ${text}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms for ${url}`);
    }

    if (error instanceof Error) {
      const cause = error.cause && typeof error.cause === 'object'
        ? Object.values(error.cause).filter(Boolean).join(' ')
        : '';
      throw new Error(
        `Network request failed for ${url}${cause ? ` (${cause})` : ''}: ${error.message}`,
      );
    }

    throw new Error(`Network request failed for ${url}: ${String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return '<unreadable>';
  }
}
