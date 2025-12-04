import { Palette, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTheme, type ThemeOption } from '../contexts/ThemeContext';
import styles from './ThemeSwitcher.module.css';

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        title="Change theme"
      >
        <Palette size={18} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>Select Theme</div>
          <div className={styles.themeList}>
            {themes.map((t: ThemeOption) => (
              <button
                key={t.id}
                className={`${styles.themeOption} ${theme === t.id ? styles.active : ''}`}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
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
                  <Check size={16} className={styles.checkIcon} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
