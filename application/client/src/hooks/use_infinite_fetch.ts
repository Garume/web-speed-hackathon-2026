import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT = 10;

interface ReturnValues<T> {
  data: Array<T>;
  error: Error | null;
  isLoading: boolean;
  fetchMore: () => void;
}

declare global {
  interface Window {
    __INITIAL_POSTS__?: unknown[];
    __INITIAL_TIMELINE__?: unknown[];
  }
}

export function useInfiniteFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T[]>,
): ReturnValues<T> {
  // Check for server-inlined initial data
  const initialData = useRef<T[] | null>(null);
  if (initialData.current === null && apiPath === "/api/v1/posts" && window.__INITIAL_POSTS__) {
    initialData.current = window.__INITIAL_POSTS__ as T[];
    delete window.__INITIAL_POSTS__;
  }
  if (
    initialData.current === null &&
    /^\/api\/v1\/users\/[^/]+\/posts$/.test(apiPath) &&
    window.__INITIAL_TIMELINE__
  ) {
    initialData.current = window.__INITIAL_TIMELINE__ as T[];
    delete window.__INITIAL_TIMELINE__;
  }

  const internalRef = useRef({
    hasMore: true,
    isLoading: false,
    offset: initialData.current ? initialData.current.length : 0,
  });

  const [result, setResult] = useState<Omit<ReturnValues<T>, "fetchMore">>({
    data: initialData.current ?? [],
    error: null,
    isLoading: !initialData.current,
  });

  const fetchMore = useCallback(() => {
    const { hasMore, isLoading, offset } = internalRef.current;
    if (apiPath === "" || isLoading || !hasMore) {
      return;
    }

    setResult((cur) => ({
      ...cur,
      isLoading: true,
    }));
    internalRef.current = {
      hasMore,
      isLoading: true,
      offset,
    };

    const separator = apiPath.includes("?") ? "&" : "?";

    void fetcher(`${apiPath}${separator}limit=${LIMIT}&offset=${offset}`).then(
      (pageData) => {
        setResult((cur) => ({
          ...cur,
          data: [...cur.data, ...pageData],
          isLoading: false,
        }));
        internalRef.current = {
          hasMore: pageData.length === LIMIT,
          isLoading: false,
          offset: offset + pageData.length,
        };
      },
      (error) => {
        setResult((cur) => ({
          ...cur,
          error,
          isLoading: false,
        }));
        internalRef.current = {
          hasMore,
          isLoading: false,
          offset,
        };
      },
    );
  }, [apiPath, fetcher]);

  useEffect(() => {
    if (apiPath === "") {
      setResult(() => ({
        data: [],
        error: null,
        isLoading: false,
      }));
      internalRef.current = {
        hasMore: false,
        isLoading: false,
        offset: 0,
      };
      return;
    }

    // Skip initial fetch if we have inline data
    if (initialData.current) {
      initialData.current = null;
      return;
    }

    setResult(() => ({
      data: [],
      error: null,
      isLoading: true,
    }));
    internalRef.current = {
      hasMore: true,
      isLoading: false,
      offset: 0,
    };

    fetchMore();
  }, [fetchMore]);

  return {
    ...result,
    fetchMore,
  };
}
