import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

function splitTrailingPunctuation(url: string): { href: string; trailing: string } {
  const match = url.match(/^(.*?)([),.\]\}»"']+)$/);
  if (!match) return { href: url, trailing: "" };
  return { href: match[1], trailing: match[2] };
}

/** Turn plain-text URLs into clickable links; keeps other text as-is (including newlines). */
export function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_PATTERN);

  return parts.map((part, index) => {
    if (!/^https?:\/\//i.test(part)) {
      return <span key={index}>{part}</span>;
    }

    const { href, trailing } = splitTrailingPunctuation(part);
    return (
      <span key={index}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-semibold text-[#8a6500] hover:text-[#361e01] break-all"
        >
          {href}
        </a>
        {trailing}
      </span>
    );
  });
}
