import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { InfiniteScroll } from "@web-speed-hackathon-2026/client/src/components/foundation/InfiniteScroll";
import { PostPage } from "@web-speed-hackathon-2026/client/src/components/post/PostPage";
import { NotFoundContainer } from "@web-speed-hackathon-2026/client/src/containers/NotFoundContainer";
import { useFetch } from "@web-speed-hackathon-2026/client/src/hooks/use_fetch";
import { useInfiniteFetch } from "@web-speed-hackathon-2026/client/src/hooks/use_infinite_fetch";
import { fetchJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";

const PostPageSkeleton = () => {
  return (
    <div aria-hidden="true" className="px-1 sm:px-4">
      <div className="border-cax-border border-b px-4 pt-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-cax-surface-subtle h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="bg-cax-surface-subtle h-5 w-40 rounded-full" />
            <div className="bg-cax-surface-subtle h-4 w-28 rounded-full" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="bg-cax-surface-subtle h-5 w-full rounded-full" />
          <div className="bg-cax-surface-subtle h-5 w-5/6 rounded-full" />
          <div className="bg-cax-surface-subtle h-80 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
};

const PostContainerContent = ({ postId }: { postId: string | undefined }) => {
  const { data: post, isLoading: isLoadingPost } = useFetch<Models.Post>(
    `/api/v1/posts/${postId}`,
    fetchJSON,
  );

  const { data: comments, fetchMore } = useInfiniteFetch<Models.Comment>(
    `/api/v1/posts/${postId}/comments`,
    fetchJSON,
  );

  if (isLoadingPost) {
    return (
      <>
        <Helmet>
          <title>読込中 - CaX</title>
        </Helmet>
        <PostPageSkeleton />
      </>
    );
  }

  if (post === null) {
    return <NotFoundContainer />;
  }

  return (
    <InfiniteScroll fetchMore={fetchMore} items={comments}>
      <Helmet>
        <title>{post.user.name} さんのつぶやき - CaX</title>
      </Helmet>
      <PostPage comments={comments} post={post} />
    </InfiniteScroll>
  );
};

export const PostContainer = () => {
  const { postId } = useParams();
  return <PostContainerContent key={postId} postId={postId} />;
};
