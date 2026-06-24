import { useCallback, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
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
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  className="h-32 w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <video src={att.dataUrl} controls preload="metadata" className="h-32 w-full bg-black object-contain" />
              )}

              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  title="Remove"
                  aria-label={`Remove ${att.name}`}
                  className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-yellow-200 opacity-80 transition-opacity hover:bg-red-600/80 hover:text-white group-hover:opacity-100"
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
    </div>
  );
}
