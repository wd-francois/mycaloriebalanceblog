// Shared modal shell — consolidates the `fixed inset-0 ... bg-black/NN`
// overlay hand-rolled across ~8 places in the Pro app (ProHome, ProPrograms,
// ProDayModal, ExercisePickerModal, ProPhotos) with a single z-index scale.
// Header/body content stays entirely up to the caller; this only owns the
// overlay, backdrop-click-to-close, and card/sheet/lightbox positioning.

// One z-index scale for every Pro modal, replacing the ad-hoc z-50 / z-[200]
// / z-[300] values scattered across call sites:
//   base    — a modal opened directly from a page (most dialogs)
//   stacked — a modal opened from within another modal (e.g. exercise
//             picker opened while a program/day-entry modal is open)
//   top     — always-on-top overlays (e.g. the photo lightbox)
export const MODAL_Z = {
  base: 'z-50',
  stacked: 'z-[200]',
  top: 'z-[300]',
};

const VARIANT_OVERLAY = {
  center: 'items-center justify-center p-4 bg-black/50 backdrop-blur-sm',
  sheet: 'items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm',
  lightbox: 'items-center justify-center p-4 bg-black/90',
};

const VARIANT_CARD = {
  center: 'w-full max-w-lg bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl shadow-2xl',
  sheet: 'w-full sm:max-w-2xl h-[90vh] sm:h-[85vh] bg-white dark:bg-[var(--color-bg-muted)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden',
  lightbox: '',
};

export default function Modal({
  children,
  onClose,
  variant = 'center',
  zLayer = 'base',
  className = '',
  closeOnBackdrop = true,
}) {
  return (
    <div
      className={`fixed inset-0 ${MODAL_Z[zLayer] ?? MODAL_Z.base} flex ${VARIANT_OVERLAY[variant] ?? VARIANT_OVERLAY.center}`}
      onClick={closeOnBackdrop && onClose ? onClose : undefined}
    >
      <div
        className={`${VARIANT_CARD[variant] ?? VARIANT_CARD.center} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
