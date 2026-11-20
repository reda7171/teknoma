'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'html5qr-code-full-region';

  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode(regionId);
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Stop scanning and return result
            if (scannerRef.current) {
              scannerRef.current.stop().then(() => {
                onResult(decodedText);
              }).catch(err => {
                console.error("Failed to stop scanner", err);
              });
            }
          },
          (errorMessage) => {
            // parse errors are normal (no barcode in frame)
          }
        );
      } catch (err: any) {
        setError("Erreur d'accès à la caméra. Vérifiez les permissions.");
        // Ignorer l'erreur dans la console pour éviter l'overlay Next.js
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-black uppercase tracking-tight">Scanner</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Placez le code-barres au centre</p>
            </div>
          </div>
          <button aria-label="Fermer" 
            onClick={onClose}
            className="w-10 h-10 bg-white border border-gray-200 text-gray-500 rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-black relative">
          {error ? (
            <div className="text-red-500 text-center p-4 font-bold text-sm bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden bg-black/50 border-2 border-white/10 relative">
              <div id={regionId} className="w-full min-h-[300px]"></div>
              {/* Scanline overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                 <div className="flex-1 bg-black/40"></div>
                 <div className="h-[150px] border-y-2 border-emerald-500 relative">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.8)] animate-scan"></div>
                 </div>
                 <div className="flex-1 bg-black/40"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
