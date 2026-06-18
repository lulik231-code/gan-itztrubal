"use client";

import { useRef, useState, useImperativeHandle, forwardRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  getSignatureDataUrl: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  error?: boolean;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ error }, ref) => {
    const sigRef = useRef<SignatureCanvas>(null);
    const [hasDrawn, setHasDrawn] = useState(false);

    useImperativeHandle(ref, () => ({
      getSignatureDataUrl: () => {
        if (!sigRef.current || sigRef.current.isEmpty()) return null;
        // Trim whitespace around the signature for a cleaner embed in the PDF
        return sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      },
      clear: () => {
        sigRef.current?.clear();
        setHasDrawn(false);
      },
      isEmpty: () => sigRef.current?.isEmpty() ?? true,
    }));

    return (
      <div className="flex flex-col gap-2">
        <div
          className={`relative rounded-xl border-2 bg-card overflow-hidden ${
            error ? "border-clay" : "border-line"
          }`}
        >
          <SignatureCanvas
            ref={sigRef}
            penColor="#1C2B1E"
            canvasProps={{
              className: "w-full touch-none",
              style: { height: "180px" },
            }}
            onBegin={() => setHasDrawn(true)}
          />
          {!hasDrawn && (
            <p className="absolute inset-0 flex items-center justify-center text-pine-dark/30 text-sm pointer-events-none">
              חתמו כאן באמצעות האצבע או העכבר
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            sigRef.current?.clear();
            setHasDrawn(false);
          }}
          className="self-start flex items-center gap-1.5 text-sm text-pine hover:text-amber-dark transition-colors px-1"
        >
          <Eraser className="h-4 w-4" />
          נקה וחתום מחדש
        </button>
      </div>
    );
  }
);
SignaturePad.displayName = "SignaturePad";
