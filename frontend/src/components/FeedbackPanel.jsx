import { Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { chatApi } from "../api/ragnexusApi.js";

const FeedbackPanel = ({ chatId, existingFeedback, onSubmitted }) => {
  const [rating, setRating] = useState(existingFeedback?.rating || "");
  const [comment, setComment] = useState(existingFeedback?.comment || "");
  const [correction, setCorrection] = useState(existingFeedback?.correction || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    setError("");
    try {
      const result = await chatApi.feedback({ chatId, rating, comment, correction });
      onSubmitted?.(result.feedback);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setRating("positive")}
          className={`btn-secondary px-3 ${rating === "positive" ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100" : ""}`}
          title="Mark answer as useful"
        >
          <ThumbsUp size={15} />
        </button>
        <button
          type="button"
          onClick={() => setRating("negative")}
          className={`btn-secondary px-3 ${rating === "negative" ? "border-rose-300/50 bg-rose-400/15 text-rose-100" : ""}`}
          title="Mark answer as incorrect"
        >
          <ThumbsDown size={15} />
        </button>
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Feedback note"
          className="input min-w-52 flex-1"
        />
        <button onClick={submit} disabled={!rating || saving} className="btn-primary">
          <Send size={15} />
          Submit
        </button>
      </div>
      {rating === "negative" ? (
        <textarea
          value={correction}
          onChange={(event) => setCorrection(event.target.value)}
          placeholder="Optional corrected answer for adaptive memory"
          className="input mt-3 min-h-24 resize-y"
        />
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
};

export default FeedbackPanel;
