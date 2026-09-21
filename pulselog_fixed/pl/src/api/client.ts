const BASE_URL = '';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = 'ERROR', status: number = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryOn401 = true
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Authentication relies solely on HttpOnly cookies (access_token, refresh_token).
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retryOn401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        // The refresh token is sent automatically as an HttpOnly cookie.
        const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        isRefreshing = false;

        if (refreshRes.ok) {
          onRefreshed(true);
          return apiRequest<T>(endpoint, options, false);
        }

        onRefreshed(false);
      } catch (err) {
        isRefreshing = false;
        onRefreshed(false);
      }
    } else {
      return new Promise<T>((resolve, reject) => {
        addRefreshSubscriber((success) => {
          if (success) {
            resolve(apiRequest<T>(endpoint, options, false));
          } else {
            reject(new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401));
          }
        });
      });
    }
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.detail || data?.message || `Request failed (${response.status})`;
    const errorCode = data?.error?.code || 'HTTP_ERROR';
    throw new ApiError(errorMsg, errorCode, response.status);
  }

  return data as T;
}
