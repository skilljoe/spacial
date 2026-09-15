import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Expand,
  GalleryVerticalEnd,
  Heart,
  Info,
  Menu,
  Minus,
  Move3D,
  Plus,
  ScanLine,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import PropertyScene, { type RoomId } from "@/components/PropertyScene";

type Mode = "chooser" | "tour" | "scan";
type ScanState = "ready" | "capturing" | "complete";

const rooms: { id: RoomId; label: string; index: string; detail: string }[] = [
  { id: "living", label: "Living room", index: "01", detail: "Window light & lounge" },
  { id: "kitchen", label: "Kitchen", index: "02", detail: "Stone island & oak" },
  { id: "terrace", label: "Terrace", index: "03", detail: "Garden-facing outlook" },
  { id: "dining", label: "Dining room", index: "04", detail: "Late afternoon light" },
  { id: "bedroom", label: "Primary bedroom", index: "05", detail: "Quiet garden side" },
  { id: "bath", label: "Primary bath", index: "06", detail: "Travertine & steam" },
];

const scanStages = [
  { threshold: 0, label: "Ready to scan", hint: "Point your phone at the center of the room" },
  { threshold: 16, label: "Finding surfaces", hint: "Slow pan left · keep the room in frame" },
  { threshold: 39, label: "Building depth map", hint: "Keep moving · capture the corners" },
  { threshold: 64, label: "Collecting light", hint: "Almost there · one more slow pass" },
  { threshold: 88, label: "Finishing the space", hint: "Stitching your room into 3D" },
  { threshold: 100, label: "Space captured", hint: "Your 3D space is ready to explore" },
];

