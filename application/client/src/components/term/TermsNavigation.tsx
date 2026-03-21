import { NavigationItem } from "@web-speed-hackathon-2026/client/src/components/application/NavigationItem";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";

interface Props {
  authModalId: string;
}

export const TermsNavigation = ({ authModalId }: Props) => {
  return (
    <nav className="border-cax-border bg-cax-surface fixed right-0 bottom-0 left-0 z-10 h-12 border-t lg:relative lg:h-full lg:w-48 lg:border-t-0 lg:border-r">
      <div className="relative grid grid-flow-col items-center justify-evenly lg:fixed lg:flex lg:h-full lg:w-48 lg:flex-col lg:justify-between lg:p-2">
        <ul className="grid grid-flow-col items-center justify-evenly lg:grid-flow-row lg:auto-rows-min lg:justify-start lg:gap-2">
          <NavigationItem
            href="/"
            icon={<FontAwesomeIcon iconType="home" styleType="solid" />}
            text="ホーム"
          />
          <NavigationItem
            href="/search"
            icon={<FontAwesomeIcon iconType="search" styleType="solid" />}
            text="検索"
          />
          <NavigationItem
            command="show-modal"
            commandfor={authModalId}
            icon={<FontAwesomeIcon iconType="sign-in-alt" styleType="solid" />}
            text="サインイン"
          />
          <NavigationItem
            href="/terms"
            icon={<FontAwesomeIcon iconType="balance-scale" styleType="solid" />}
            text="利用規約"
          />
        </ul>
      </div>
    </nav>
  );
};
