import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";

type Props = {
  language: string;
  customStyle?: React.CSSProperties;
  children: string;
};

const SyntaxHighlighterLoader = ({ language, customStyle, children }: Props) => (
  <SyntaxHighlighter customStyle={customStyle} language={language} style={atomOneLight}>
    {children}
  </SyntaxHighlighter>
);

export default SyntaxHighlighterLoader;
