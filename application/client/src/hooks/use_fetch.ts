import { useEffect, useRef, useState } from "react";

interface ReturnValues<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

declare global {
  interface Window {
    __INITIAL_POST__?: unknown;
    __INITIAL_USER__?: unknown;
  }
}

export function useFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T>,
): ReturnValues<T> {
  const initialData = useRef<T | null>(null);
  if (initialData.current === null) {
    if (/^\/api\/v1\/posts\/[^/]+$/.test(apiPath) && window.__INITIAL_POST__ !== undefined) {
      initialData.current = window.__INITIAL_POST__ as T;
      delete window.__INITIAL_POST__;
    } else if (/^\/api\/v1\/users\/[^/]+$/.test(apiPath) && window.__INITIAL_USER__ !== undefined) {
      initialData.current = window.__INITIAL_USER__ as T;
      delete window.__INITIAL_USER__;
    }
  }

  const [result, setResult] = useState<ReturnValues<T>>({
    data: initialData.current,
    error: null,
    isLoading: initialData.current === null,
  });

  useEffect(() => {
    if (initialData.current !== null) {
      initialData.current = null;
      return;
    }

    setResult(() => ({
      data: null,
      error: null,
      isLoading: true,
    }));

    void fetcher(apiPath).then(
      (data) => {
        setResult((cur) => ({
          ...cur,
          data,
          isLoading: false,
        }));
      },
      (error) => {
        setResult((cur) => ({
          ...cur,
          error,
          isLoading: false,
        }));
      },
    );
  }, [apiPath, fetcher]);

  return result;
}
