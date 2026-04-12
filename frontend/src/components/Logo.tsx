import styles from "./Logo.module.css";

const Logo = ({ size = 80 }: { size?: number }) => {
  const fontSize = Math.max(12, size * 0.34);
  const badgeFontSize = Math.max(7, size * 0.13);

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
        <span className={styles.wordmarkBase}>
          Limited Searc
          <span className={styles.wordmarkEnd}>
            h
            <span
              className={styles.badge}
              style={{
                fontSize: badgeFontSize,
                top: `${Math.max(-8, size * -0.2)}px`,
                right: `${Math.max(-28, size * -0.42)}px`,
              }}
            >
              BETA
            </span>
          </span>
        </span>
      </span>
    </div>
  );
};

export default Logo;
