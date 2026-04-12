const Logo = ({ size = 80 }: { size?: number }) => {
  const fontSize = Math.max(12, size * 0.34)
  const badgeFontSize = Math.max(7, size * 0.13)
  const badgePaddingX = Math.max(5, size * 0.09)
  const badgePaddingY = Math.max(2, size * 0.03)

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${Math.max(4, size * 0.08)}px 0`,
        lineHeight: 1,
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
            "0 0 12px rgba(103, 232, 249, 0.62), 0 0 28px rgba(236, 72, 153, 0.42)",
        }}
      >
        Limited Seach
      </span>
      <span
        style={{
          position: "absolute",
          top: Math.max(-4, size * -0.05),
          right: Math.max(-18, size * -0.24),
          padding: `${badgePaddingY}px ${badgePaddingX}px`,
          borderRadius: 999,
          border: "1px solid rgba(251, 191, 36, 0.8)",
          background: "linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(249, 115, 22, 0.95) 100%)",
          color: "#140d00",
          fontSize: badgeFontSize,
          fontWeight: 900,
          letterSpacing: "0.12em",
          lineHeight: 1,
          boxShadow: "0 0 12px rgba(251, 191, 36, 0.45), 0 0 22px rgba(249, 115, 22, 0.28)",
        }}
      >
        BETA
      </span>
    </div>
  )
}

export default Logo
