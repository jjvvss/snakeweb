import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';
import { SKINS } from '../constants/game';
import { loadData, saveData } from '../utils/storage';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
];

const THEMES = ['green', 'blue', 'purple', 'red'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [data, setData] = useState(loadData);

  const update = (patch) => {
    setData(prev => {
      const next = { ...prev, ...patch };
      saveData(patch);
      return next;
    });
  };

  const changeLang = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('neon-snake-lang', code);
  };

  const selectSkin = (id) => {
    const skin = SKINS.find(s => s.id === id);
    if (!skin || data.totalScore < skin.pts) return;
    update({ selectedSkin: id });
  };

  return (
    <div className="screen settings-screen">
      <div className="settings-header">
        <button className="back-btn" onClick={() => nav('/')}>← {t('settings.back')}</button>
        <h2 className="settings-title">{t('settings.title')}</h2>
      </div>

      <div className="settings-body">
        {/* Sound */}
        <div className="setting-row">
          <span>{t('settings.sound')}</span>
          <button className={`toggle-btn ${data.soundOn ? 'on' : ''}`} onClick={() => update({ soundOn: !data.soundOn })}>
            {data.soundOn ? t('settings.on') : t('settings.off')}
          </button>
        </div>

        {/* Vibration */}
        {'vibrate' in navigator && (
          <div className="setting-row">
            <span>{t('settings.vibration')}</span>
            <button className={`toggle-btn ${data.vibrationOn ? 'on' : ''}`} onClick={() => update({ vibrationOn: !data.vibrationOn })}>
              {data.vibrationOn ? t('settings.on') : t('settings.off')}
            </button>
          </div>
        )}

        {/* Color Theme */}
        <div className="setting-row setting-col">
          <span>{t('settings.theme')}</span>
          <div className="theme-picker">
            {THEMES.map(th => (
              <button
                key={th}
                className={`theme-dot theme-${th} ${data.colorTheme === th ? 'active' : ''}`}
                onClick={() => {
                  update({ colorTheme: th });
                  document.documentElement.setAttribute('data-theme', th);
                }}
              />
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="setting-row setting-col">
          <span>{t('settings.language')}</span>
          <div className="lang-grid">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                className={`lang-btn ${i18n.language === l.code ? 'active' : ''}`}
                onClick={() => changeLang(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Skins */}
        <div className="setting-col">
          <span className="setting-label">{t('settings.skins')}</span>
          <div className="skins-grid">
            {SKINS.map(skin => {
              const unlocked = data.totalScore >= skin.pts;
              const selected = data.selectedSkin === skin.id;
              return (
                <div key={skin.id} className={`skin-card ${selected ? 'selected' : ''} ${!unlocked ? 'locked' : ''}`}
                  onClick={() => selectSkin(skin.id)}>
                  <div className="skin-preview">
                    <div className="skin-square" style={{ background: skin.head, boxShadow: `0 0 8px ${skin.glow}` }} />
                  </div>
                  <span className="skin-name">{t(`skins.${skin.id}`)}</span>
                  <span className="skin-status">
                    {!unlocked ? t('settings.locked', { pts: skin.pts }) : selected ? t('settings.selected') : t('settings.select')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
