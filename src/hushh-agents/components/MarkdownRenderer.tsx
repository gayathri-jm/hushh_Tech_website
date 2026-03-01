/**
 * Hushh Agents — Markdown Renderer
 * 
 * Renders AI responses with proper markdown formatting.
 * Supports headings, bold, italic, lists, code blocks, links, hr, etc.
 * Two themes: 'dark' (CodePage) and 'light' (ChatPage).
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCallback, useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  theme?: 'dark' | 'light';
  className?: string;
}

/** Copy button for inline code blocks */
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
      aria-label="Copy code"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
};

export default function MarkdownRenderer({ content, theme = 'dark', className = '' }: MarkdownRendererProps) {
  const isDark = theme === 'dark';

  // Color classes based on theme
  const colors = {
    text: isDark ? 'text-gray-300' : 'text-gray-700',
    heading: isDark ? 'text-white' : 'text-gray-900',
    link: isDark ? 'text-purple-400 hover:text-purple-300' : 'text-blue-600 hover:text-blue-500',
    code: isDark ? 'bg-gray-800 text-purple-300' : 'bg-gray-100 text-purple-700',
    codeBlock: isDark ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-200',
    codeBlockText: isDark ? 'text-gray-200' : 'text-gray-800',
    hr: isDark ? 'border-gray-700' : 'border-gray-200',
    blockquote: isDark ? 'border-purple-500/40 bg-purple-500/5 text-gray-400' : 'border-blue-400 bg-blue-50 text-gray-600',
    listMarker: isDark ? 'text-purple-400' : 'text-gray-500',
    strong: isDark ? 'text-white' : 'text-gray-900',
    table: isDark ? 'border-gray-700' : 'border-gray-200',
    tableHeader: isDark ? 'bg-gray-800/50 text-gray-200' : 'bg-gray-100 text-gray-800',
    tableCell: isDark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700',
  };

  return (
    <div className={`markdown-rendered ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          /* Headings */
          h1: ({ children }) => (
            <h1 className={`text-xl font-bold ${colors.heading} mt-4 mb-2 leading-tight`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-lg font-semibold ${colors.heading} mt-4 mb-2 leading-tight`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-base font-semibold ${colors.heading} mt-3 mb-1.5 leading-tight`}>
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className={`text-sm font-semibold ${colors.heading} mt-3 mb-1`}>
              {children}
            </h4>
          ),

          /* Paragraph */
          p: ({ children }) => (
            <p className={`text-sm leading-relaxed ${colors.text} mb-3 last:mb-0`}>
              {children}
            </p>
          ),

          /* Bold / Italic */
          strong: ({ children }) => (
            <strong className={`font-semibold ${colors.strong}`}>{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),

          /* Links */
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline underline-offset-2 ${colors.link} transition-colors`}
            >
              {children}
            </a>
          ),

          /* Lists */
          ul: ({ children }) => (
            <ul className={`list-disc list-outside ml-5 mb-3 space-y-1 ${colors.text} text-sm`}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={`list-decimal list-outside ml-5 mb-3 space-y-1 ${colors.text} text-sm`}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),

          /* Inline code */
          code: ({ children, className: codeClassName }) => {
            // If it has a language class, it's a code block (handled by pre)
            const isBlock = codeClassName?.startsWith('language-');
            if (isBlock) {
              return (
                <code className={`text-sm font-mono ${colors.codeBlockText} leading-relaxed`}>
                  {children}
                </code>
              );
            }
            // Inline code
            return (
              <code className={`${colors.code} px-1.5 py-0.5 rounded text-xs font-mono`}>
                {children}
              </code>
            );
          },

          /* Code block wrapper */
          pre: ({ children }) => {
            // Extract text content for copy button
            const codeText = extractTextFromChildren(children);
            return (
              <div className={`group relative rounded-xl border ${colors.codeBlock} my-3 overflow-hidden`}>
                <CopyButton text={codeText} />
                <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
                  {children}
                </pre>
              </div>
            );
          },

          /* Horizontal rule */
          hr: () => <hr className={`${colors.hr} my-4`} />,

          /* Blockquote */
          blockquote: ({ children }) => (
            <blockquote className={`border-l-3 ${colors.blockquote} pl-4 py-2 my-3 rounded-r-lg text-sm italic`}>
              {children}
            </blockquote>
          ),

          /* Table */
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg">
              <table className={`w-full text-sm border ${colors.table} border-collapse`}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={colors.tableHeader}>{children}</thead>
          ),
          th: ({ children }) => (
            <th className={`px-3 py-2 text-left text-xs font-semibold border ${colors.table}`}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`px-3 py-2 border ${colors.tableCell} text-xs`}>
              {children}
            </td>
          ),

          /* Images */
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full rounded-lg my-3"
              loading="lazy"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Recursively extract text from React children (for copy button) */
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as React.ReactElement).props.children);
  }
  return '';
}
