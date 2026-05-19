"use client";
import { Citation } from "@/lib/api";
import { BookOpen, Globe } from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Props {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[] | null;
}

export default function MessageBubble({ role, content, citations }: Props) {
  const isUser = role === "user";

  return (
    <div className={clsx("flex flex-col gap-2 max-w-[80%]", isUser ? "self-end items-end" : "self-start items-start")}>
      <div
        className={clsx(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
          isUser
            ? "bg-telkom-red text-white rounded-br-sm whitespace-pre-wrap"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm prose prose-sm max-w-none"
        )}
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="border-collapse text-xs w-full">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-gray-100">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-2 py-1">{children}</td>
              ),
              tr: ({ children }) => (
                <tr className="even:bg-gray-50">{children}</tr>
              ),
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children }) => (
                <code className="bg-gray-100 rounded px-1 py-0.5 font-mono text-xs">{children}</code>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>

      {/* Citations */}
      {!isUser && citations && citations.length > 0 && (
        <div className="flex flex-col gap-1 w-full">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sumber</p>
          {citations.map((c, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-900">
              {c.source_type === "pdf" ? (
                <BookOpen className="w-3 h-3 mt-0.5 shrink-0 text-amber-600" />
              ) : (
                <Globe className="w-3 h-3 mt-0.5 shrink-0 text-amber-600" />
              )}
              <span>
                <strong>{c.title}</strong>
                {c.doc_number && ` — ${c.doc_number}`}
                {c.page && `, Hal. ${c.page}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
