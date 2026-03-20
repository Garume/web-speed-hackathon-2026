import { ReactNode, useEffect, useRef } from "react";

interface Props {
  children: ReactNode;
  items: any[];
  fetchMore: () => void;
}

export const InfiniteScroll = ({ children, fetchMore, items }: Props) => {
  const latestItem = items[items.length - 1];
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const maybeFetchMore = () => {
      const documentHeight = document.documentElement.scrollHeight;
      const viewportBottom = window.scrollY + window.innerHeight;
      if (documentHeight - viewportBottom <= 300) {
        fetchMore();
      }
    };

    const sentinel = sentinelRef.current;
    if (sentinel == null || latestItem === undefined) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fetchMore();
        }
      },
      {
        rootMargin: "300px 0px",
      },
    );

    observer.observe(sentinel);
    maybeFetchMore();
    window.addEventListener("scroll", maybeFetchMore, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", maybeFetchMore);
    };
  }, [latestItem, fetchMore]);

  return (
    <>
      {children}
      <div aria-hidden="true" className="h-px w-full" ref={sentinelRef} />
    </>
  );
};
