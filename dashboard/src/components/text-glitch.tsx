import type { CSSProperties } from "react";

type TextGlitchProps = {
  text: string;
  className?: string;
  speed?: number;
  enableShadows?: boolean;
  enableOnHover?: boolean;
};

type GlitchStyle = CSSProperties & {
  "--glitch-after-duration": string;
  "--glitch-before-duration": string;
  "--glitch-after-shadow": string;
  "--glitch-before-shadow": string;
};

export function TextGlitch({
  text,
  className = "",
  speed = 1.35,
  enableShadows = true,
  enableOnHover = false
}: TextGlitchProps) {
  const style: GlitchStyle = {
    "--glitch-after-duration": `${speed * 3}s`,
    "--glitch-before-duration": `${speed * 2}s`,
    "--glitch-after-shadow": enableShadows
      ? "-5px 0 rgba(226, 104, 161, 0.78)"
      : "none",
    "--glitch-before-shadow": enableShadows
      ? "5px 0 rgba(92, 214, 210, 0.68)"
      : "none"
  };

  return (
    <span
      className={[
        "text-glitch",
        enableOnHover ? "text-glitch-on-hover" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      data-text={text}
      style={style}
    >
      {text}
    </span>
  );
}
