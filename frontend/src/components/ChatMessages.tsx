import { motion } from 'motion/react';
import { Cpu, User, BookOpen } from 'lucide-react';
import { Message } from '../types';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { normalizeResponse } from '../utils/normalizeResponse';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

const CITATION_SEP = '\n\n---\n**Sumber:**\n';

function splitMessage(text: string): [string, string | null] {
  const idx = text.indexOf(CITATION_SEP);
  return idx !== -1 ? [text.slice(0, idx), text.slice(idx + CITATION_SEP.length)] : [text, null];
}

const tableComponents = {
  code: CodeBlock,
  table: ({ children }: any) => (
    <div className="not-prose overflow-x-auto w-full my-3 rounded-lg border border-white/10 text-xs">
      <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>{children}</thead>,
  tbody: ({ children }: any) => <tbody>{children}</tbody>,
  th: ({ children }: any) => (
    <th style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', color: '#2aa086' }}>{children}</th>
  ),
  td: ({ children }: any) => (
    <td style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', whiteSpace: 'nowrap' }}>{children}</td>
  ),
  tr: ({ children, ...props }: any) => (
    <tr style={{ backgroundColor: props.node?.position?.start?.line % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>{children}</tr>
  ),
};

function CitationBlock({ raw }: { raw: string }) {
  const lines = raw.trim().split('\n').filter((l) => l.trim().startsWith('-'));
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen className="w-3 h-3 text-primary-teal" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-teal">Sumber</span>
      </div>
      <div className="flex flex-col gap-1">
        {lines.map((line, i) => (
          <div key={i} className="text-xs text-text-dim leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <span>{children}</span>,
                strong: ({ children }) => <span className="font-semibold text-text-bright">{children}</span>,
              }}
            >
              {line.replace(/^- /, '')}
            </ReactMarkdown>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 mt-4 pb-6">
      {messages.map((message) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {message.role === 'model' && (
            <div className="w-8 h-8 rounded-full bg-primary-teal/10 flex items-center justify-center border border-primary-teal/20 flex-shrink-0 mt-1">
              <Cpu className="w-4 h-4 text-primary-teal" />
            </div>
          )}

          <div className={`flex flex-col gap-2 min-w-0 max-w-[calc(100%-2.5rem)] md:max-w-[80%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            {message.image && (
              <div className="rounded-2xl overflow-hidden shadow-sm border border-text-dim/20 p-1 w-fit">
                <img src={message.image} alt="User upload" className="max-w-[280px] max-h-[280px] w-auto h-auto rounded-xl object-contain" />
              </div>
            )}

            {message.text && (() => {
              const isModel = message.role === 'model';
              const [mainText, citationRaw] = isModel ? splitMessage(message.text) : [message.text, null];

              return (
                <div
                  className={`rounded-2xl px-4 py-3 md:px-5 md:py-3.5 max-w-full overflow-x-auto ${
                    message.role === 'user'
                      ? 'bg-primary-teal text-bg-deep rounded-br-sm'
                      : 'bg-surface-dark text-text-bright border border-white/5 rounded-bl-sm'
                  }`}
                >
                  <div
                    className={`prose max-w-none break-words
                      [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                      prose-p:my-1.5 prose-p:leading-relaxed
                      prose-ul:my-2 prose-ol:my-2
                      prose-li:my-0.5
                      prose-headings:mt-3 prose-headings:mb-1
                      prose-hr:my-3
                      prose-pre:bg-transparent prose-pre:border-0 prose-pre:p-0
                      ${message.role === 'user'
                        ? 'prose-sm prose-p:text-bg-deep prose-headings:text-bg-deep prose-strong:text-bg-deep prose-a:text-bg-deep prose-li:text-bg-deep'
                        : 'prose-themed prose-sm prose-headings:text-primary-teal prose-strong:text-text-bright'
                      }`}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={tableComponents}
                    >
                      {isModel ? normalizeResponse(mainText) : mainText}
                    </ReactMarkdown>
                  </div>
                  {citationRaw && <CitationBlock raw={citationRaw} />}
                </div>
              );
            })()}
          </div>

          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 flex-shrink-0 mt-1">
              <User className="w-4 h-4 text-text-dim" />
            </div>
          )}
        </motion.div>
      ))}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 justify-start"
        >
          <div className="w-8 h-8 rounded-full bg-primary-teal/10 flex items-center justify-center border border-primary-teal/20 flex-shrink-0 mt-1">
            <Cpu className="w-4 h-4 text-primary-teal" />
          </div>
          <div className="bg-surface-dark border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 h-fit">
            <div className="w-1.5 h-1.5 bg-primary-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-primary-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-primary-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
