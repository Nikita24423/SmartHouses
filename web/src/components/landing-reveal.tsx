"use client";

import {
  type CSSProperties,
  createElement,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

type RevealTag = "div" | "li" | "article" | "section";

export function LandingReveal({
  as: tag = "div",
  children,
  className = "",
  delay = 0,
}: {
  as?: RevealTag;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.classList.add("is-visible");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.14 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return createElement(
    tag,
    {
      className: `lp-reveal ${className}`.trim(),
      ref,
      style: { "--reveal-delay": `${delay}ms` } as CSSProperties,
    },
    children,
  );
}
