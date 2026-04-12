import styles from "./Logo.module.css";

const Logo = ({ size = 80 }: { size?: number }) => {
  const fontSize = Math.max(12, size * 0.34);
  const badgeFontSize = Math.max(7, size * 0.13);
  const badgePaddingX = Math.max(5, size * 0.09);
  const badgePaddingY = Math.max(2, size * 0.03);

  return (
    <div className={styles.logo} style={{ padding: `${Math.max(4, size * 0.08)}px 0` }}>
      <span
        className={styles.wordmark}
        style={{
          fontSize,
          fontWeight: 800,
        }}
      >
        <span className={styles.unPrefix}>Un</span>
        <span className={styles.wordmarkBase}>Limited Search</span>
      </span>
      <span
        className={styles.badge}
        style={{
          top: Math.max(-4, size * -0.05),
          right: Math.max(-18, size * -0.24),
          padding: `${badgePaddingY}px ${badgePaddingX}px`,
          fontSize: badgeFontSize,
        }}
      >
        BETA
      </span>
    </div>
  );
};

export default Logo;
