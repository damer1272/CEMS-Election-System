import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  Wifi,
  Globe,
  AlertTriangle,
  Sparkles,
  Smartphone,
  Layers,
  Save,
  HelpCircle
} from "lucide-react";
import {
  getVotingUrl,
  getDisplayUrl,
  getSettings,
  setPublicUrl,
  fetchNetworkInfo,
  isLocalhostUrl
} from "../data/store";

export default function QRCodesView() {
  const [votingUrl, setVotingUrl] = useState(() => getVotingUrl());
  const [displayUrl, setDisplayUrl] = useState(() => getDisplayUrl());
  const [customUrl, setCustomUrl] = useState(() => getSettings().publicUrl || "");
  const [detectedLocalUrl, setDetectedLocalUrl] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const isLocal = /localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+/i.test(origin);
      if (!isLocal && origin.startsWith("http")) {
        setCustomUrl(origin);
        setVotingUrl(`${origin}/vote`);
        setDisplayUrl(`${origin}/`);
        return;
      }
    }
    const loadNet = async () => {
      const net = await fetchNetworkInfo();
      if (net && net.localUrl) {
        setDetectedLocalUrl(net.localUrl);
        const current = getSettings().publicUrl;
        if (!current || isLocalhostUrl(current)) {
          setCustomUrl(net.localUrl);
        }
      }
    };
    loadNet();
    setVotingUrl(getVotingUrl());
    setDisplayUrl(getDisplayUrl());
  }, []);

  const handleApplyUrl = (newUrl: string) => {
    setPublicUrl(newUrl);
    setCustomUrl(newUrl);
    setVotingUrl(getVotingUrl());
    setDisplayUrl(getDisplayUrl());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isLocalhost = isLocalhostUrl(votingUrl);
  const isLanIp = /10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+/i.test(votingUrl);
  const isPublicHttps = votingUrl.startsWith("https://") && !isLocalhost && !isLanIp;

  const qrItems = [
    {
      key: "voting",
      label: "Official Student Voting Portal QR",
      description: "Direct students and electors to scan this QR code to access the mobile-friendly ballot.",
      url: votingUrl,
      color: "#233C4B",
      bg: "#F1F5F7",
      accent: "#FF7D2D",
      badge: "Voter Ballot Access",
    },
    {
      key: "display",
      label: "Live Results & Tally Board Screen",
      description: "Display on auditorium projectors, campus monitors, or live television displays during tallying.",
      url: displayUrl,
      color: "#233C4B",
      bg: "#FAC84615",
      accent: "#FAC846",
      badge: "Public Big-Screen Monitor",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#233C4B] tracking-tight">
              QR Codes & Mobile Device Access
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#FF7D2D]/10 text-[#FF7D2D] text-xs font-bold px-3 py-1 rounded-full border border-[#FF7D2D]/20">
              <Smartphone className="w-3.5 h-3.5" /> Any Device
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Generate, customize, and export high-resolution QR codes for campus distribution and mobile voting.
          </p>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-2xs cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#FF7D2D]" />
          <span>{showGuide ? "Hide Access Guide" : "How to Vote from Any Device / Network"}</span>
        </button>
      </div>

      {/* Network Status Diagnostic Banner */}
      <div
        className={`rounded-2xl border p-5 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isPublicHttps
            ? "bg-gradient-to-r from-[#A0C382]/20 via-[#5F9B8C]/10 to-white border-[#5F9B8C]/40"
            : isLanIp
            ? "bg-gradient-to-r from-[#FAC846]/20 via-[#FAC846]/5 to-white border-[#FAC846]/60"
            : "bg-gradient-to-r from-red-50 to-white border-red-200"
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
              isPublicHttps
                ? "bg-[#5F9B8C] text-white"
                : isLanIp
                ? "bg-[#FAC846] text-[#233C4B]"
                : "bg-red-500 text-white"
            }`}
          >
            {isPublicHttps ? (
              <Globe className="w-6 h-6 animate-pulse" />
            ) : isLanIp ? (
              <Wifi className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Current Access Mode:
              </span>
              <span
                className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                  isPublicHttps
                    ? "bg-[#5F9B8C] text-white"
                    : isLanIp
                    ? "bg-[#233C4B] text-[#FAC846]"
                    : "bg-red-500 text-white"
                }`}
              >
                {isPublicHttps
                  ? "🌐 PUBLIC INTERNET MODE (ANY NETWORK / 4G / 5G)"
                  : isLanIp
                  ? "📶 LOCAL WI-FI MODE (SAME CAMPUS WI-FI ONLY)"
                  : "⚠️ LOCALHOST ONLY (MOBILE DEVICES CANNOT CONNECT)"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {isPublicHttps
                ? "Students can scan this QR code from ANY mobile device anywhere in the world (Mobile Data 4G/5G or home internet)."
                : isLanIp
                ? "Phones connected to the SAME Wi-Fi network as this computer can scan and vote. For voting over mobile cellular data (4G/5G), configure a Public Tunnel below."
                : "Mobile phones cannot connect to 'localhost'. Please select your Wi-Fi IP or a Public Tunnel URL below so phones can open the ballot."}
            </p>
          </div>
        </div>

        {detectedLocalUrl && detectedLocalUrl !== customUrl && (
          <button
            onClick={() => handleApplyUrl(detectedLocalUrl)}
            className="flex items-center gap-1.5 self-start md:self-center bg-[#233C4B] hover:bg-[#1A2C37] text-[#FAC846] font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs flex-shrink-0 cursor-pointer"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Use Wi-Fi IP ({detectedLocalUrl.replace("http://", "")})</span>
          </button>
        )}
      </div>

      {/* Access Guide Card (Toggleable) */}
      {showGuide && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-[#FF7D2D]" />
            <h2 className="font-bold text-[#233C4B] text-base">
              How to Allow Any Device to Vote (Even Without Same Wi-Fi)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#233C4B]">
                <Wifi className="w-4 h-4 text-[#5F9B8C]" /> Option 1: School / Campus Wi-Fi (Instant)
              </div>
              <p className="leading-relaxed">
                Connect the student&apos;s phone to the <strong>same Wi-Fi router or campus hotspot</strong> as this computer.
              </p>
              <p className="text-slate-500">
                Click <strong>&quot;Use Wi-Fi IP&quot;</strong> above. Both this laptop and students&apos; phones will connect via <code>{detectedLocalUrl || "10.0.2.183:8443"}</code> with zero setup.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#233C4B]">
                <Globe className="w-4 h-4 text-[#FF7D2D]" /> Option 2: Any Network / 4G / 5G (Free Public Tunnel)
              </div>
              <p className="leading-relaxed">
                To allow students to vote using their own <strong>mobile cellular data (Smart/Globe/4G/5G)</strong> or from home:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-500">
                <li>Run a free public tunnel on your laptop: <code>npx ngrok http 8443</code> or Cloudflare Tunnel</li>
                <li>Copy the generated <code>https://...</code> public URL</li>
                <li>Paste it in the <strong>&quot;Public URL for QR Codes&quot;</strong> box below and click <strong>&quot;Apply &amp; Regenerate QR&quot;</strong></li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* URL Customizer & QR Generator Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Active Endpoint URL (Embedded in QR Codes)
        </label>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            placeholder="e.g. http://10.0.2.183:8443 or https://your-public-tunnel.ngrok-free.app"
            className="flex-1 w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent transition"
          />
          <button
            onClick={() => handleApplyUrl(customUrl)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white font-bold text-sm px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer flex-shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{savedSuccess ? "Applied & Regenerated!" : "Apply & Regenerate QR"}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Changing this URL immediately updates both QR codes below for printing, projection, or direct sharing.
        </p>
      </div>

      {/* QR Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {qrItems.map(({ key, label, description, url, color, bg, badge }, index) => {
          const containerId = `qr-container-${index}`;
          const isCopied = copiedKey === key;

          return (
            <div
              key={key}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center text-center shadow-xs transition hover:shadow-md"
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#233C4B] bg-[#233C4B]/5 border border-[#233C4B]/10 px-3 py-1 rounded-full mb-4">
                {badge}
              </span>

              {/* QR Code Container */}
              <div
                id={containerId}
                className="rounded-2xl p-6 mb-4 ring-1 ring-slate-200/80 shadow-inner transition-transform hover:scale-105 duration-200 bg-white"
                style={{ background: bg }}
              >
                <QRCodeSVG
                  value={url}
                  size={210}
                  bgColor="transparent"
                  fgColor={color}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <h2 className="font-bold text-[#233C4B] text-base mb-1">{label}</h2>
              <p className="text-slate-500 text-xs mb-3 max-w-sm leading-relaxed">{description}</p>

              {/* URL Display Pill */}
              <div className="flex items-center justify-center gap-2 w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-4">
                <span className="text-[#233C4B] text-xs font-mono truncate flex-1 text-left">
                  {url}
                </span>
                <button
                  onClick={() => copyToClipboard(url, key)}
                  className="p-1.5 text-slate-500 hover:text-[#233C4B] hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200 cursor-pointer flex-shrink-0"
                  title="Copy link to clipboard"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-[#5F9B8C]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 border border-slate-300 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-50 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Test Open
                </a>
                <button
                  onClick={() => {
                    const container = document.getElementById(containerId);
                    const svg = container?.querySelector("svg");
                    if (!svg) return;
                    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${label.replace(/[^a-zA-Z0-9]/g, "_")}.svg`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download SVG
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribution Tips Banner */}
      <div className="bg-[#233C4B]/[0.03] border border-slate-200 rounded-2xl p-5">
        <h3 className="font-bold text-[#233C4B] mb-2 text-sm flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#FF7D2D]" /> Official Campus Distribution Guidelines
        </h3>
        <ul className="text-slate-600 text-xs space-y-1.5 list-disc list-inside leading-relaxed">
          <li>
            <strong>Voting Portal QR:</strong> Print on official polling room posters or post to classroom Viber/Messenger/Telegram group chats.
          </li>
          <li>
            <strong>Live Results QR:</strong> Project onto gymnasium screens or auditorium monitors during election tallying.
          </li>
          <li>
            <strong>Student Verification:</strong> Voters scan the code, enter their registered Student ID, verify their name, and submit their ballot securely.
          </li>
        </ul>
      </div>
    </div>
  );
}
