import { lazy, startTransition, Suspense, useCallback, useEffect, useId, useState } from "react";
import { HelmetProvider } from "react-helmet";
import { Route, Routes, useLocation, useNavigate } from "react-router";

import { AppPage } from "@web-speed-hackathon-2026/client/src/components/application/AppPage";
import { fetchJSON, sendJSON } from "@web-speed-hackathon-2026/client/src/utils/fetchers";
import {
  addDialogOpenRequestListener,
  openDialog,
} from "@web-speed-hackathon-2026/client/src/utils/dialog";
const loadAuthModalContainer = () =>
  import("@web-speed-hackathon-2026/client/src/containers/AuthModalContainer");
const AuthModalContainer = lazy(() =>
  loadAuthModalContainer().then((module) => ({
    default: module.AuthModalContainer,
  })),
);
const loadCrokContainer = () => import("@web-speed-hackathon-2026/client/src/containers/CrokContainer");
const CrokContainer = lazy(() =>
  loadCrokContainer().then((module) => ({
    default: module.CrokContainer,
  })),
);
const loadDirectMessageContainer = () =>
  import("@web-speed-hackathon-2026/client/src/containers/DirectMessageContainer");
const DirectMessageContainer = lazy(() =>
  loadDirectMessageContainer().then((module) => ({
    default: module.DirectMessageContainer,
  })),
);
const DirectMessageListContainer = lazy(() =>
  import("@web-speed-hackathon-2026/client/src/containers/DirectMessageListContainer").then(
    (module) => ({
      default: module.DirectMessageListContainer,
    }),
  ),
);
const NotFoundContainer = lazy(() =>
  import("@web-speed-hackathon-2026/client/src/containers/NotFoundContainer").then((module) => ({
    default: module.NotFoundContainer,
  })),
);
const loadNewPostModalContainer = () =>
  import("@web-speed-hackathon-2026/client/src/containers/NewPostModalContainer");
const NewPostModalContainer = lazy(() =>
  loadNewPostModalContainer().then((module) => ({
    default: module.NewPostModalContainer,
  })),
);
const loadPostContainer = () => import("@web-speed-hackathon-2026/client/src/containers/PostContainer");
const PostContainer = lazy(() =>
  loadPostContainer().then((module) => ({
    default: module.PostContainer,
  })),
);
const SearchContainer = lazy(() =>
  import("@web-speed-hackathon-2026/client/src/containers/SearchContainer").then((module) => ({
    default: module.SearchContainer,
  })),
);
const TermContainer = lazy(() =>
  import("@web-speed-hackathon-2026/client/src/containers/TermContainer").then((module) => ({
    default: module.TermContainer,
  })),
);
const TimelineContainer = lazy(() =>
  import("@web-speed-hackathon-2026/client/src/containers/TimelineContainer").then((module) => ({
    default: module.TimelineContainer,
  })),
);
const UserProfileContainer = lazy(() =>
  import("@web-speed-hackathon-2026/client/src/containers/UserProfileContainer").then(
    (module) => ({
      default: module.UserProfileContainer,
    }),
  ),
);

const RouteLoadingFallback = () => {
  return (
    <div aria-hidden="true" className="space-y-4 px-4 py-6">
      <p className="text-cax-text-muted text-sm">読込中...</p>
      <div className="bg-cax-surface-subtle h-8 w-40 rounded-full" />
      <div className="border-cax-border space-y-3 rounded-2xl border p-4">
        <div className="bg-cax-surface-subtle h-5 w-32 rounded-full" />
        <div className="bg-cax-surface-subtle h-4 w-full rounded-full" />
        <div className="bg-cax-surface-subtle h-4 w-5/6 rounded-full" />
        <div className="bg-cax-surface-subtle h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
};

export const AppContainer = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const [activeUser, setActiveUser] = useState<Models.User | null>(null);
  useEffect(() => {
    let isMounted = true;

    void fetchJSON<Models.User>("/api/v1/me")
      .then((user) => {
        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setActiveUser(user);
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setActiveUser(null);
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);
  const handleLogout = useCallback(async () => {
    await sendJSON("/api/v1/signout", {});
    setActiveUser(null);
    navigate("/");
  }, [navigate]);

  const authModalId = useId();
  const newPostModalId = useId();
  const [isAuthModalMounted, setIsAuthModalMounted] = useState(false);
  const [isNewPostModalMounted, setIsNewPostModalMounted] = useState(false);
  const [pendingDialogId, setPendingDialogId] = useState<string | null>(null);

  useEffect(() => {
    return addDialogOpenRequestListener((dialogId) => {
      if (dialogId === authModalId) {
        setIsAuthModalMounted(true);
        setPendingDialogId(dialogId);
      } else if (dialogId === newPostModalId) {
        setIsNewPostModalMounted(true);
        setPendingDialogId(dialogId);
      }
    });
  }, [authModalId, newPostModalId]);

  useEffect(() => {
    if (pendingDialogId == null) {
      return;
    }

    let requestId = 0;
    const tryOpen = () => {
      if (openDialog(pendingDialogId)) {
        setPendingDialogId((currentId) => (currentId === pendingDialogId ? null : currentId));
        return;
      }

      requestId = window.requestAnimationFrame(tryOpen);
    };

    tryOpen();
    return () => {
      if (requestId !== 0) {
        window.cancelAnimationFrame(requestId);
      }
    };
  }, [pendingDialogId]);

  return (
    <HelmetProvider>
      <AppPage
        activeUser={activeUser}
        authModalId={authModalId}
        newPostModalId={newPostModalId}
        onLogout={handleLogout}
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route element={<TimelineContainer />} path="/" />
            <Route
              element={
                <DirectMessageListContainer activeUser={activeUser} authModalId={authModalId} />
              }
              path="/dm"
            />
            <Route
              element={<DirectMessageContainer activeUser={activeUser} authModalId={authModalId} />}
              path="/dm/:conversationId"
            />
            <Route element={<SearchContainer />} path="/search" />
            <Route element={<UserProfileContainer />} path="/users/:username" />
            <Route element={<PostContainer />} path="/posts/:postId" />
            <Route element={<TermContainer />} path="/terms" />
            <Route
              element={<CrokContainer activeUser={activeUser} authModalId={authModalId} />}
              path="/crok"
            />
            <Route element={<NotFoundContainer />} path="*" />
          </Routes>
        </Suspense>
      </AppPage>

      <Suspense fallback={null}>
        {isAuthModalMounted ? (
          <AuthModalContainer id={authModalId} onUpdateActiveUser={setActiveUser} />
        ) : null}
        {isNewPostModalMounted ? <NewPostModalContainer id={newPostModalId} /> : null}
      </Suspense>
    </HelmetProvider>
  );
};
