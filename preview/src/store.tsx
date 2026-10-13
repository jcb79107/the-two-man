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
const KEY = "two-man-season2-preview-v1";
export type ReviewDraft = { match: Match; note: string };
type Store = {
  matches: Match[];
  ready: boolean;
  notice: string;
  save: (next: Match[], message: string) => boolean;
  reset: () => void;
  role: "player" | "commissioner";
  setRole: (r: "player" | "commissioner") => void;
  photo: string | null;
  photoMatch: string | null;
  setPhoto: (p: string | null, matchId?: string) => void;
  drafts: Record<string, ReviewDraft>;
  setDraft: (id: string, draft: ReviewDraft | null) => void;
};
const Context = createContext<Store | null>(null);
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [matches, setMatches] = useState<Match[]>(initial);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState<"player" | "commissioner">("player");
  const [photo, updatePhoto] = useState<string | null>(null);
  const [photoMatch, setPhotoMatch] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const setPhoto = (p: string | null, id?: string) => {
    updatePhoto(p);
    setPhotoMatch(id ?? null);
  };
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
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
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
        role,
        setRole,
        photo,
        setPhoto,
        photoMatch,
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
