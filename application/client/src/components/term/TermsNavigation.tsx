import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";

interface Props {
  onOpenAuthModal: () => void;
}

interface NavLinkProps {
  href: string;
  iconType: string;
  isActive?: boolean;
  text: string;
}

const navItemClassName =
  "flex h-12 w-12 flex-col items-center justify-center rounded-full hover:bg-cax-brand-soft sm:h-auto sm:w-24 sm:rounded-sm sm:px-2 lg:h-auto lg:w-auto lg:flex-row lg:justify-start lg:rounded-full lg:px-4 lg:py-2";

const TermsNavLink = ({ href, iconType, isActive = false, text }: NavLinkProps) => {
  return (
    <li>
      <a
        className={`${navItemClassName}${isActive ? " text-cax-brand" : ""}`}
        href={href}
      >
        <span className="relative text-xl lg:pr-2 lg:text-3xl">
          <FontAwesomeIcon iconType={iconType} styleType="solid" />
        </span>
        <span className="hidden sm:inline sm:text-sm lg:text-xl lg:font-bold">{text}</span>
      </a>
    </li>
  );
};

export const TermsNavigation = ({ onOpenAuthModal }: Props) => {
  return (
    <nav className="border-cax-border bg-cax-surface fixed right-0 bottom-0 left-0 z-10 h-12 border-t lg:relative lg:h-full lg:w-48 lg:border-t-0 lg:border-r">
      <div className="relative grid grid-flow-col items-center justify-evenly lg:fixed lg:flex lg:h-full lg:w-48 lg:flex-col lg:justify-between lg:p-2">
        <ul className="grid grid-flow-col items-center justify-evenly lg:grid-flow-row lg:auto-rows-min lg:justify-start lg:gap-2">
          <TermsNavLink href="/" iconType="home" text="ホーム" />
          <TermsNavLink href="/search" iconType="search" text="検索" />
          <li>
            <button
              className={navItemClassName}
              onClick={onOpenAuthModal}
              type="button"
            >
              <span className="relative text-xl lg:pr-2 lg:text-3xl">
                <FontAwesomeIcon iconType="sign-in-alt" styleType="solid" />
              </span>
              <span className="hidden sm:inline sm:text-sm lg:text-xl lg:font-bold">
                サインイン
              </span>
            </button>
          </li>
          <TermsNavLink href="/terms" iconType="balance-scale" isActive={true} text="利用規約" />
        </ul>
      </div>
    </nav>
  );
};
