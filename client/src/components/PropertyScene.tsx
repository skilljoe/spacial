import { useEffect, useRef } from "react";
import * as pc from "playcanvas";

export type RoomId = "living" | "kitchen" | "terrace" | "dining" | "bedroom" | "bath";

type PropertySceneProps = {
  room: RoomId;
  onInteract?: () => void;
};

type SceneApi = {
  goToRoom: (room: RoomId) => void;
};

const roomViews: Record<RoomId, { target: [number, number, number]; yaw: number; pitch: number; radius: number }> = {
  living: { target: [0, 1.45, -0.4], yaw: -28, pitch: 3, radius: 7.8 },
  kitchen: { target: [1.6, 1.45, -0.1], yaw: -76, pitch: 4, radius: 6.1 },
  terrace: { target: [-1.8, 1.45, -1.1], yaw: 26, pitch: 1, radius: 7.1 },
  dining: { target: [1.2, 1.25, -2.05], yaw: -112, pitch: 4, radius: 5.7 },
  bedroom: { target: [-2.1, 1.35, -2.2], yaw: 156, pitch: 3, radius: 5.3 },
  bath: { target: [3.2, 1.35, -2.45], yaw: -152, pitch: 2, radius: 4.9 },
};

function material(color: string, gloss = 0.18, metalness = 0) {
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(r, g, b);
  mat.gloss = gloss;
  mat.metalness = metalness;
  mat.update();
  return mat;
}

function addBox(
  root: pc.Entity,
  name: string,
  position: [number, number, number],
  scale: [number, number, number],
  color: string,
  gloss = 0.18,
  metalness = 0,
) {
  const entity = new pc.Entity(name);
  entity.addComponent("render", { type: "box", material: material(color, gloss, metalness) });
  entity.setLocalPosition(...position);
  entity.setLocalScale(...scale);
  root.addChild(entity);
  return entity;
}

function addSphere(
  root: pc.Entity,
  position: [number, number, number],
  scale: [number, number, number],
  color: string,
) {
  const entity = new pc.Entity("soft sphere");
  entity.addComponent("render", { type: "sphere", material: material(color, 0.3) });
  entity.setLocalPosition(...position);
  entity.setLocalScale(...scale);
  root.addChild(entity);
  return entity;
}

