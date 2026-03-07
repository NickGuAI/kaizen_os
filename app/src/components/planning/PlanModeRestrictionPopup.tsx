interface PlanModeRestrictionPopupProps {
  isOpen: boolean;
  planningDay: number;
  onClose: () => void;
  onProceedAnyway: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function PlanModeRestrictionPopup({
  isOpen,
  planningDay,
  onClose,
  onProceedAnyway,
}: PlanModeRestrictionPopupProps) {
  if (!isOpen) return null;

  const dayName = DAY_NAMES[planningDay] || DAY_NAMES[0];

  return (
    <div className="event-edit-overlay" onClick={onClose}>
      <div className="event-edit-modal" onClick={e => e.stopPropagation()}>
        <h4>Planning Day Not Reached</h4>
        <p className="modal-subtitle">
          Your scheduled planning day is <strong>{dayName}</strong>.
        </p>
        <p className="modal-subtitle">
          You can change this in Settings, but we recommend sticking to your schedule.
        </p>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>Got it</button>
          <button className="modal-btn save" onClick={onProceedAnyway}>Plan anyway</button>
        </div>
      </div>
    </div>
  );
}