export default function Home() {
  const [mode, setMode] = useState<Mode>("chooser");
  const [room, setRoom] = useState<RoomId>("living");
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [scanState, setScanState] = useState<ScanState>("ready");
  const [scanProgress, setScanProgress] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [notice, setNotice] = useState("");

  const activeRoom = rooms.find((item) => item.id === room) ?? rooms[0];
  const roomIndex = rooms.findIndex((item) => item.id === room);
  const activeScanStage = [...scanStages].reverse().find((stage) => scanProgress >= stage.threshold) ?? scanStages[0];

  useEffect(() => {
    if (scanState !== "capturing") return;
    const timer = window.setInterval(() => {
      setScanProgress((current) => {
        const next = Math.min(100, current + 2);
        if (next >= 100) {
          window.clearInterval(timer);
          setScanState("complete");
        }
        return next;
      });
    }, 105);
    return () => window.clearInterval(timer);
  }, [scanState]);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2100);
  };

  const changeRoom = (direction: 1 | -1) => {
    const next = (roomIndex + direction + rooms.length) % rooms.length;
    setRoom(rooms[next].id);
    setStarted(true);
  };

  const shareTour = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Olive House — Spatial Key", text: "Take a 3D walk-through of Olive House.", url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        notify("Tour link copied");
      }
    } catch {
      // Closing the native Share sheet is an expected user cancellation.
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => notify("Fullscreen is unavailable in this browser"));
    } else {
      document.exitFullscreen();
    }
  };

  const openTour = (nextRoom: RoomId = "living") => {
    setRoom(nextRoom);
    setStarted(false);
    setMode("tour");
  };

  return (
    <main className="tour-shell">
      <div className="ambient-orb ambient-orb-left" />
      <div className="ambient-orb ambient-orb-right" />
      <section className={`tour-stage ${mode === "chooser" ? "launcher-mode" : ""} ${mode === "scan" ? "scan-mode" : ""}`} aria-label="Spatial Key mobile app">
        <PropertyScene room={room} onInteract={() => setStarted(true)} />
        <div className="scene-vignette" />

        <header className="topbar">
          <button className="icon-button glass-control" aria-label={mode === "chooser" ? "Open app menu" : "Go back"} onClick={() => mode === "chooser" ? setMenuOpen(true) : setMode("chooser")}>
            {mode === "chooser" ? <Menu size={20} strokeWidth={1.8} /> : <ArrowLeft size={20} strokeWidth={1.8} />}
          </button>
          <div className="brand-lockup" aria-label="Spatial Key">
            <span className="brand-symbol">S</span>
            <span>SPATIAL KEY</span>
          </div>
          <div className="top-actions">
            <button className="sound-control" aria-label={soundOn ? "Mute ambient audio" : "Turn on ambient audio"} onClick={() => setSoundOn(!soundOn)}>
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="sound-label">AMBIENT</span>
            </button>
            {mode === "tour" && <button className="icon-button glass-control desktop-only" aria-label="Share this tour" onClick={shareTour}><Share2 size={18} strokeWidth={1.8} /></button>}
            {mode !== "chooser" && <button className="icon-button glass-control mobile-only" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={20} strokeWidth={1.8} /></button>}
          </div>
        </header>

        {mode === "chooser" && (
          <section className="app-launcher" aria-label="Start Spatial Key">
            <div className="launcher-heading">
              <span className="welcome-index">SPATIAL KEY / MOBILE 01</span>
              <span className="launcher-pill">BETA</span>
            </div>
            <h1>Space, in<br /><em>your hands.</em></h1>
            <p>Scan a place with your phone or step into a saved tour.</p>
            <div className="entry-actions">
              <button className="entry-card entry-card-primary" onClick={() => { setScanProgress(0); setScanState("ready"); setMode("scan"); }}>
                <span className="entry-icon"><ScanLine size={21} /></span>
                <span><strong>Scan a space</strong><small>Capture a room in 20 min</small></span>
                <ArrowUpRight size={18} />
              </button>
              <button className="entry-card entry-card-secondary" onClick={() => openTour()}>
                <span className="entry-icon"><Camera size={20} /></span>
                <span><strong>Explore a tour</strong><small>Walk through Olive House</small></span>
                <ArrowUpRight size={18} />
              </button>
            </div>
            <div className="launcher-footer">
              <span>NO APP · NO VR · JUST YOUR PHONE</span>
              <button className="ghost-link" onClick={() => setInfoOpen(true)}>HOW IT WORKS <Info size={14} /></button>
            </div>
          </section>
        )}

        {mode === "scan" && (
          <section className="scan-overlay" aria-label="Scan a space">
            <div className="scan-topline"><span>01 / NEW CAPTURE</span><span className="scan-live-chip"><i /> {scanState === "capturing" ? "CAPTURING" : scanState === "complete" ? "READY" : "ROOM SCAN"}</span></div>
            <div className="scan-viewport">
              <div className="scan-grid" />
              <div className="scan-corners" />
              {scanState === "capturing" && <div className="scan-sweep" />}
              <div className="scan-target">
                <div className={scanState === "capturing" ? "scan-progress-ring active" : "scan-progress-ring"} style={{ "--progress": `${scanProgress * 3.6}deg` } as CSSProperties}>
                  <div className="scan-progress-track" />
                  <div className="scan-progress-value">{scanState === "complete" ? <Check size={25} /> : <strong>{scanProgress}%</strong>}</div>
                </div>
                <strong>{scanState === "ready" ? activeScanStage.label : scanState === "capturing" ? activeScanStage.label : "Space captured"}</strong>
                <span>{scanState === "complete" ? activeScanStage.hint : activeScanStage.hint}</span>
              </div>
              <div className="scan-readout"><span><small>ROOM</small>LIVING ROOM</span><span><small>LIGHT</small>GOOD</span><span><small>DEPTH</small>{scanState === "complete" ? "100%" : scanState === "capturing" ? `${scanProgress}%` : "LIVE"}</span></div>
            </div>
            <div className="scan-footer">
              {scanState === "complete" ? (
                <div className="scan-complete-actions">
                  <div className="scan-summary"><Check size={14} /> 6 ROOMS READY TO EXPLORE</div>
                  <button className="scan-button" onClick={() => openTour("living")}><span>VIEW YOUR TOUR</span><ArrowUpRight size={18} /></button>
                  <button className="scan-secondary-action" onClick={() => { setScanProgress(0); setScanState("ready"); }}>SCAN ANOTHER ROOM</button>
                </div>
              ) : (
                <>
                  <button className={scanState === "capturing" ? "scan-button scanning" : "scan-button"} disabled={scanState === "capturing"} onClick={() => { setScanProgress(2); setScanState("capturing"); }}>
                    {scanState === "capturing" ? <><span className="scanning-dot" /> CAPTURING {scanProgress}%</> : <><span>START SCAN</span><ScanLine size={18} /></>}
                  </button>
                  <p>{scanState === "capturing" ? "Move slowly around the room · keep your phone level" : "Your camera stays on-device during this simulation"}</p>
                </>
              )}
            </div>
          </section>
        )}

        {mode === "tour" && !started && (
          <div className="welcome-card">
            <div className="welcome-index">04 / OLIVE HOUSE</div>
            <h1>Walk through<br />before you arrive.</h1>
            <p>A living, phone-first 3D view — captured with light, space, and a little bit of magic.</p>
            <button className="explore-button" onClick={() => setStarted(true)}><span>ENTER THE HOME</span><ArrowUpRight size={18} /></button>
          </div>
        )}

        {mode === "tour" && (
          <>
            <div className="scene-caption" aria-live="polite"><span className="caption-marker">{activeRoom.index}</span><div><strong>{activeRoom.label}</strong><span>{activeRoom.detail}</span></div></div>
            <div className="scene-controls"><div className="zoom-control" aria-label="Camera zoom controls"><button aria-label="Zoom in" onClick={() => notify("Pinch the scene to move closer")}><Plus size={17} /></button><span /><button aria-label="Zoom out" onClick={() => notify("Pinch the scene to pull back")}><Minus size={17} /></button></div><button className="icon-button glass-control" aria-label="Enter fullscreen" onClick={toggleFullscreen}><Expand size={18} strokeWidth={1.8} /></button></div>
            <div className="gesture-hint"><Move3D size={15} /><span>DRAG TO LOOK AROUND</span></div>
            <section className="bottom-panel">
              <div className="listing-overline">FOR SALE · WESTLAKE, TX</div>
              <div className="listing-grid"><div className="listing-copy"><h2>Olive House</h2><p><Compass size={15} /> 1720 Cedar Creek Road</p></div><div className="price-block"><span>ASKING PRICE</span><strong>$2.48M</strong></div></div>
              <div className="property-facts" aria-label="Property details"><span>4 Beds</span><i /><span>3.5 Baths</span><i /><span>3,640 sq ft</span></div>
              <div className="room-strip" aria-label="Choose a room"><button className="room-nav" aria-label="Previous room" onClick={() => changeRoom(-1)}><ChevronLeft size={19} /></button><div className="room-tabs">{rooms.map((item) => <button key={item.id} className={room === item.id ? "room-tab active" : "room-tab"} onClick={() => { setRoom(item.id); setStarted(true); }}><span>{item.index}</span>{item.label}</button>)}</div><button className="room-nav" aria-label="Next room" onClick={() => changeRoom(1)}><ChevronRight size={19} /></button></div>
              <div className="panel-actions"><button className="text-action" onClick={() => setGalleryOpen(true)}><GalleryVerticalEnd size={17} /> VIEW STILL CAPTURE</button><button className={liked ? "heart-action liked" : "heart-action"} aria-label="Save property" onClick={() => { setLiked(!liked); notify(liked ? "Removed from saved homes" : "Saved to your homes"); }}><Heart size={19} fill={liked ? "currentColor" : "none"} /></button></div>
            </section>
          </>
        )}
      </section>

      <aside className={infoOpen ? "info-drawer open" : "info-drawer"} aria-hidden={!infoOpen}>
        <button className="drawer-close" onClick={() => setInfoOpen(false)} aria-label="Close information"><X size={20} /></button>
        <div className="drawer-eyebrow"><Sparkles size={15} /> HOW SPATIAL KEY WORKS</div>
        <h2>Scan once.<br />Be there again.</h2>
        <p>Capture a place with your phone and turn it into a browser-ready 3D space. Or open a saved tour and walk through from wherever you are.</p>
        <div className="drawer-stat"><span>CAPTURE</span><strong>iPhone + 20 min</strong></div><div className="drawer-stat"><span>FORMAT</span><strong>WebGL / PlayCanvas</strong></div>
        <button className="drawer-link" onClick={() => { setInfoOpen(false); openTour("living"); }}>TRY A TOUR <ArrowUpRight size={17} /></button>
      </aside>

      {galleryOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Olive House still capture"><div className="gallery-modal"><button className="modal-close" onClick={() => setGalleryOpen(false)} aria-label="Close capture"><X size={20} /></button><img src="/manus-storage/linen-room_1595b9ca.jpg" alt="Warmly lit interior reference for Olive House" /><div className="gallery-copy"><span>REFERENCE STILL / 01</span><h2>Light moves first.</h2><p>A material and atmosphere cue for the virtual walkthrough.</p></div></div></div>}
      {menuOpen && <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Tour menu"><button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button><span className="menu-eyebrow">SPATIAL KEY / MOBILE 01</span><button onClick={() => { setMenuOpen(false); setMode("chooser"); }}><ScanLine size={19} /> START A SCAN</button><button onClick={() => { setMenuOpen(false); openTour(); }}><Camera size={19} /> EXPLORE A TOUR</button><button onClick={() => { setMenuOpen(false); shareTour(); }}><Share2 size={19} /> SHARE TOUR</button><button onClick={() => { setMenuOpen(false); setInfoOpen(true); }}><Info size={19} /> HOW IT WORKS</button></div>}
      {mode === "tour" && <button className="info-fab" onClick={() => setInfoOpen(true)} aria-label="About this interactive tour"><Info size={19} /></button>}
      {notice && <div className="toast-message" role="status">{notice}</div>}
    </main>
  );
}
