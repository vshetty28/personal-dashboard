// Apps a story can be handed off to, each opened with the prompt prefilled.
// ChatGPT and Google (AI Mode, udm=50) submit it right away; Claude prefills the composer.
const CONTINUE_TARGETS = [
  { name: "ChatGPT", domain: "chatgpt.com", href: (q: string) => `https://chatgpt.com/?q=${q}` },
  { name: "Claude", domain: "claude.ai", href: (q: string) => `https://claude.ai/new?q=${q}` },
  { name: "Google", domain: "google.com", href: (q: string) => `https://www.google.com/search?udm=50&q=${q}` },
] as const;

export function OpenInAI({ prompt }: { prompt: string }) {
  const q = encodeURIComponent(prompt);
  return (
    <div className="mt-0.5 flex items-center gap-1">
      {CONTINUE_TARGETS.map((t) => (
        <a
          key={t.name}
          href={t.href(q)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open in ${t.name}`}
          title={`Open in ${t.name}`}
          className="flex size-7 items-center justify-center rounded-md opacity-70 transition hover:bg-raised hover:opacity-100 focus-visible:bg-raised focus-visible:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote favicon, no optimization needed */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${t.domain}&sz=64`}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-4 rounded-[3px]"
          />
        </a>
      ))}
    </div>
  );
}

