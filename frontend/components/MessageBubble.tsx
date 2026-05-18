"use client";
import { Citation } from "@/lib/api";
import { BookOpen, Globe } from "lucide-react";
import clsx from "clsx";

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
          "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-telkom-red text-white rounded-br-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
        )}
      >
        {content}
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
