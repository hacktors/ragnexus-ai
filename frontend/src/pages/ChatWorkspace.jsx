import { Bot, Send, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { chatApi } from "../api/ragnexusApi.js";
import CitationCard from "../components/CitationCard.jsx";
import FeedbackPanel from "../components/FeedbackPanel.jsx";

const ChatWorkspace = () => {
  const [chats, setChats] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    chatApi
      .history()
      .then(({ chats: history }) => setChats(history.reverse()))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, loading]);

  const latestCitations = useMemo(() => {
    const latest = [...chats].reverse().find((chat) => chat.citations?.length);
    return latest?.citations || [];
  }, [chats]);

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { chat } = await chatApi.ask(trimmed);
      setChats((current) => [...current, chat]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFeedback = (chatId, feedback) => {
    setChats((current) =>
      current.map((chat) => (chat._id === chatId ? { ...chat, feedback } : chat))
    );
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="panel flex min-h-[calc(100vh-3rem)] flex-col rounded-lg">
        <div className="border-b border-white/10 p-4">
          <h1 className="text-2xl font-black">Chat Workspace</h1>
          <p className="mt-1 text-sm text-slate-400">
            Answers are constrained to retrieved document context and returned with matched citations.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {chats.length === 0 ? (
            <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-white/10 bg-slate-950/50 text-center">
              <div>
                <Bot className="mx-auto text-purple-300" size={34} />
                <p className="mt-3 text-lg font-bold">Ask from your indexed knowledge base</p>
                <p className="mt-1 text-sm text-slate-500">Upload documents first for grounded answers.</p>
              </div>
            </div>
          ) : null}

          {chats.map((chat) => (
            <article key={chat._id} className="space-y-3">
              <div className="ml-auto max-w-3xl rounded-lg bg-purple-500 px-4 py-3 text-white">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <UserRound size={15} />
                  You
                </div>
                <p className="leading-7">{chat.sanitizedPrompt}</p>
              </div>

              <div className="max-w-4xl rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-bold text-purple-200">
                  <Bot size={15} />
                  RAGNEXUS AI
                  {chat.fewShotApplied ? (
                    <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">
                      adaptive memory applied
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap leading-7 text-slate-100">{chat.answer}</p>
                {chat.citations?.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {chat.citations.map((citation) => (
                      <CitationCard key={`${chat._id}-${citation.chunkId}`} citation={citation} />
                    ))}
                  </div>
                ) : null}
                <FeedbackPanel
                  chatId={chat._id}
                  existingFeedback={chat.feedback}
                  onSubmitted={(feedback) => updateFeedback(chat._id, feedback)}
                />
              </div>
            </article>
          ))}

          {loading ? (
            <div className="max-w-3xl rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-300">
              Retrieving context and generating grounded answer...
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={submit} className="border-t border-white/10 p-4">
          {error ? <p className="mb-3 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
          <div className="flex gap-3">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask a grounded enterprise knowledge question"
              className="input min-h-14 resize-none"
            />
            <button type="submit" disabled={loading || !message.trim()} className="btn-primary self-stretch px-4">
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>

      <aside className="panel rounded-lg p-4 xl:sticky xl:top-5 xl:h-[calc(100vh-2.5rem)]">
        <h2 className="text-lg font-black">Live Citations</h2>
        <p className="mt-1 text-sm text-slate-400">Most recent source matches ranked by confidence.</p>
        <div className="mt-4 space-y-3">
          {latestCitations.length ? (
            latestCitations.map((citation) => (
              <CitationCard key={`${citation.documentId}-${citation.chunkId}`} citation={citation} />
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">
              Citations appear after a grounded answer.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ChatWorkspace;
