import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Galileo Protocol - Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #020204 0%, #0a0a14 50%, #020204 100%)",
        position: "relative",
      }}
    >
      {/* Top accent line - cyan */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background:
            "linear-gradient(90deg, transparent 0%, #00FFFF 50%, transparent 100%)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          border: "2px solid #D4AF37",
          marginBottom: "24px",
        }}
      >
        <span
          style={{
            fontSize: "40px",
            fontWeight: "bold",
            color: "#D4AF37",
            fontFamily: "serif",
          }}
        >
          G
        </span>
      </div>

      {/* Section label */}
      <p
        style={{
          fontSize: "16px",
          color: "#00FFFF",
          margin: 0,
          marginBottom: "12px",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
        }}
      >
        Blog
      </p>

      {/* Title */}
      <h1
        style={{
          fontSize: "64px",
          fontWeight: "bold",
          color: "#FFFFFF",
          margin: 0,
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        Galileo Protocol
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: "28px",
          color: "#A3A3A3",
          margin: 0,
          textAlign: "center",
        }}
      >
        News, announcements, and ecosystem updates
      </p>

      {/* Bottom accent line - gold */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "4px",
          background:
            "linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%)",
        }}
      />
    </div>,
    {
      ...size,
    },
  );
}
