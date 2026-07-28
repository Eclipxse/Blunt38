import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const glyphs: Record<string, string[]> = {
  b: ["#    ", "#    ", "#### ", "#   #", "#   #", "#   #", "#### "],
  l: ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
  u: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  n: ["#   #", "##  #", "##  #", "# # #", "#  ##", "#  ##", "#   #"],
  t: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  "3": ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "]
};

const wordmark = Array.from({ length: 7 }, (_, row) =>
  "blunt38"
    .split("")
    .map((character) => glyphs[character][row])
    .join(" ")
);

export async function GET() {
  const banner = await readFile(
    join(process.cwd(), "public", "brand", "blunt38-banner.jpg")
  );
  const bannerSource = `data:image/jpeg;base64,${banner.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "#3d274a",
          background: "#d8c2d9",
          fontFamily: "monospace"
        }}
      >
        <img
          alt=""
          src={bannerSource}
          width="1200"
          height="480"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "480px",
            objectFit: "cover"
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "476px",
            left: 0,
            width: "1200px",
            height: "154px",
            display: "flex",
            background: "#d7c1d8",
            borderTop: "4px solid #62416f"
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "495px",
            left: "45px",
            display: "flex",
            flexDirection: "column",
            gap: "1px"
          }}
        >
          {wordmark.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                height: "16px",
                display: "flex"
              }}
            >
              {row.split("").map((character, columnIndex) => (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  style={{
                    width: "12px",
                    height: "17px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: columnIndex > 29 ? "#8e4c78" : "#4b3159",
                    fontSize: "18px",
                    fontWeight: 700
                  }}
                >
                  {character === "#" ? "#" : " "}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            top: "500px",
            left: "670px",
            width: "470px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end"
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#5d3c6a",
              fontSize: "34px",
              letterSpacing: "1px"
            }}
          >
            blunt38.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "9px",
              color: "#875f8d",
              fontSize: "16px",
              letterSpacing: "2px"
            }}
          >
            DISCORD CONTROL CENTER
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "13px",
              color: "#9c769d",
              fontSize: "14px",
              letterSpacing: "1px"
            }}
          >
            panel.eclipxse.in
          </div>
        </div>

        {Array.from({ length: 42 }, (_, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              top: `${index * 15}px`,
              left: 0,
              width: "1200px",
              height: "1px",
              display: "flex",
              background:
                index % 5 === 0
                  ? "rgba(70, 36, 81, 0.12)"
                  : "rgba(255, 255, 255, 0.08)"
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            inset: "12px",
            display: "flex",
            border: "3px solid rgba(72, 42, 86, 0.75)"
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400"
      }
    }
  );
}
