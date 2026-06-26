import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Paperclip, X, Maximize2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  filesToAttachments,
  formatBytes,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_ACCEPT,
  type QuestAttachment,
} from "@/lib/attachments";

interface AttachmentAreaProps {
  attachments: QuestAttachment[];
  onChange: (next: QuestAttachment[]) => void;
  /** The description editor (textarea) that becomes the drop target. */
  children: React.ReactNode;
  disabled?: boolean;
  /** Show the "Images ≤ 8MB, videos ≤ 25MB" helper line. Default true. */
  showHint?: boolean;
  className?: string;
}

/**
 * Wraps a description textarea to support inline media:
 *  - a subtle paperclip button to pick images/videos
 *  - drag-and-drop onto the field (with a drop overlay)
 *  - inline image/video previews rendered directly beneath the text
 *
 * Media is converted to base64 data URLs and surfaced via `onChange`, ready to
 * be persisted in the task's `attachments` field.
 */
export function AttachmentArea({
  attachments,
  onChange,
  children,
  disabled = false,
  showHint = true,
  className,
}: AttachmentAreaProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // The attachment currently shown full-screen in the lightbox (null = closed).
  const [lightbox, setLightbox] = useState<QuestAttachment | null>(null);
  // Track drag enter/leave depth so the overlay doesn't flicker over child nodes.
  const dragDepth = useRef(0);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;
      const list = Array.from(files);
      if (list.length === 0) return;
      setIsProcessing(true);
      try {
        const { attachments: added, errors } = await filesToAttachments(list);
        if (errors.length > 0) {
          toast({
            title: errors.length === list.length ? "Couldn't add media" : "Some files were skipped",
            description: errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more)` : ""),
            variant: "destructive",
          });
        }
        if (added.length > 0) {
          onChange([...attachments, ...added]);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [attachments, disabled, onChange, toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setIsDragging(false);
      if (disabled) return;
      if (e.dataTransfer?.files?.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles, disabled],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      // Only react to actual file drags, not text selections.
      if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return;
      if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }, []);

  const handlePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files);
      // Reset so picking the same file again still fires onChange.
      e.target.value = "";
    },
    [addFiles],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      onChange(attachments.filter((a) => a.id !== id));
    },
    [attachments, onChange],
  );

  // While the lightbox is open: close on Escape and lock body scroll.
  // The keydown listener runs in the capture phase and stops propagation so a
  // parent Radix Dialog (e.g. the task detail modal) doesn't also close.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setLightbox(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="relative"
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {children}

        {/* Subtle paperclip — opens the file picker */}
        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Attach image or video"
            aria-label="Attach image or video"
            className={cn(
              "absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md",
              "text-yellow-300/50 hover:text-yellow-200 hover:bg-yellow-600/20",
              "border border-transparent hover:border-yellow-500/40 transition-colors",
              isProcessing && "opacity-60 pointer-events-none",
            )}
          >
            <Paperclip className="h-4 w-4" />
          </button>
        )}

        {/* Drag overlay */}
        {isDragging && !disabled && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-yellow-400/70 bg-slate-900/80 backdrop-blur-sm">
            <Paperclip className="mb-1 h-6 w-6 text-yellow-300" />
            <span className="text-sm font-medium text-yellow-200">Drop image or video to embed</span>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ACCEPT}
          multiple
          className="hidden"
          onChange={handlePick}
        />
      </div>

      {showHint && (
        <p className="text-[11px] text-yellow-400/50">
          <Paperclip className="mr-1 inline h-3 w-3 align-[-1px]" />
          Attach or drag &amp; drop to embed media · images ≤ {formatBytes(MAX_IMAGE_BYTES)}, videos ≤{" "}
          {formatBytes(MAX_VIDEO_BYTES)}
        </p>
      )}

      {/* Inline media previews — rendered directly within the description block */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {attachments.map((att) => (
            <figure
              key={att.id}
              className="group relative overflow-hidden rounded-md border border-yellow-600/30 bg-slate-950/60"
            >
              {att.type === "image" ? (
                <button
                  type="button"
                  onClick={() => setLightbox(att)}
                  title="Click to view full image"
                  aria-label={`View ${att.name}`}
                  className="relative block h-32 w-full cursor-zoom-in"
                >
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="h-32 w-full object-contain"
                    loading="lazy"
                  />
                  {/* Hover hint — appears on desktop hover to signal click-to-expand */}
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-all group-hover:bg-slate-950/30 group-hover:opacity-100">
                    <Maximize2 className="h-5 w-5 text-white drop-shadow-lg" />
                  </span>
                </button>
              ) : (
                <video src={att.dataUrl} controls preload="metadata" className="h-32 w-full bg-black object-contain" />
              )}

              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAttachment(att.id);
                  }}
                  title="Remove attachment"
                  aria-label={`Remove ${att.name}`}
                  className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-yellow-200 shadow-sm transition-all hover:bg-red-600/90 hover:text-white opacity-100 md:opacity-0 md:group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              <figcaption className="flex items-center justify-between gap-1 px-1.5 py-1 text-[10px] text-yellow-300/70">
                <span className="truncate">{att.name}</span>
                <span className="shrink-0 text-yellow-400/40">{formatBytes(att.size)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {/* Full-screen lightbox — portaled to <body> so it overlays everything.
          Pointer/click propagation is stopped so a parent Radix Dialog stays open. */}
      {lightbox &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex flex-col bg-black/90 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Top bar: filename + download + close */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
              <span className="truncate text-sm font-medium">{lightbox.name}</span>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={lightbox.dataUrl}
                  download={lightbox.name}
                  onClick={(e) => e.stopPropagation()}
                  title="Download"
                  aria-label="Download"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  title="Close"
                  aria-label="Close"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Media — click on the media itself does NOT close the lightbox */}
            <div className="flex flex-1 items-center justify-center overflow-auto p-4 pt-0">
              {lightbox.type === "image" ? (
                <img
                  src={lightbox.dataUrl}
                  alt={lightbox.name}
                  className="max-h-full max-w-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <video
                  src={lightbox.dataUrl}
                  controls
                  autoPlay
                  className="max-h-full max-w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>

            <p className="pb-3 text-center text-[11px] text-white/40">
              Click anywhere or press Esc to close
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}
