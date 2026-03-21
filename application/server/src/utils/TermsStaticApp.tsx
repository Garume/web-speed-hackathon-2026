import type { JSX, ReactNode } from "react";

import * as TermPageModule from "../../../client/src/components/term/TermPage";

const TermPage = (
  TermPageModule as unknown as {
    default: {
      TermPage: () => JSX.Element;
    };
  }
).default.TermPage;

const StaticFontAwesomeIcon = ({ iconType }: { iconType: string }) => {
  return (
    <svg
      aria-hidden="true"
      style={{
        display: "inline-block",
        fill: "currentColor",
        height: "1em",
        lineHeight: 1,
        verticalAlign: "-0.125em",
        width: "1em",
      }}
    >
      <use xlinkHref={`/sprites/font-awesome/solid.svg#${iconType}`} />
    </svg>
  );
};

const StaticNavLink = ({
  children,
  href,
  isActive = false,
}: {
  children: ReactNode;
  href: string;
  isActive?: boolean;
}) => {
  return (
    <a className={`terms-nav-link${isActive ? " is-active" : ""}`} href={href}>
      {children}
    </a>
  );
};

export const TermsStaticApp = () => {
  return (
    <div className="terms-layout">
      <div className="terms-frame">
        <aside className="terms-aside">
          <nav className="terms-nav">
            <div className="terms-nav-inner">
              <ul className="terms-nav-list">
                <li>
                  <StaticNavLink href="/">
                    <span className="terms-nav-icon">
                      <StaticFontAwesomeIcon iconType="home" />
                    </span>
                    <span className="terms-nav-label">ホーム</span>
                  </StaticNavLink>
                </li>
                <li>
                  <StaticNavLink href="/search">
                    <span className="terms-nav-icon">
                      <StaticFontAwesomeIcon iconType="search" />
                    </span>
                    <span className="terms-nav-label">検索</span>
                  </StaticNavLink>
                </li>
                <li>
                  <button className="terms-nav-button" type="button">
                    <span className="terms-nav-icon">
                      <StaticFontAwesomeIcon iconType="sign-in-alt" />
                    </span>
                    <span className="terms-nav-label">サインイン</span>
                  </button>
                </li>
                <li>
                  <StaticNavLink href="/terms" isActive={true}>
                    <span className="terms-nav-icon">
                      <StaticFontAwesomeIcon iconType="balance-scale" />
                    </span>
                    <span className="terms-nav-label">利用規約</span>
                  </StaticNavLink>
                </li>
              </ul>
            </div>
          </nav>
        </aside>
        <main className="terms-main">
          <div className="terms-page">
            <TermPage />
          </div>
        </main>
      </div>
    </div>
  );
};
