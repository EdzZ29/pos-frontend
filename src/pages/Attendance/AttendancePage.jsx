import { useState, useEffect, useCallback, useRef } from 'react';
import { timeLogService } from '../../api';
import { useSettings } from '../../context/SettingsContext';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  FiCamera, FiClock, FiUsers, FiRefreshCw, FiX, FiCheckCircle,
  FiLogIn, FiLogOut, FiDownload, FiSearch, FiActivity,
} from 'react-icons/fi';
import defaultLogo from '../../assets/logo.jpg';

export default function AttendancePage() {
  const { gold, goldDark, goldRgb, logoUrl, isDark, t, panelBg, panelBorder, inputStyle } = useSettings();
  const { users, timeLogs, loading, refreshTimeLogs } = useData();
  const logo = logoUrl || defaultLogo;
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Track refresh timestamp when timeLogs update
  useEffect(() => { setLastRefresh(new Date()); }, [timeLogs]);

  /* tabs: qr-cards | scanner */
  const [activeTab, setActiveTab] = useState('qr-cards');
  const [search, setSearch] = useState('');

  /* scanner state */
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanProcessing, setScanProcessing] = useState(false);
  const html5QrRef = useRef(null);
  const scanLockRef = useRef(false);           // prevent double-fire
  const mountedRef = useRef(true);             // guard setState after unmount

  /* QR preview modal */
  const [previewUser, setPreviewUser] = useState(null);

  /* fetch data */
  // Data is provided by DataContext – no local fetch needed.
  // After mutations we call refreshTimeLogs().

  /* helper: check if user has active shift */
  const getActiveShift = (userId) => timeLogs.find((l) => l.user_id === userId && l.status === 'active');

  /* filtered users for QR cards */
  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role?.name || '').toLowerCase().includes(q);
  });

  /* QR data for a user */
  const generateQRData = (user) => JSON.stringify({
    id: user.id,
    name: user.name,
    role: user.role?.name || 'N/A',
  });

  /* ── Safely stop any running scanner instance ── */
  const destroyScanner = useCallback(async () => {
    scanLockRef.current = true;
    const instance = html5QrRef.current;
    html5QrRef.current = null;
    if (!instance) return;
    try {
      const state = typeof instance.getState === 'function' ? instance.getState() : 0;
      if (state === 2 || state === 3) { // SCANNING or PAUSED
        await instance.stop();
      }
      instance.clear();
    } catch (_) { /* already stopped or cleared */ }
  }, []);

  /* ── Scanner Logic ── */
  const startScanner = async () => {
    // Clean up any previous instance first
    await destroyScanner();
    if (!mountedRef.current) return;

    setScanResult(null);
    setScanError('');
    scanLockRef.current = false;
    setScanning(true);

    // Allow DOM to mount #qr-reader
    await new Promise((r) => setTimeout(r, 500));
    if (!mountedRef.current) return;

    const el = document.getElementById('qr-reader');
    if (!el) {
      if (mountedRef.current) {
        setScanError('Scanner container not found. Please try again.');
        setScanning(false);
      }
      return;
    }

    const qrboxFn = (vw, vh) => {
      const s = Math.min(vw, vh);
      const b = Math.floor(s * 0.7);
      return { width: Math.max(b, 150), height: Math.max(b, 150) };
    };

    const onDecode = (qrInstance) => (decodedText) => {
      if (scanLockRef.current) return;
      scanLockRef.current = true;
      qrInstance.stop()
        .catch(() => {})
        .finally(() => {
          try { qrInstance.clear(); } catch (_) {}
          html5QrRef.current = null;
          if (mountedRef.current) {
            setScanning(false);
            handleScanResult(decodedText);
          }
        });
    };

    try {
      const qr = new Html5Qrcode('qr-reader');
      html5QrRef.current = qr;

      // Enumerate cameras; pick back camera if available
      let cameraConfig;
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const back = cameras.find((c) => /back|rear|environment/i.test(c.label));
          cameraConfig = back ? back.id : cameras[0].id;
        } else {
          cameraConfig = { facingMode: 'environment' };
        }
      } catch (_) {
        cameraConfig = { facingMode: 'environment' };
      }

      if (!mountedRef.current) { await destroyScanner(); return; }

      await qr.start(
        cameraConfig,
        { fps: 15, qrbox: qrboxFn, aspectRatio: 1.0, disableFlip: false },
        onDecode(qr),
        () => { /* no QR in frame */ }
      );
    } catch (err) {
      console.error('Scanner error', err);
      // Fallback: user-facing camera
      try {
        await destroyScanner();
        if (!mountedRef.current) return;

        const qr2 = new Html5Qrcode('qr-reader');
        html5QrRef.current = qr2;

        await qr2.start(
          { facingMode: 'user' },
          { fps: 15, qrbox: qrboxFn, aspectRatio: 1.0 },
          onDecode(qr2),
          () => {}
        );
      } catch (err2) {
        console.error('Fallback scanner error', err2);
        if (mountedRef.current) {
          setScanError('Could not access camera. Make sure camera permissions are allowed, and no other app is using it.');
          setScanning(false);
        }
      }
    }
  };

  const stopScanner = async () => {
    await destroyScanner();
    if (mountedRef.current) setScanning(false);
  };

  /* ── Beep sound on successful scan ── */
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch (_) { /* audio not supported – silent fallback */ }
  };

  const handleScanResult = async (qrText) => {
    if (!mountedRef.current) return;
    setScanProcessing(true);
    setScanError('');
    try {
      const parsed = JSON.parse(qrText);
      if (!parsed.id) throw new Error('Invalid QR code');

      const result = await timeLogService.qrScan({ user_id: parsed.id });
      if (!mountedRef.current) return;
      playBeep();
      setScanResult(result);
      refreshTimeLogs();
    } catch (err) {
      if (!mountedRef.current) return;
      if (err.response?.data?.message) {
        setScanError(err.response.data.message);
      } else if (err instanceof SyntaxError) {
        setScanError('Invalid QR code format. Please scan a valid attendance QR.');
      } else {
        setScanError(err.message || 'Failed to process QR scan');
      }
    } finally {
      if (mountedRef.current) setScanProcessing(false);
    }
  };

  /* cleanup scanner on unmount */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Fire-and-forget cleanup
      const instance = html5QrRef.current;
      html5QrRef.current = null;
      if (instance) {
        try {
          const state = typeof instance.getState === 'function' ? instance.getState() : 0;
          if (state === 2 || state === 3) instance.stop().catch(() => {});
          instance.clear();
        } catch (_) {}
      }
    };
  }, []);

  /* ── Download QR as HD image with margins ── */
  const downloadQR = (user) => {
    const srcCanvas = document.getElementById(`qr-hd-${user.id}`);
    if (!srcCanvas) return;

    const margin = 80;
    const qrSize = srcCanvas.width;           // 1024
    const labelHeight = 100;
    const totalW = qrSize + margin * 2;
    const totalH = qrSize + margin * 2 + labelHeight;

    const canvas = document.createElement('canvas');
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    // Draw QR
    ctx.drawImage(srcCanvas, margin, margin, qrSize, qrSize);

    // Draw user label below QR
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(user.name, totalW / 2, margin + qrSize + 50);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(`${user.role?.name || 'Staff'} · ID: ${user.id}`, totalW / 2, margin + qrSize + 85);

    const link = document.createElement('a');
    link.download = `QR_${user.name.replace(/\s+/g, '_')}_HD.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const formatTime = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  /* stats */
  const activeShifts = timeLogs.filter((l) => l.status === 'active').length;
  const todayLogs = timeLogs.filter((l) => new Date(l.clock_in).toDateString() === new Date().toDateString());

  return (
    <div className="p-6 lg:p-8 min-h-screen" style={{ fontFamily: "'Inria Sans', sans-serif" }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: t.textPrimary }}>Attendance</h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>
            Generate QR codes for users and scan to automatically clock-in / clock-out.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: t.textFaint }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <button onClick={fetchData}
            className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            style={{ color: gold, border: `1px solid rgba(${goldRgb},0.2)` }} title="Refresh">
            <FiRefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: panelBg, border: panelBorder }}>
          <div className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}><FiActivity size={20} /></div>
          <div>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Active Shifts</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: t.textPrimary }}>{activeShifts}</p>
          </div>
        </div>
        <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: panelBg, border: panelBorder }}>
          <div className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}><FiClock size={20} /></div>
          <div>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Today's Scans</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: t.textPrimary }}>{todayLogs.length}</p>
          </div>
        </div>
        <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: panelBg, border: panelBorder }}>
          <div className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: `${gold}18`, color: gold }}><FiUsers size={20} /></div>
          <div>
            <p className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Total Users</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: t.textPrimary }}>{users.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'qr-cards', label: 'QR Codes', icon: <FiUsers size={14} /> },
          { key: 'scanner', label: 'Scan QR', icon: <FiCamera size={14} /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); if (tab.key !== 'scanner') stopScanner(); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: activeTab === tab.key ? gold : t.tableBg,
              color: activeTab === tab.key ? '#000' : t.textSecondary,
              border: activeTab === tab.key ? 'none' : `1px solid ${t.modalBorder}`,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: t.textFaint }}>Loading…</div>
      ) : (
        <>
          {/* ═══════ QR CODES TAB ═══════ */}
          {activeTab === 'qr-cards' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Search */}
              <div className="relative mb-6 max-w-sm">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users…"
                  className="pl-9 pr-4 py-2 rounded-lg text-xs w-full"
                  style={{
                    background: t.tableBg,
                    border: `1px solid ${t.inputBorder}`,
                    color: t.textPrimary,
                    outline: 'none',
                  }}
                />
              </div>

              {/* User QR Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredUsers.map((user) => {
                  const active = getActiveShift(user.id);
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl overflow-hidden"
                      style={{ background: panelBg, border: panelBorder }}
                    >
                      {/* User info */}
                      <div className="p-4 flex items-center gap-3" style={{ borderBottom: panelBorder }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: t.textPrimary }}>{user.name}</p>
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                            {user.role?.name || 'No role'}
                          </p>
                        </div>
                        {active ? (
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded-md font-bold"
                            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>Active</span>
                        ) : (
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded-md font-bold"
                            style={{ background: t.divider, color: t.textFaint }}>Offline</span>
                        )}
                      </div>

                      {/* QR Code */}
                      <div className="p-4 flex flex-col items-center">
                        <div className="bg-white rounded-xl p-3 mb-3 cursor-pointer" onClick={() => setPreviewUser(user)}>
                          <QRCodeCanvas
                            id={`qr-canvas-${user.id}`}
                            value={generateQRData(user)}
                            size={140}
                            level="H"
                            bgColor="#ffffff"
                            fgColor="#000000"
                            imageSettings={{
                              src: logo,
                              x: undefined,
                              y: undefined,
                              height: 30,
                              width: 30,
                              excavate: true,
                            }}
                          />
                        </div>
                        {/* Hidden HD canvas for download */}
                        <div style={{ position: 'absolute', left: -9999, top: -9999, pointerEvents: 'none' }}>
                          <QRCodeCanvas
                            id={`qr-hd-${user.id}`}
                            value={generateQRData(user)}
                            size={1024}
                            level="H"
                            bgColor="#ffffff"
                            fgColor="#000000"
                            includeMargin={false}
                            imageSettings={{
                              src: logo,
                              x: undefined,
                              y: undefined,
                              height: 180,
                              width: 180,
                              excavate: true,
                            }}
                          />
                        </div>
                        <p className="text-[10px] mb-3 text-center" style={{ color: t.textFaint }}>
                          ID: {user.id} · {user.role?.name}
                        </p>
                        <button
                          onClick={() => downloadQR(user)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                          style={{ color: gold, border: `1px solid rgba(${goldRgb},0.2)` }}
                        >
                          <FiDownload size={12} /> Download QR
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="col-span-full text-center py-10 text-sm" style={{ color: t.textFaint }}>No users found.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════ SCANNER TAB ═══════ */}
          {activeTab === 'scanner' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="max-w-xl mx-auto">

              <div className="rounded-xl overflow-hidden" style={{ background: panelBg, border: panelBorder }}>
                <div className="p-5 text-center" style={{ borderBottom: panelBorder }}>
                  <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>QR Attendance Scanner</h3>
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>
                    Point camera at a user's QR code to automatically clock-in or clock-out.
                  </p>
                </div>

                <div className="p-5">
                  {/* Camera View */}
                  {scanning && (
                    <div className="mb-4">
                      <div id="qr-reader"
                        className="rounded-xl overflow-hidden mx-auto"
                        style={{ maxWidth: 450, minHeight: 300 }} />
                      <button onClick={stopScanner}
                        className="mt-3 mx-auto flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition hover:bg-red-500/20"
                        style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                        <FiX size={14} /> Stop Scanner
                      </button>
                    </div>
                  )}

                  {!scanning && !scanResult && (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{ background: `${gold}15` }}>
                        <FiCamera size={36} style={{ color: gold }} />
                      </div>
                      <p className="text-sm mb-5" style={{ color: t.textSecondary }}>
                        Click the button below to start scanning QR codes
                      </p>
                      <button onClick={startScanner}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                        style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
                        <FiCamera size={16} /> Start Scanner
                      </button>
                    </div>
                  )}

                  {/* Processing */}
                  {scanProcessing && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse"
                        style={{ background: `rgba(${goldRgb},0.15)` }}>
                        <FiClock size={28} style={{ color: gold }} />
                      </div>
                      <p className="text-sm" style={{ color: t.textSecondary }}>Processing scan…</p>
                    </div>
                  )}

                  {/* Scan Error */}
                  {scanError && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'rgba(248,113,113,0.12)' }}>
                        <FiX size={28} style={{ color: '#f87171' }} />
                      </div>
                      <p className="text-sm font-semibold mb-2" style={{ color: '#f87171' }}>Scan Failed</p>
                      <p className="text-xs mb-5" style={{ color: t.textSecondary }}>{scanError}</p>
                      <button onClick={() => { setScanError(''); startScanner(); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
                        <FiCamera size={14} /> Try Again
                      </button>
                    </div>
                  )}

                  {/* Scan Success */}
                  {scanResult && !scanProcessing && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{ background: scanResult.action === 'clock_in' ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)' }}>
                        {scanResult.action === 'clock_in'
                          ? <FiLogIn size={28} style={{ color: '#4ade80' }} />
                          : <FiLogOut size={28} style={{ color: '#fb923c' }} />
                        }
                      </div>

                      <p className="text-lg font-bold mb-1" style={{ color: t.textPrimary }}>
                        {scanResult.action === 'clock_in' ? 'Clocked In!' : 'Clocked Out!'}
                      </p>

                      <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 rounded-xl"
                        style={{ background: t.cardBg, border: panelBorder }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
                          {scanResult.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold" style={{ color: t.textPrimary }}>{scanResult.user?.name}</p>
                          <p className="text-[10px] uppercase" style={{ color: t.textMuted }}>
                            {scanResult.user?.role?.name || '—'}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm mb-1" style={{ color: t.textSecondary }}>
                        {scanResult.message}
                      </p>

                      {scanResult.time_log && (
                        <div className="text-xs mt-2 space-y-0.5" style={{ color: t.textMuted }}>
                          <p>Clock In: {formatTime(scanResult.time_log.clock_in)}</p>
                          {scanResult.time_log.clock_out && (
                            <p>Clock Out: {formatTime(scanResult.time_log.clock_out)}</p>
                          )}
                          {scanResult.time_log.total_hours > 0 && (
                            <p className="font-semibold" style={{ color: gold }}>
                              Total: {Math.floor(scanResult.time_log.total_hours)}h {Math.round((scanResult.time_log.total_hours % 1) * 60)}m
                            </p>
                          )}
                        </div>
                      )}

                      <button onClick={() => { setScanResult(null); startScanner(); }}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
                        <FiCamera size={14} /> Scan Next
                      </button>
                    </div>
                  )}
                  {/* ── Time In / Time Out Buttons ── */}
                  <div className="mt-4 pt-4" style={{ borderTop: panelBorder }}>
                    <div className="flex gap-3">
                      <button
                        onClick={startScanner}
                        disabled={scanning || scanProcessing}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                        style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                      >
                        <FiLogIn size={16} /> Time In
                      </button>
                      <button
                        onClick={startScanner}
                        disabled={scanning || scanProcessing}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                        style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}
                      >
                        <FiLogOut size={16} /> Time Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}
        </>
      )}

      {/* ═══════ QR PREVIEW MODAL ═══════ */}
      <AnimatePresence>
        {previewUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: t.modalOverlay, backdropFilter: 'blur(8px)' }}
            onClick={() => setPreviewUser(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ background: t.modalBg, border: `1px solid ${t.inputBorder}` }}>

              <div className="p-5 flex items-center justify-between" style={{ borderBottom: panelBorder }}>
                <h3 className="text-lg font-bold" style={{ color: t.textPrimary }}>QR Code</h3>
                <button onClick={() => setPreviewUser(null)}
                  className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} style={{ color: t.textSecondary }}>
                  <FiX size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col items-center">
                <div className="flex items-center gap-3 mb-5 w-full">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: `rgba(${goldRgb},0.15)`, color: gold }}>
                    {previewUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: t.textPrimary }}>{previewUser.name}</p>
                    <p className="text-xs" style={{ color: t.textMuted }}>
                      {previewUser.role?.name || 'No role'} · ID: {previewUser.id}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 mb-5">
                  <QRCodeCanvas
                    id={`qr-canvas-${previewUser.id}`}
                    value={generateQRData(previewUser)}
                    size={260}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    imageSettings={{
                      src: logo,
                      x: undefined,
                      y: undefined,
                      height: 55,
                      width: 55,
                      excavate: true,
                    }}
                  />
                </div>
                {/* Hidden HD canvas for preview download */}
                <div style={{ position: 'absolute', left: -9999, top: -9999, pointerEvents: 'none' }}>
                  <QRCodeCanvas
                    id={`qr-hd-${previewUser.id}`}
                    value={generateQRData(previewUser)}
                    size={1024}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    includeMargin={false}
                    imageSettings={{
                      src: logo,
                      x: undefined,
                      y: undefined,
                      height: 180,
                      width: 180,
                      excavate: true,
                    }}
                  />
                </div>

                <p className="text-[10px] text-center mb-4" style={{ color: t.textFaint }}>
                  Scan this QR to clock-in or clock-out
                </p>

                <button
                  onClick={() => downloadQR(previewUser)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: `linear-gradient(135deg, ${gold}, ${goldDark})`, color: '#000' }}>
                  <FiDownload size={14} /> Download PNG
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
