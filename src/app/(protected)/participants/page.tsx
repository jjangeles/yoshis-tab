"use client";

import { useEffect, useState, type ChangeEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

export default function ParticipantsPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantName, setParticipantName] = useState("")
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserSupabase();

  useEffect(() => {
    const getParticipants = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setError("Unable to verify current user.");
        return;
      }

      const { data, error: participantsError } = await supabase
        .from("participants")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (participantsError) {
        setError(participantsError.message);
        return;
      }

      setParticipants(data ?? []);
    };

    getParticipants();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!participantName.trim()) {
      setError("Please enter participant name.");
      return;
    }

    setLoading(true);

    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data?.session;

    if (sessionResult.error || !session?.user) {
      setError("Unable to verify current user.");
      setLoading(false);
      return;
    }
    
    const participantPayload = {
      user_id: session.user.id,
      name: participantName,
    };

    const insertResult = await supabase
      .from("participants")
      .insert([participantPayload] as any)
      .select("*")
      .single();

    if (insertResult.error) {
      if (insertResult.error.code === "23505") {
        setError("You already have a participant with this name.");
      } else {
        setError(insertResult.error.message);
      }

      setLoading(false);
      return;
    }

    setParticipants((prev) => [insertResult.data, ...prev]);
    setParticipantName("");
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 px-5 py-10 text-slate-950 dark:bg-slate-950 dark:text-slate-50">

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[90%] max-w-sm rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="text-center">
              <h2 className="text-lg font-semibold">
                Adding participant
              </h2>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              Please wait...
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-md space-y-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Add participants
          </p>
          <h1 className="text-3xl font-semibold">Paticipants</h1>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            You can add new participants here that you can use on receipts.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 space-y-2 rounded-[2rem] p-3">
          {error ? (
            <p className="rounded-3xl w-full bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</p>
          ) : null}
          <input
            type='text'
            placeholder="Paticipant Name"
            className="rounded-3xl flex-1 border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
          />
          <button
            type="submit"
            disabled={!participantName.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus />
          </button>
        </form>

        <section className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="rounded-2xl bg-white px-4 py-3 dark:bg-slate-900"
            >
              {participant.name}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
