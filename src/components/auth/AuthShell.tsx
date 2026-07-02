import { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import styles from "@/app/auth/auth.module.css";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.brandLink}>
          <Logo size={48} />
        </Link>

        <section className={styles.formCard}>
          <h1 className={styles.heading}>{title}</h1>
          {subtitle ? <p className={styles.subheading}>{subtitle}</p> : null}
          {children}
        </section>
      </div>
    </div>
  );
}
