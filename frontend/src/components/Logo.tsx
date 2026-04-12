const Logo = ({ size = 80 }: { size?: number }) => {
  const fontSize = Math.max(12, size * 0.34)
  const borderRadius = size * 0.46
  const paddingX = Math.max(12, size * 0.34)
  const minWidth = Math.max(110, size * 3.6)

  return (
    <div
      style={{
        height: size,
        minWidth: minWidth,
        padding: `0 ${paddingX}px`,
        borderRadius: borderRadius,
        border: "1.5px solid rgba(34, 211, 238, 0.72)",
        display: "inline-flex",
        alignItems: 'center',
        justifyContent: 'center',
        background:
          "linear-gradient(135deg, rgba(8, 145, 178, 0.2) 0%, rgba(16, 185, 129, 0.12) 46%, rgba(236, 72, 153, 0.22) 100%)",
        boxShadow:
          "0 0 18px rgba(34, 211, 238, 0.28), 0 0 34px rgba(236, 72, 153, 0.18), inset 0 0 16px rgba(255, 255, 255, 0.08)",
        filter: "drop-shadow(0 0 8px rgba(34, 211, 238, 0.45))",
        backdropFilter: "blur(10px)",
      }}
    >
      <span
        style={{
          fontSize: fontSize,
          fontWeight: 900,
          letterSpacing: "0.08em",
          fontFamily: "'Arial Black', 'Segoe UI', sans-serif",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          transform: "skewX(-8deg)",
          background: "linear-gradient(90deg, #67e8f9 0%, #a7f3d0 45%, #f9a8d4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow:
            "0 0 10px rgba(103, 232, 249, 0.55), 0 0 22px rgba(236, 72, 153, 0.35)",
        }}
      >
        Limited Seach
      </span>
    </div>
  )
}

export default Logo
