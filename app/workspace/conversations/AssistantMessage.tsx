"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type AssistantMessageProps = {
  content: string;
};

export default function AssistantMessage({
  content,
}: AssistantMessageProps) {
  if (!content) return null;

  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}