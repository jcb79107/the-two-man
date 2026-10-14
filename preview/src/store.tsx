"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { matches as initial, type Match } from "./data";
import { validSnapshot } from "./domain";
const DRAFT_KEY = "two-man-commissioner-drafts-v1";
const KEY = "two-man-season2-preview-v1";
export type ReviewDraft = { match: Match; note: string };
type Store = {
  matches: Match[];
  ready: boolean;
  notice: string;
  save: (next: Match[], message: string) => boolean;
  reset: () => void;
  drafts: Record<string, ReviewDraft>;
  setDraft: (id: string, draft: ReviewDraft | null) => void;
};
const Context = createContext<Store | null>(null);
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const setDraft = useCallback((id: string, draft: ReviewDraft | null) => {
    setDrafts((current) => {
      const next = { ...current };
      if (draft) next[id] = draft;
      else delete next[id];
      return next;
    });
  }, []);
  useEffect(() => {
    try {
      const rawDrafts = localStorage.getItem(DRAFT_KEY);
      if (rawDrafts) {
        const value = JSON.parse(rawDrafts);
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const restored: Record<string, ReviewDraft> = {};
          for (const [id, d] of Object.entries(value)) {
            const v = d as ReviewDraft;
            const base = initial.find((m) => m.id === id);
            if (
              base &&
              v?.match &&
              v.match.id === id &&
              v.match.a === base.a &&
              v.match.b === base.b &&
              v.match.pod === base.pod &&
              typeof v.note === "string" &&
              typeof v.match.note === "string" &&
              typeof v.match.course === "string" &&
              typeof v.match.tees === "string" &&
              typeof v.match.date === "string" &&
              (v.match.lockedAt === null ||
                typeof v.match.lockedAt === "string") &&
              typeof v.match.evidence === "boolean" &&
              [v.match.scores, v.match.strokes].every(
                (rows) =>
                  Array.isArray(rows) &&
                  rows.length === 4 &&
                  rows.every(
                    (row) =>
                      Array.isArray(row) &&
                      row.length === 18 &&
                      row.every(
                        (n) => typeof n === "number" && Number.isFinite(n),
                      ),
                  ),
              )
            )
              restored[id] = v;
          }
          setDrafts(restored);
        }
      }
    } catch {
      setNotice(
        "Saved drafts could not be restored. Published sample results are retained separately.",
      );
    }
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (validSnapshot(parsed)) setMatches(parsed);
        else
          setNotice(
            "Saved preview could not be restored. Showing the original sample.",
          );
      }
    } catch {
      setNotice(
        "Browser storage is unavailable. Changes will last for this visit only.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    } catch {
      setNotice(
        "Draft storage is unavailable. Keep this tab open; drafts will be lost on refresh.",
      );
    }
  }, [drafts, ready]);
  const save = useCallback((next: Match[], message: string) => {
    setMatches(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setNotice(message + " Saved in this browser.");
      return true;
    } catch {
      setNotice(
        message +
          " Browser storage is unavailable; changes will be lost on refresh.",
      );
      return false;
    }
  }, []);
  const reset = () => {
    save(initial, "Sample season restored.");
    setDrafts({});
  };
  return (
    <Context.Provider
      value={{
        matches,
        ready,
        notice,
        save,
        reset,
        drafts,
        setDraft,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePreview() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("Missing preview provider");
  return ctx;
}
