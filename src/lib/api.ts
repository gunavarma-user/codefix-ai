/**
 * CodeFix AI API utility
 * Connects the frontend to the deployed FastAPI backend.
 */

const API_BASE_URL = 'https://codefix-ai-backend-dj8o.onrender.com';

export interface ApiErrorResponse {
  error?: boolean | string;
  message?: string;
  detail?: string;
}

export async function safeApiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('codefix_token');

  // Allow both full URLs and relative API paths.
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

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

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (error) {
    console.error(`[API Error] Network request failed: ${url}`, error);
    throw new Error(
      'Unable to connect to the CodeFix AI server. Please try again.'
    );
  }

  const contentType = (
    response.headers.get('content-type') || ''
  ).toLowerCase();

  const isJson =
    contentType.includes('application/json') ||
    contentType.includes('+json');

  if (!isJson) {
    const rawText = await response.text().catch(() => '');
    const isHtml =
      rawText.trim().startsWith('<') ||
      contentType.includes('text/html');

    if (isHtml) {
      console.error(
        `[API Error] Received HTML response from ${url} (${response.status})`
      );

      throw new Error(
        `Server returned an HTML response (${response.status}). The API endpoint may be unavailable.`
      );
    }

    throw new Error(
      `Unexpected server response (${contentType || 'empty'}). Expected JSON.`
    );
  }

  let data: any;

  try {
    data = await response.json();
  } catch (parseErr) {
    console.error(`[API Error] Failed to parse JSON from ${url}:`, parseErr);
    throw new Error('Failed to parse the server response.');
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

/**
 * Base URL exported for components that need it.
 */
export { API_BASE_URL };
