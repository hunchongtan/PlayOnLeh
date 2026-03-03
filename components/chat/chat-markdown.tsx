import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

const markdownSchema = {
  tagNames: [
    "p",
    "br",
    "strong",
    "em",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "a",
  ],
  attributes: {
    a: ["href", "title", "target", "rel"],
    code: ["className"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
  },
};

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="chat-markdown min-w-0 break-words [overflow-wrap:anywhere] [&_a]:underline [&_a]:decoration-white/35 hover:[&_a]:decoration-white/65 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-white/25 [&_blockquote]:pl-3 [&_blockquote]:text-white/80 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-white/15 [&_pre]:bg-black/35 [&_pre]:p-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSchema]]}
        components={{
          a: (props) => {
            const { node, ...anchorProps } = props;
            void node;
            return <a {...anchorProps} target="_blank" rel="noopener noreferrer" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
