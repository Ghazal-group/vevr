import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";
export function Dialog({ title, close, children }: any) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="editor"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="dialogin">
        <button
          type="button"
          aria-label="Close dialog"
          className="xbtn"
          onClick={close}
        >
          <X size={19} />
        </button>
        <small className="kicker">VEVR WORKSPACE</small>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
