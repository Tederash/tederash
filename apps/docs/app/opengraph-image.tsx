import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Tederash — Adaptive Accessibility Framework for React";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fefdfb",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo mark: teal rounded square with the two-rings glyph */}
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: 26,
            background: "#0f766e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", position: "relative", width: 60, height: 60 }}>
            <div
              style={{
                position: "absolute",
                top: 2,
                left: 2,
                width: 30,
                height: 30,
                borderRadius: 30,
                border: "5px solid #ffffff",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 30,
                height: 30,
                borderRadius: 30,
                border: "5px solid #ffffff",
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            color: "#18181b",
            letterSpacing: "-0.04em",
            marginBottom: 16,
          }}
        >
          Tederash
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#0f766e",
            fontWeight: 600,
            marginBottom: 48,
          }}
        >
          Adaptive Accessibility Framework for React
        </div>

        <div style={{ display: "flex", gap: 24, fontSize: 24, color: "#52525b" }}>
          <div style={{ display: "flex" }}>@tederash/core</div>
          <div style={{ display: "flex" }}>@tederash/react</div>
          <div style={{ display: "flex" }}>@tederash/components</div>
          <div style={{ display: "flex" }}>@tederash/assistance</div>
        </div>
      </div>
    ),
    size
  );
}
