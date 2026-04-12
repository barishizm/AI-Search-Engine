const Logo = ({ size = 80 }: { size?: number }) => {
  const fontSize = size * 0.45
  const borderRadius = size * 0.18

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: borderRadius,
        border: '1.5px solid #8b5cf6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        boxShadow: '0 0 12px #8b5cf640, inset 0 0 12px #8b5cf610',
        filter: 'drop-shadow(0 0 6px #8b5cf6)',
      }}
    >
      <span
        style={{
          fontSize: fontSize,
          fontWeight: 700,
          color: '#a78bfa',
          letterSpacing: '-0.02em',
          fontFamily: 'Inter, sans-serif',
          textShadow: '0 0 10px #8b5cf6, 0 0 20px #7c3aed',
        }}
      >
        LS
      </span>
    </div>
  )
}

export default Logo
