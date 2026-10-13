import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Check, Sliders, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import { uploadDocument } from '../lib/api';

interface CameraScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

type FilterType = 'normal' | 'xerox_bw' | 'high_contrast' | 'grayscale';

export default function CameraScanModal({ isOpen, onClose, onUploaded }: CameraScanModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('xerox_bw');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customTags, setCustomTags] = useState('xerox, mobile_scan');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream on close or unmount
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  useEffect(() => {
    if (!isOpen) {
      // oxlint-disable-next-line react/set-state-in-effect
      stopCamera();
      // oxlint-disable-next-line react/set-state-in-effect
      setCapturedImage(null);
    }
  }, [isOpen, stopCamera]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setIsCameraActive(false);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply visual Xerox / Scan filter onto canvas
  useEffect(() => {
    if (!capturedImage) return;
    const img = new Image();
    img.src = capturedImage;
    img.onload = () => {
      const canvas = processedCanvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      if (filter === 'normal') return;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        // Luminance
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (filter === 'grayscale') {
          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        } else if (filter === 'high_contrast') {
          // Boost contrast
          const factor = (259 * (128 + 60)) / (255 * (259 - 60));
          const contrastGray = factor * (gray - 128) + 128;
          d[i] = contrastGray;
          d[i + 1] = contrastGray;
          d[i + 2] = contrastGray;
        } else if (filter === 'xerox_bw') {
          // B&W Xerox Photocopy effect with thresholding
          const threshold = 135;
          const val = gray > threshold ? 255 : Math.max(0, gray - 50);
          d[i] = val;
          d[i + 1] = val;
          d[i + 2] = val;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };
  }, [capturedImage, filter]);

  const handleSaveAndUpload = async () => {
    const canvas = processedCanvasRef.current;
    if (!canvas) return;

    setUploading(true);
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `xerox_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await uploadDocument(file, 'scans_xerox', true, customTags);
        setUploading(false);
        onUploaded();
        onClose();
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Failed to upload xerox scan:', err);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl glass rounded-2xl border border-slate-700/80 p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Camera & Xerox Scanner</h2>
              <p className="text-xs text-slate-400">Capture prescription or lab photocopy with high-contrast text enhancement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="my-5 flex-1 min-h-[300px] flex flex-col items-center justify-center bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden relative">
          {!capturedImage && !isCameraActive && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <ImageIcon size={30} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Take a Snapshot or Upload a Photo</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Use your camera to capture physical paper slips, or select an existing phone photo to apply the Xerox enhancement filter.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md"
                >
                  <Camera size={15} />
                  <span>Start Live Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 glass hover:bg-slate-800 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition-all"
                >
                  <Upload size={15} />
                  <span>Choose Photo File</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Active Live Camera */}
          {isCameraActive && !capturedImage && (
            <div className="relative w-full h-full flex flex-col items-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-h-[420px] object-cover rounded-xl"
              />
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleCapture}
                  className="w-14 h-14 rounded-full bg-white border-4 border-amber-500 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all text-slate-900"
                  title="Capture snapshot"
                >
                  <Camera size={22} />
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1.5 glass rounded-lg text-xs text-slate-300 hover:text-white border border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Captured Image Preview Canvas */}
          {capturedImage && (
            <div className="w-full flex flex-col items-center p-2">
              <canvas
                ref={processedCanvasRef}
                className="max-h-[380px] w-auto max-w-full rounded-lg border border-slate-700 shadow-lg object-contain"
              />
            </div>
          )}
        </div>

        {/* Filter Selection Controls (Visible when image captured) */}
        {capturedImage && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Sliders size={14} className="text-amber-400" />
                <span>Document Enhancement Filters:</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  startCamera();
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Retake</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'xerox_bw', label: 'Xerox B&W (Photocopy)', desc: 'Sharp black text' },
                { id: 'high_contrast', label: 'High Contrast', desc: 'Boost faint ink' },
                { id: 'grayscale', label: 'Grayscale', desc: 'Clean monochrome' },
                { id: 'normal', label: 'Original Photo', desc: 'No filter' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id as FilterType)}
                  className={`p-2.5 rounded-xl text-left border transition-all ${
                    filter === f.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'glass border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-semibold">{f.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{f.desc}</p>
                </button>
              ))}
            </div>

            {/* Tags & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400">Tags:</span>
                <input
                  type="text"
                  value={customTags}
                  onChange={(e) => setCustomTags(e.target.value)}
                  placeholder="e.g. xerox, lab, urgent"
                  className="text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 glass rounded-xl text-xs text-slate-400 hover:text-white border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{uploading ? 'Enhancing & Saving...' : 'Save to Xerox Drive'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
