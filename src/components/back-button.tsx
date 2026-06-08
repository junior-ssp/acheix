"use client";

export function BackButton({ label = "Voltar" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.href = "/";
      }}
      className="inline-flex h-11 items-center justify-center rounded-md px-4 btn-gold"
    >
      {label}
    </button>
  );
}
