import { Palette, Check } from 'lucide-react';
import { useTheme, type ThemeOption } from '../contexts/ThemeContext';
import styles from './Settings.module.css';

export function Settings() {
  const { theme, setTheme, themes, currentTheme } = useTheme();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Theme Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Palette size={20} />
            <h2 className={styles.sectionTitle}>Theme</h2>
          </div>
          <p className={styles.sectionDescription}>
            Choose a color theme for the interface. Your preference is saved locally.
          </p>

          <div className={styles.themeGrid}>
            {themes.map((t: ThemeOption) => (
              <button
                key={t.id}
                className={`${styles.themeCard} ${theme === t.id ? styles.active : ''}`}
                onClick={() => setTheme(t.id)}
              >
                <div className={styles.themePreview}>
                  <div
                    className={styles.colorSwatch}
                    style={{ backgroundColor: t.primaryColor }}
                  />
                  <div
                    className={styles.colorSwatch}
                    style={{ backgroundColor: t.secondaryColor }}
                  />
                </div>
                <div className={styles.themeInfo}>
                  <span className={styles.themeName}>{t.name}</span>
                  <span className={styles.themeDesc}>{t.description}</span>
                </div>
                {theme === t.id && (
                  <div className={styles.checkMark}>
                    <Check size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Current Theme Display */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Current Theme Preview</h2>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <span className={styles.previewTitle}>{currentTheme.name}</span>
              <span className={styles.previewBadge}>Active</span>
            </div>
            <div className={styles.previewColors}>
              <div className={styles.colorDemo}>
                <div
                  className={styles.colorBlock}
                  style={{ backgroundColor: currentTheme.primaryColor }}
                />
                <span>Primary</span>
              </div>
              <div className={styles.colorDemo}>
                <div
                  className={styles.colorBlock}
                  style={{ backgroundColor: currentTheme.secondaryColor }}
                />
                <span>Secondary</span>
              </div>
            </div>
            <div className={styles.previewButtons}>
              <button className={styles.btnPrimary}>Primary Button</button>
              <button className={styles.btnSecondary}>Secondary Button</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
