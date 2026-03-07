"use client";

export default function MessageImage({ src }: { src: string }) {
  return (
    <div className="my-3">
      <img
        src={src}
        alt="preview"
        className="rounded-xl border border-black/10 max-w-full shadow"
      />
    </div>
  );
}
