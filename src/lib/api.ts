/**
 * Safe API Fetch utility for CodeFix AI
 * Validates Content-Type, handles JSON parsing safely, and prevents HTML-as-JSON errors.
 */

export interface ApiErrorResponse {
  error?: boolean | string;
  message?: string;
  detail?: string;
}

export async function safeApiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('codefix_token');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isJson = contentType.includes('application/json') || contentType.includes('+json');

  if (!isJson) {
    const rawText = await response.text().catch(() => '');
    const isHtml = rawText.trim().startsWith('<') || contentType.includes('text/html');

    if (isHtml) {
      console.error(`[API Error] Received HTML response from ${url} (Status ${response.status})`);
      throw new Error(
        `Server returned an HTML response (${response.status} ${response.statusText}) instead of JSON. The endpoint may be unrouted or encountering a server error.`
      );
    }

    throw new Error(
      `Unexpected content type (${contentType || 'empty'}) from ${url}. Expected JSON.`
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch (parseErr: any) {
    console.error(`[API Error] Failed to parse JSON from ${url}:`, parseErr);
    throw new Error('Failed to parse server JSON response.');
  }

  if (!response.ok) {
    const errorMessage =
      data?.message ||
      data?.detail ||
      (typeof data?.error === 'string' ? data.error : null) ||
      `Server error (${response.status}: ${response.statusText})`;

    const err = new Error(errorMessage);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }

  if (data && data.error === true && data.message) {
    throw new Error(data.message);
  }

  return data as T;
}
