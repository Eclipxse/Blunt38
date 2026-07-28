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

const signalNoise = [
  "..:: 38 ::..",
  "/// SIGNAL LOCKED ///",
  "[ AI ] [ MUSIC ] [ STUDIO ]",
  "01100010 00110011 00111000",
  "NONE EXPLAINED",
  "///// ONLINE /////"
];

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "#f1e8f3",
          background:
            "linear-gradient(135deg, #09070c 0%, #130e18 48%, #09070c 100%)",
          fontFamily: "monospace"
        }}
      >
        {Array.from({ length: 32 }, (_, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${index * 20}px`,
              height: "1px",
              display: "flex",
              background:
                index % 4 === 0
                  ? "rgba(219, 115, 158, 0.13)"
                  : "rgba(238, 228, 215, 0.045)"
            }}
          />
        ))}

        <div
          style={{
            position: "absolute",
            top: "-135px",
            right: "-85px",
            width: "490px",
            height: "490px",
            display: "flex",
            border: "1px solid rgba(170, 162, 239, 0.24)",
            borderRadius: "245px"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-77px",
            right: "-27px",
            width: "374px",
            height: "374px",
            display: "flex",
            border: "1px solid rgba(83, 201, 184, 0.18)",
            borderRadius: "187px"
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "34px",
            left: "34px",
            width: "1132px",
            height: "562px",
            display: "flex",
            border: "2px solid #675275",
            boxShadow: "10px 10px 0 #24172b"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-8px",
              left: "24px",
              display: "flex",
              padding: "0 10px",
              color: "#53c9b8",
              background: "#09070c",
              fontSize: "17px",
              letterSpacing: "2px"
            }}
          >
            BLUNT38 CONTROL SIGNAL
          </div>

          <div
            style={{
              position: "absolute",
              top: "70px",
              left: "62px",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#db739e",
                fontSize: "18px",
                letterSpacing: "3px"
              }}
            >
              &gt; IDENTITY HANDSHAKE COMPLETE
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: "25px",
                gap: "1px"
              }}
            >
              {wordmark.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  style={{
                    display: "flex",
                    height: "31px"
                  }}
                >
                  {row.split("").map((character, columnIndex) => (
                    <div
                      key={`${rowIndex}-${columnIndex}`}
                      style={{
                        width: "17px",
                        height: "31px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color:
                          columnIndex > 29
                            ? "#db739e"
                            : rowIndex % 2 === 0
                              ? "#f1e8f3"
                              : "#c9bbd3",
                        fontSize: "27px",
                        fontWeight: 700,
                        textShadow:
                          character === "#" ? "3px 2px 0 #50385d" : "none"
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
                display: "flex",
                alignItems: "center",
                marginTop: "22px",
                gap: "13px"
              }}
            >
              <div
                style={{
                  width: "11px",
                  height: "11px",
                  display: "flex",
                  borderRadius: "50%",
                  background: "#53c9b8",
                  boxShadow: "0 0 20px #53c9b8"
                }}
              />
              <div
                style={{
                  display: "flex",
                  color: "#aaa2ef",
                  fontSize: "19px",
                  letterSpacing: "2px"
                }}
              >
                AI / MUSIC / AUTOMATION / STUDIO
              </div>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: "95px",
              left: "845px",
              width: "245px",
              display: "flex",
              flexDirection: "column",
              gap: "13px",
              opacity: 0.68
            }}
          >
            {signalNoise.map((line, index) => (
              <div
                key={line}
                style={{
                  display: "flex",
                  justifyContent: index % 2 === 0 ? "flex-start" : "flex-end",
                  color:
                    index % 3 === 0
                      ? "#db739e"
                      : index % 3 === 1
                        ? "#aaa2ef"
                        : "#53c9b8",
                  fontSize: "13px",
                  letterSpacing: "1px"
                }}
              >
                {line}
              </div>
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              top: "456px",
              left: "62px",
              width: "1024px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingTop: "19px",
              borderTop: "1px solid rgba(170, 162, 239, 0.34)"
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                color: "#f1e8f3"
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "25px",
                  letterSpacing: "1px"
                }}
              >
                38 reasons.
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: "4px",
                  color: "#db739e",
                  fontSize: "25px",
                  letterSpacing: "1px"
                }}
              >
                none explained.
              </div>
            </div>
            <div
              style={{
                display: "flex",
                color: "#9385a0",
                fontSize: "16px",
                letterSpacing: "1px"
              }}
            >
              panel.eclipxse.in // 07:38:38
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: "30px",
            right: "58px",
            display: "flex",
            color: "#db739e",
            fontSize: "15px"
          }}
        >
          REC ●
        </div>
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