export default function PropertyScene({ room, onInteract }: PropertySceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SceneApi | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const app = new pc.Application(canvas, {
      graphicsDeviceOptions: { alpha: true, antialias: true },
    });
    app.start();
    app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 1.75);
    app.scene.ambientLight = new pc.Color(0.35, 0.34, 0.3);

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      app.resizeCanvas(Math.max(1, bounds.width), Math.max(1, bounds.height));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const root = new pc.Entity("Olive House");
    app.root.addChild(root);

    const camera = new pc.Entity("camera");
    camera.addComponent("camera", { fov: 58, nearClip: 0.1, farClip: 100, clearColor: new pc.Color(0.055, 0.067, 0.065) });
    camera.camera!.toneMapping = pc.TONEMAP_ACES;
    app.root.addChild(camera);

    const keyLight = new pc.Entity("morning sun");
    keyLight.addComponent("light", { type: "directional", color: new pc.Color(1, 0.78, 0.5), intensity: 2.2, castShadows: true, shadowResolution: 1024 });
    keyLight.setLocalEulerAngles(42, -36, 0);
    app.root.addChild(keyLight);

    const fillLight = new pc.Entity("window fill");
    fillLight.addComponent("light", { type: "omni", color: new pc.Color(0.38, 0.63, 0.98), intensity: 1.15, range: 8 });
    fillLight.setLocalPosition(-3.4, 3.7, 0.5);
    app.root.addChild(fillLight);

    const lampLight = new pc.Entity("reading lamp glow");
    lampLight.addComponent("light", { type: "omni", color: new pc.Color(1, 0.57, 0.25), intensity: 1.4, range: 4 });
    lampLight.setLocalPosition(2.8, 2.4, -1.6);
    app.root.addChild(lampLight);

    // Architectural shell
    addBox(root, "oak floor", [0, -0.16, 0], [12, 0.22, 10], "#725641", 0.55);
    addBox(root, "back plaster wall", [0, 2.85, -4.5], [12, 6, 0.18], "#d9d2c7", 0.05);
    addBox(root, "left plaster wall", [-5.8, 2.85, 0], [0.18, 6, 9], "#cfc6b8", 0.05);
    addBox(root, "ceiling", [0, 5.9, 0], [12, 0.16, 9], "#e4ded4", 0.02);

    // Window wall and terrace light opening
    addBox(root, "window glass", [-5.64, 3.25, -1.1], [0.03, 4.4, 5.3], "#8db6c2", 0.9, 0.15);
    for (let i = 0; i < 4; i += 1) {
      addBox(root, "window mullion", [-5.58, 3.2, -3.45 + i * 1.65], [0.16, 4.8, 0.09], "#24282a", 0.5, 0.6);
    }
    addBox(root, "window rail", [-5.58, 3.2, -1.05], [0.16, 0.11, 5.25], "#24282a", 0.5, 0.6);
    addBox(root, "terrace floor", [-7.1, -0.34, -1.1], [3, 0.18, 7], "#5b5b4e", 0.4);
    addBox(root, "terrace planter", [-7.1, 0.35, 1.9], [2.7, 1.1, 0.65], "#313c30", 0.2);
    for (let i = 0; i < 5; i += 1) {
      addSphere(root, [-7.3 + (i % 2) * 0.5, 1.1 + (i % 3) * 0.23, 1.55 + Math.floor(i / 2) * 0.44], [0.8, 1.35, 0.8], i % 2 ? "#29452f" : "#486841");
    }

    // Living room furniture
    addBox(root, "linen sofa base", [-0.65, 0.58, -1.05], [4.2, 0.95, 1.45], "#d3c6b5", 0.12);
    addBox(root, "linen sofa back", [-0.65, 1.28, -1.58], [4.2, 0.78, 0.3], "#d8cbbb", 0.12);
    addBox(root, "sofa left arm", [-2.56, 0.98, -1.05], [0.36, 0.75, 1.42], "#c8b9a7", 0.12);
    addBox(root, "sofa right arm", [1.25, 0.98, -1.05], [0.36, 0.75, 1.42], "#c8b9a7", 0.12);
    addBox(root, "coffee table", [-0.3, 0.48, 1.02], [2.15, 0.32, 1.15], "#3f3027", 0.65, 0.15);
    addBox(root, "table book", [-0.1, 0.68, 1.02], [0.82, 0.1, 0.55], "#d2915d", 0.3);
    addBox(root, "rug", [-0.15, 0.01, 0.48], [5.1, 0.04, 4.1], "#ac9a81", 0.1);
    addSphere(root, [2.75, 0.66, 0.7], [1.4, 1.05, 1.4], "#a77c5f");
    addBox(root, "lounge chair seat", [2.75, 0.82, 0.7], [1.2, 0.36, 1.15], "#976e55", 0.18);
    addBox(root, "lounge chair back", [2.75, 1.38, 1.12], [1.2, 0.88, 0.24], "#8e644d", 0.18);

    // Kitchen in the rear-right
    addBox(root, "kitchen island", [3.05, 1.05, -1.5], [2.2, 1.72, 1.1], "#6a7768", 0.16);
    addBox(root, "island stone", [3.05, 1.95, -1.5], [2.35, 0.14, 1.24], "#d7d0c2", 0.5);
    addBox(root, "kitchen cabinets", [3.6, 1.3, -3.7], [3.7, 2.55, 0.52], "#73806e", 0.2);
    addBox(root, "open shelf", [1.0, 2.45, -3.55], [1.45, 0.16, 0.38], "#5b4a3c", 0.3);
    for (let i = 0; i < 3; i += 1) {
      addSphere(root, [0.52 + i * 0.48, 2.7, -3.5], [0.18, 0.27, 0.18], i === 1 ? "#bf8a55" : "#e5ddd1");
    }
    for (let i = 0; i < 2; i += 1) {
      addBox(root, "bar stool", [2.3 + i * 1.5, 0.64, -0.25], [0.66, 1.25, 0.66], "#433c35", 0.35, 0.2);
      addSphere(root, [2.3 + i * 1.5, 1.18, -0.25], [0.78, 0.22, 0.78], "#c18457");
    }

    // Art, shelves, and a tall plant
    addBox(root, "art frame", [-0.2, 3.0, -4.33], [1.75, 1.45, 0.08], "#2c2d2b", 0.38);
    addBox(root, "artwork", [-0.2, 3.0, -4.39], [1.46, 1.18, 0.05], "#c58f63", 0.25);
    addBox(root, "plant pot", [-3.9, 0.47, -2.9], [0.72, 0.86, 0.72], "#a1684f", 0.18);
    for (let i = 0; i < 9; i += 1) {
      const angle = (i / 9) * Math.PI * 2;
      const leaf = addSphere(root, [-3.9 + Math.cos(angle) * 0.55, 1.3 + (i % 3) * 0.55, -2.9 + Math.sin(angle) * 0.55], [0.45, 1.2, 0.23], i % 2 ? "#295241" : "#42694d");
      leaf.setLocalEulerAngles((i % 3) * 14, i * 37, (i % 2) * 28);
    }
    addBox(root, "floor lamp pole", [2.85, 1.4, -2.95], [0.08, 2.45, 0.08], "#292521", 0.7, 0.55);
    addSphere(root, [2.85, 2.75, -2.95], [0.75, 0.36, 0.75], "#e1a362");

    // Decorative reference points evoking a splat capture
    for (let i = 0; i < 85; i += 1) {
      const x = -5.25 + ((i * 37) % 100) / 100 * 10.2;
      const y = 0.42 + ((i * 19) % 100) / 100 * 5.0;
      const z = -4.22 + ((i * 53) % 100) / 100 * 0.15;
      const dot = addSphere(root, [x, y, z], [0.018, 0.018, 0.018], i % 3 === 0 ? "#c18c61" : "#84a3a4");
      dot.enabled = i % 2 === 0;
    }

    let target = new pc.Vec3(...roomViews.living.target);
    let goal = target.clone();
    let yaw = roomViews.living.yaw;
    let pitch = roomViews.living.pitch;
    let goalYaw = yaw;
    let goalPitch = pitch;
    let radius = roomViews.living.radius;
    let goalRadius = radius;
    let activePointer: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let dragged = false;

    const updateCamera = () => {
      const yawRad = (yaw * Math.PI) / 180;
      const pitchRad = (pitch * Math.PI) / 180;
      const position = new pc.Vec3(
        target.x + Math.sin(yawRad) * Math.cos(pitchRad) * radius,
        target.y + Math.sin(pitchRad) * radius + 1.05,
        target.z + Math.cos(yawRad) * Math.cos(pitchRad) * radius,
      );
      camera.setPosition(position);
      camera.lookAt(target);
    };

    const goToRoom = (nextRoom: RoomId) => {
      const view = roomViews[nextRoom];
      goal = new pc.Vec3(...view.target);
      goalYaw = view.yaw;
      goalPitch = view.pitch;
      goalRadius = view.radius;
    };
    sceneRef.current = { goToRoom };

    const handlePointerDown = (event: PointerEvent) => {
      activePointer = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
      lastX = event.clientX;
      lastY = event.clientY;
      dragged = false;
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      goalYaw -= dx * 0.25;
      goalPitch = Math.max(-9, Math.min(21, goalPitch + dy * 0.16));
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const releasePointer = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      if (!dragged) onInteract?.();
      activePointer = null;
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      goalRadius = Math.max(4.7, Math.min(10.5, goalRadius + event.deltaY * 0.007));
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    app.on("update", (dt: number) => {
      const smooth = Math.min(1, dt * 5.5);
      target.lerp(target, goal, smooth);
      yaw += (goalYaw - yaw) * smooth;
      pitch += (goalPitch - pitch) * smooth;
      radius += (goalRadius - radius) * smooth;
      updateCamera();
    });

    return () => {
      sceneRef.current = null;
      observer.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", releasePointer);
      canvas.removeEventListener("pointercancel", releasePointer);
      canvas.removeEventListener("wheel", handleWheel);
      app.destroy();
    };
  }, [onInteract]);

  useEffect(() => {
    sceneRef.current?.goToRoom(room);
  }, [room]);

  return <canvas ref={canvasRef} className="property-canvas" aria-label="Interactive 3D view of Olive House" />;
}
