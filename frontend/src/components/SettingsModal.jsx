export default function SettingsModal({ soundEnabled, animationsEnabled, onSoundToggle, onAnimationsToggle, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <h2 className="settings-title">⚙ Configurações</h2>

        <div className="settings-list">
          <div className="settings-row">
            <span className="settings-row-label">Som</span>
            <button
              className={`toggle-btn${soundEnabled ? ' on' : ''}`}
              onClick={onSoundToggle}
              aria-label="Alternar som"
            />
          </div>
          <div className="settings-row">
            <span className="settings-row-label">Animações</span>
            <button
              className={`toggle-btn${animationsEnabled ? ' on' : ''}`}
              onClick={onAnimationsToggle}
              aria-label="Alternar animações"
            />
          </div>
        </div>

        <button className="btn-modal-close" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}
