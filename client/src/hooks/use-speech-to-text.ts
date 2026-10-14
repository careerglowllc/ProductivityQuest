import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null;
};

const recognitionClass = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const speechErrorMessage = (code: string): string =>
  code === "not-allowed" || code === "service-not-allowed" ? "Microphone access is blocked. Allow it in your browser or settings, or use your keyboard's dictation."
    : code === "no-speech" ? "Did not hear anything. Try again."
    : code === "audio-capture" ? "No microphone was found."
    : "Voice typing stopped. You can keep typing, or use your keyboard's dictation.";

// Voice to text using the browser's speech recognition where it exists. Each finished phrase is passed to onText.
// Where it does not (some in-app browsers), `supported` is false and the keyboard's own dictation key still works.
export function useSpeechToText(onText: (phrase: string) => void) {
  const supported = recognitionClass() !== null;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const handler = useRef(onText);
  handler.current = onText;

  const stop = useCallback(() => { recognition.current?.stop(); }, []);
  const start = useCallback(() => {
    const Recognizer = recognitionClass();
    if (!Recognizer) return;
    setError(null);
    const instance = new Recognizer();
    instance.continuous = true;
    instance.interimResults = false;
    instance.lang = navigator.language || "en-US";
    instance.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) handler.current(event.results[i][0].transcript);
      }
    };
    instance.onerror = (event) => { if (event.error !== "aborted") setError(speechErrorMessage(event.error)); };
    instance.onend = () => { setListening(false); recognition.current = null; };
    recognition.current = instance;
    try { instance.start(); setListening(true); } catch { setListening(false); }
  }, []);

  useEffect(() => () => recognition.current?.abort(), []);
  return { supported, listening, error, start, stop };
}
