import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
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
import PropertyScene, { type RoomId, type SplatStatus } from "@/components/PropertyScene";

type Mode = "chooser" | "browse" | "tour" | "scan";
type ScanState = "ready" | "capturing" | "complete";
type CameraStatus = "idle" | "requesting" | "active" | "denied" | "unsupported";

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

const tours = [
  { id: "fallingwater", title: "Fallingwater", subtitle: "Frank Lloyd Wright · Mill Run, Pennsylvania", eyebrow: "ARCHITECTURE / 01", image: "/manus-storage/fallingwater-demo_db8fdb91.jpg", description: "Walk through Wright’s house built over Bear Run — a landmark of organic architecture, captured for the web.", facts: ["1935 design", "9,300 sq ft", "Bear Run reserve"] },
  { id: "olive-house", title: "Olive House", subtitle: "Westlake, Texas · Spatial Key original", eyebrow: "RESIDENTIAL / 04", image: "/manus-storage/linen-room_1595b9ca.jpg", description: "A warm, light-filled family home designed around the rhythm of the day.", facts: ["4 beds", "3.5 baths", "3,640 sq ft"] },
] as const;

export default function Home() {
  const [mode, setMode] = useState<Mode>("chooser");
  const [selectedTour, setSelectedTour] = useState<(typeof tours)[number]>(tours[0]);
  const [splatStatus, setSplatStatus] = useState<SplatStatus>("loading");
  const [room, setRoom] = useState<RoomId>("living");
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [scanState, setScanState] = useState<ScanState>("ready");
  const [scanProgress, setScanProgress] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [deviceTilt, setDeviceTilt] = useState(0);
  const [cameraMessage, setCameraMessage] = useState("");
  const cameraRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionCleanupRef = useRef<(() => void) | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [notice, setNotice] = useState("");

  const activeRoom = rooms.find((item) => item.id === room) ?? rooms[0];
  const roomIndex = rooms.findIndex((item) => item.id === room);
  const activeScanStage = [...scanStages].reverse().find((stage) => scanProgress >= stage.threshold) ?? scanStages[0];

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (cameraRef.current) cameraRef.current.srcObject = null;
  };

  const requestMotionAccess = async () => {
    if (typeof DeviceOrientationEvent === "undefined") return false;
    const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof orientation.requestPermission === "function") {
      try {
        const permission = await orientation.requestPermission();
        if (permission !== "granted") return false;
      } catch {
        return false;
      }
    }
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const tilt = Math.max(-28, Math.min(28, event.gamma ?? 0));
      setDeviceTilt(tilt);
    };
    motionCleanupRef.current?.();
    window.addEventListener("deviceorientation", handleOrientation, true);
    motionCleanupRef.current = () => window.removeEventListener("deviceorientation", handleOrientation, true);
    setMotionEnabled(true);
  };

  const requestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported");
      setCameraMessage("Live camera is unavailable here; simulation mode is ready.");
      return;
    }
    setCameraStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        await cameraRef.current.play();
      }
      setCameraStatus("active");
      setCameraMessage("Camera live · motion guidance enabled when available");
    } catch {
      setCameraStatus("denied");
      setCameraMessage("Camera access was blocked; simulation mode is ready.");
    }
  };

  const enterScanMode = () => {
    setScanProgress(0);
    setScanState("ready");
    setMode("scan");
    void requestMotionAccess();
    void requestCamera();
  };

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

  useEffect(() => {
    if (mode === "scan") return;
    stopCamera();
    motionCleanupRef.current?.();
    motionCleanupRef.current = null;
    setCameraStatus("idle");
    setMotionEnabled(false);
  }, [mode]);

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

  const openTourBrowser = () => setMode("browse");

  return (
    <main className="tour-shell">
      <div className="ambient-orb ambient-orb-left" />
      <div className="ambient-orb ambient-orb-right" />
      <section className={`tour-stage ${mode === "chooser" ? "launcher-mode" : ""} ${mode === "browse" ? "browse-mode" : ""} ${mode === "scan" ? "scan-mode" : ""}`} aria-label="Spatial Key mobile app">
        <PropertyScene room={room} onInteract={() => setStarted(true)} onSplatStatus={setSplatStatus} />
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
              <button className="entry-card entry-card-primary" onClick={enterScanMode}>
                <span className="entry-icon"><ScanLine size={21} /></span>
                <span><strong>Scan a space</strong><small>Capture a room in 20 min</small></span>
                <ArrowUpRight size={18} />
              </button>
              <button className="entry-card entry-card-secondary" onClick={openTourBrowser}>
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
              <video ref={cameraRef} className="scan-camera" style={{ "--device-tilt": `${deviceTilt}deg` } as CSSProperties} autoPlay muted playsInline aria-label="Live rear camera preview" />
              {cameraStatus === "active" && <div className="camera-active-badge"><i /> CAMERA LIVE</div>}
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
                  <p>{scanState === "capturing" ? "Move slowly around the room · keep your phone level" : cameraStatus === "requesting" ? "Requesting camera access..." : cameraMessage || "Camera access is optional in simulation mode"}</p>
                </>
              )}
            </div>
          </section>
        )}

        {mode === "browse" && (
          <section className="tour-browser" aria-label="Explore featured tours">
            <div className="browser-heading"><div><span className="welcome-index">SPATIAL KEY / OPEN COLLECTION</span><h1>Go somewhere<br /><em>remarkable.</em></h1></div><span className="browser-count">{tours.length.toString().padStart(2, "0")} TOURS</span></div>
            <p className="browser-intro">A small collection of places worth getting lost in — available in your browser, wherever you are.</p>
            <div className="tour-cards">
              {tours.map((tour) => (
                <button key={tour.id} className={`tour-card ${selectedTour.id === tour.id ? "selected" : ""}`} onClick={() => setSelectedTour(tour)}>
                  <img src={tour.image} alt="" /><div className="tour-card-shade" />
                  <div className="tour-card-copy"><span>{tour.eyebrow}</span><strong>{tour.title}</strong><small>{tour.subtitle}</small></div>
                  {selectedTour.id === tour.id && <span className="tour-card-check"><Check size={15} /></span>}
                </button>
              ))}
            </div>
            <div className="selected-tour-detail"><div><span className="welcome-index">{selectedTour.eyebrow}</span><h2>{selectedTour.title}</h2><p>{selectedTour.description}</p><div className="tour-facts">{selectedTour.facts.map((fact) => <span key={fact}>{fact}</span>)}</div></div><button className="scan-button" onClick={() => openTour("living")}><span>ENTER TOUR</span><ArrowUpRight size={18} /></button></div>
            <div className="browser-footnote">FALLINGWATER FACTS SOURCED FROM THE WESTERN PENNSYLVANIA CONSERVANCY <Info size={13} /></div>
          </section>
        )}

        {mode === "tour" && !started && (
          <div className="welcome-card">
            <div className="welcome-index">{selectedTour.eyebrow}</div>
            <h1>Walk through<br />{selectedTour.title}.</h1>
            <p>{selectedTour.description}</p>
            <button className="explore-button" onClick={() => setStarted(true)}><span>ENTER THE HOME</span><ArrowUpRight size={18} /></button>
          </div>
        )}

        {mode === "tour" && (
          <>
            <div className="scene-caption" aria-live="polite"><span className="caption-marker">{activeRoom.index}</span><div><strong>{activeRoom.label}</strong><span>{activeRoom.detail}</span>{room === "living" && <small className={`splat-status ${splatStatus}`}><i /> {splatStatus === "ready" ? "REAL SPLAT" : splatStatus === "loading" ? "LOADING SCAN" : "PREVIEW MODEL"}</small>}</div></div>
            <div className="scene-controls"><div className="zoom-control" aria-label="Camera zoom controls"><button aria-label="Zoom in" onClick={() => notify("Pinch the scene to move closer")}><Plus size={17} /></button><span /><button aria-label="Zoom out" onClick={() => notify("Pinch the scene to pull back")}><Minus size={17} /></button></div><button className="icon-button glass-control" aria-label="Enter fullscreen" onClick={toggleFullscreen}><Expand size={18} strokeWidth={1.8} /></button></div>
            <div className="gesture-hint"><Move3D size={15} /><span>DRAG TO LOOK AROUND</span></div>
            <section className="bottom-panel">
              <div className="listing-overline">{selectedTour.id === "fallingwater" ? "ARCHITECTURE DEMO · MILL RUN, PA" : "FOR SALE · WESTLAKE, TX"}</div>
              <div className="listing-grid"><div className="listing-copy"><h2>{selectedTour.title}</h2><p><Compass size={15} /> {selectedTour.id === "fallingwater" ? "1491 Mill Run Road" : "1720 Cedar Creek Road"}</p></div><div className="price-block"><span>{selectedTour.id === "fallingwater" ? "OPEN DEMO" : "ASKING PRICE"}</span><strong>{selectedTour.id === "fallingwater" ? "1935" : "$2.48M"}</strong></div></div>
              <div className="property-facts" aria-label="Property details">{selectedTour.facts.map((fact, index) => <Fragment key={fact}><span>{fact}</span>{index < selectedTour.facts.length - 1 && <i />}</Fragment>)}</div>
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
        <button className="drawer-link" onClick={() => { setInfoOpen(false); openTourBrowser(); }}>EXPLORE TOURS <ArrowUpRight size={17} /></button>
      </aside>

      {galleryOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Olive House still capture"><div className="gallery-modal"><button className="modal-close" onClick={() => setGalleryOpen(false)} aria-label="Close capture"><X size={20} /></button><img src="/manus-storage/linen-room_1595b9ca.jpg" alt="Warmly lit interior reference for Olive House" /><div className="gallery-copy"><span>REFERENCE STILL / 01</span><h2>Light moves first.</h2><p>A material and atmosphere cue for the virtual walkthrough.</p></div></div></div>}
      {menuOpen && <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Tour menu"><button className="drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button><span className="menu-eyebrow">SPATIAL KEY / MOBILE 01</span><button onClick={() => { setMenuOpen(false); setMode("chooser"); }}><ScanLine size={19} /> START A SCAN</button><button onClick={() => { setMenuOpen(false); openTourBrowser(); }}><Camera size={19} /> EXPLORE A TOUR</button><button onClick={() => { setMenuOpen(false); shareTour(); }}><Share2 size={19} /> SHARE TOUR</button><button onClick={() => { setMenuOpen(false); setInfoOpen(true); }}><Info size={19} /> HOW IT WORKS</button></div>}
      {mode === "tour" && <button className="info-fab" onClick={() => setInfoOpen(true)} aria-label="About this interactive tour"><Info size={19} /></button>}
      {notice && <div className="toast-message" role="status">{notice}</div>}
    </main>
  );
}
