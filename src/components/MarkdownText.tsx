'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const LINK_COMPONENT: Components['a'] = (props) => (
  <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'underline' }} />
);

const BLOCK_COMPONENTS: Components = {
  a: LINK_COMPONENT,
  p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: '1.1rem' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: '1.1rem' }}>{children}</ol>,
};

// Banner-style usage sits inside a single text line, so block elements collapse to inline content.
const INLINE_COMPONENTS: Components = {
  a: LINK_COMPONENT,
  p: ({ children }) => <>{children}</>,
  ul: ({ children }) => <>{children}</>,
  ol: ({ children }) => <>{children}</>,
  li: ({ children }) => <>{children} </>,
  h1: ({ children }) => <strong>{children} </strong>,
  h2: ({ children }) => <strong>{children} </strong>,
  h3: ({ children }) => <strong>{children} </strong>,
};

export function MarkdownText({ text, inline = false }: { text: string; inline?: boolean }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS}>
      {text}
    </ReactMarkdown>
  );
}
