const Logo = ({ size = 80 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z"
      stroke="#8b5cf6"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      style={{
        filter: 'drop-shadow(0 0 8px #8b5cf6) drop-shadow(0 0 20px #7c3aed)',
      }}
    />
  </svg>
)

export default Logo
