// Mission control page: a simulated replay of one of my coverage missions.
// The robot follows the route from src/data/mission.ts and the panels update as it goes.

import { HOME, LANE_COUNT, box, iso, route, waypoints, type Vec } from "../data/mission";

type Phase = "command" | "loading" | "navigating" | "returning" | "done";
type Selection = { kind: "robot" } | { kind: "tablet" } | { kind: "home" } | { kind: "wp"; id: number };

const CRUISE_SPEED = 1.0; // m/s shown in the panels
const REPLAY_RATE = 2.6; // mission seconds per real second at 1×
const TURN_RATE = 1.4; // rad/s
const TOTAL = waypoints.length;
const VIEW_W = 1600;
const VIEW_H = 900;
// On wide screens the panels float over the map, so the field sits left of the inspector.
// On small screens the panels sit under the map, so the field is centred and zoomed in.
const defaultView = () =>
  matchMedia("(min-width: 1001px)").matches ? { x: 330, y: 300, scale: 0.92 } : { x: 160, y: 300, scale: 1.35 };

// Distance along the route at each vertex, so a single number describes where the robot is.
const cumulative = [0];
for (let i = 1; i < route.length; i++) {
  cumulative.push(cumulative[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y));
}
const ROUTE_LENGTH = cumulative[cumulative.length - 1];
const COVERAGE_LENGTH = cumulative[TOTAL] - cumulative[1];

const PHASE_LABEL: Record<Phase, string> = {
  command: "Command received",
  loading: "Loading route",
  navigating: "Navigating",
  returning: "Returning home",
  done: "Mission complete",
};

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function positionAt(dist: number): { pos: Vec; segment: number } {
  let i = 0;
  while (i < route.length - 2 && cumulative[i + 1] <= dist) i++;
  const a = route[i];
  const b = route[i + 1];
  const t = Math.min(1, (dist - cumulative[i]) / (cumulative[i + 1] - cumulative[i] || 1));
  return { pos: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, segment: i };
}

function robotSvg(x: number, y: number, heading: number) {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const local = (u: number, v: number): Vec => ({ x: x + u * c - v * s, y: y + u * s + v * c });
  const [gx, gy] = iso(x, y);
  const wheels = [local(0.62, 0.6), local(0.62, -0.6), local(-0.62, 0.6), local(-0.62, -0.6)];
  const wheel = (w: Vec) => box(w.x, w.y, heading, 0.27, 0.12, 0, 13, "rw");
  const behind = wheels.filter((w) => w.x + w.y < x + y);
  const front = wheels.filter((w) => w.x + w.y >= x + y);
  const mast = local(-0.4, 0);
  const lamp = local(0.86, 0);
  const [ax, ay] = iso(mast.x, mast.y, 48);
  return (
    `<ellipse class="r-shadow" cx="${gx}" cy="${gy}" rx="50" ry="25"/>` +
    behind.map(wheel).join("") +
    box(x, y, heading, 0.95, 0.62, 5, 19, "rb") +
    front.map(wheel).join("") +
    box(x, y, heading, 0.62, 0.46, 19, 29, "rd") +
    box(lamp.x, lamp.y, heading, 0.05, 0.4, 19, 21, "rl") +
    box(mast.x, mast.y, heading, 0.07, 0.07, 29, 46, "rm") +
    `<circle class="r-ant" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="4.5"/>`
  );
}

export function initMission(): (() => void) | undefined {
  const found = document.querySelector<HTMLElement>("[data-mission]");
  if (!found) return;
  const root = found;
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const svg = $<SVGSVGElement>("svg.mc-map");
  const robotLayer = $<SVGGElement>(".mc-robot");
  const robotHit = $<SVGEllipseElement>(".mc-robot-hit");
  const robotTag = $<SVGGElement>(".mc-robot-tag");
  const ring = $<SVGGElement>(".mc-ring");
  const trail = $<SVGPolylineElement>(".mc-trail");
  const pin = $<SVGGElement>(".mc-pin");
  const beam = $<SVGLineElement>(".mc-beam");
  const playBtn = $<HTMLButtonElement>("[data-play]");
  const inspector = $(".mc-inspect-body");
  const log = $(".mc-log");
  const wpEls = [...root.querySelectorAll<SVGGElement>("[data-wp]")];
  const stepEls = [...root.querySelectorAll<HTMLElement>("[data-step]")];
  const icons = Object.fromEntries([...root.querySelectorAll<HTMLElement>("[data-icon]")].map((el) => [el.dataset.icon!, el.innerHTML]));
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- simulation state ----------
  let phase: Phase = "command";
  let phaseTime = 0;
  let missionTime = 0;
  let dist = 0;
  let heading = 0;
  let speed = 0;
  let reached = 0;
  let reachedAt: number[] = [];
  let stepTimes: (number | null)[] = [];
  let playing = !reducedMotion;
  let rate = 1;
  let selection: Selection = { kind: "robot" };

  function addLog(text: string) {
    const li = document.createElement("li");
    li.innerHTML = `<time>${clock(missionTime)}</time><span>${text}</span>`;
    log.prepend(li);
    while (log.children.length > 8) log.lastElementChild!.remove();
  }

  function reset() {
    phase = "command";
    phaseTime = 0;
    missionTime = 0;
    dist = 0;
    speed = 0;
    reached = 0;
    reachedAt = [];
    stepTimes = [0, null, null, null, null];
    heading = Math.atan2(route[1].y - route[0].y, route[1].x - route[0].x);
    log.innerHTML = "";
    addLog(`<b>Tablet</b> start mission · ${TOTAL} waypoints`);
    wpEls.forEach((el) => el.classList.remove("done", "next"));
    renderAll();
  }

  function setPhase(next: Phase) {
    phase = next;
    phaseTime = 0;
  }

  // Advance the replay by `realDt` seconds of wall time.
  function update(realDt: number) {
    const dt = realDt * REPLAY_RATE * rate;
    if (phase === "done") {
      phaseTime += realDt;
      if (phaseTime > 6) reset();
      return;
    }
    missionTime += dt;
    phaseTime += dt;

    if (phase === "command") {
      if (phaseTime > 3) {
        setPhase("loading");
        stepTimes[1] = missionTime;
        addLog(`<b>mission_manager</b> route loaded · ${TOTAL} waypoints, ${LANE_COUNT} lanes`);
      }
      return;
    }
    if (phase === "loading") {
      if (phaseTime > 3) {
        setPhase("navigating");
        stepTimes[2] = missionTime;
        addLog("<b>bt_navigator</b> goal → waypoint 1");
      }
      return;
    }

    // Driving: turn towards the current segment and slow down while turning.
    const { segment } = positionAt(dist);
    const a = route[segment];
    const b = route[segment + 1];
    const error = wrapAngle(Math.atan2(b.y - a.y, b.x - a.x) - heading);
    heading += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, error));
    speed = CRUISE_SPEED * Math.max(0.12, Math.cos(Math.min(Math.abs(error), Math.PI / 2)) ** 2);
    dist = Math.min(ROUTE_LENGTH, dist + speed * dt);

    while (reached < TOTAL && cumulative[reached + 1] <= dist) {
      reached++;
      reachedAt[reached] = missionTime;
      addLog(reached < TOTAL ? `reached waypoint ${reached}/${TOTAL} · goal → ${reached + 1}` : `reached waypoint ${TOTAL}/${TOTAL} · coverage complete`);
    }
    if (phase === "navigating" && reached === TOTAL) {
      setPhase("returning");
      stepTimes[3] = missionTime;
      addLog("<b>bt_navigator</b> goal → home");
    }
    if (dist >= ROUTE_LENGTH) {
      speed = 0;
      setPhase("done");
      stepTimes[4] = missionTime;
      addLog("<b>mission_manager</b> robot home · mission complete");
    }
  }

  // ---------- drawing ----------
  let lastReached = -1;
  let lastPhase: Phase | null = null;

  function renderRobot() {
    const { pos, segment } = positionAt(dist);
    robotLayer.innerHTML = robotSvg(pos.x, pos.y, heading);
    const [gx, gy] = iso(pos.x, pos.y);
    ring.setAttribute("transform", `translate(${gx} ${gy})`);
    robotHit.setAttribute("cx", String(gx));
    robotHit.setAttribute("cy", String(gy - 16));
    const [tx, ty] = iso(pos.x, pos.y, 78);
    robotTag.setAttribute("transform", `translate(${tx.toFixed(1)} ${ty.toFixed(1)})`);
    const points = route.slice(0, segment + 1).map((p) => iso(p.x, p.y).join(","));
    points.push(`${gx},${gy}`);
    trail.setAttribute("points", points.join(" "));
    beam.setAttribute("x2", String(gx));
    beam.setAttribute("y2", String(gy - 30));
    return pos;
  }

  function renderProgress() {
    if (reached === lastReached && phase === lastPhase) return;
    lastReached = reached;
    lastPhase = phase;
    const driving = phase === "navigating" || phase === "loading" || phase === "command";
    wpEls.forEach((el, i) => {
      el.classList.toggle("done", i < reached);
      el.classList.toggle("next", driving && i === reached);
    });
    const next = waypoints[reached];
    pin.classList.toggle("hide", !driving || !next);
    if (next) {
      const [px, py] = iso(next.x, next.y);
      pin.setAttribute("transform", `translate(${px} ${py})`);
    }
    beam.classList.toggle("on", phase === "command");
    root.dataset.phase = phase;

    const activeStep = { command: 0, loading: 1, navigating: 2, returning: 4, done: 5 }[phase];
    stepEls.forEach((el, i) => {
      el.classList.toggle("done", i < activeStep || (phase === "returning" && i === 3));
      el.classList.toggle("active", i === activeStep);
      el.querySelector("time")!.textContent = stepTimes[i] != null ? clock(stepTimes[i]!) : "--:--";
    });
    $(".mc-steps-bar span").style.width = `${Math.min(100, (activeStep / 4) * 100)}%`;
    $("[data-step-note]").textContent =
      phase === "navigating" ? `Waypoint ${Math.min(reached + 1, TOTAL)} of ${TOTAL}` : PHASE_LABEL[phase];
  }

  function renderStats(pos: Vec) {
    const coverage = Math.max(0, Math.min(1, (dist - cumulative[1]) / COVERAGE_LENGTH));
    $("[data-stat=wp]").textContent = String(reached);
    $("[data-stat=cov]").textContent = `${Math.round(coverage * 100)}%`;
    $("[data-stat=covbar]").style.width = `${coverage * 100}%`;
    const shown = playing && speed > 0 ? speed + (Math.random() - 0.5) * 0.04 : 0;
    $("[data-stat=speed]").textContent = shown.toFixed(2);
    $("[data-stat=time]").textContent = clock(missionTime);
    $("[data-stat=dist]").textContent = `${dist.toFixed(1)} m`;
    $(".mc-phase").textContent = PHASE_LABEL[phase];
    renderInspector(pos);
  }

  const row = (label: string, value: string) => `<div class="mc-row"><span>${label}</span><strong>${value}</strong></div>`;
  const head = (icon: string, title: string, sub: string, badge: string, tone = "") =>
    `<div class="mc-ihead"><span class="mc-iicon">${icons[icon] ?? ""}</span><div><p class="mc-ititle">${title}</p><p class="mc-isub">${sub}</p></div></div>` +
    `<span class="mc-badge ${tone}">${badge}</span>`;

  function renderInspector(pos: Vec) {
    let html = "";
    if (selection.kind === "robot") {
      const next = reached < TOTAL ? `#${reached + 1}` : "Home";
      const deg = ((Math.round((heading * 180) / Math.PI) % 360) + 360) % 360;
      html =
        head("ugv", "Hunter SE", "Autonomous ground robot", PHASE_LABEL[phase], phase === "done" ? "ok" : "live") +
        row("Mission", `Field coverage · ${TOTAL} points`) +
        row("Progress", `${reached} / ${TOTAL}`) +
        row("Next goal", phase === "done" ? "–" : next) +
        row("Position", `x ${pos.x.toFixed(1)} · y ${pos.y.toFixed(1)} m`) +
        row("Heading", `${deg}°`) +
        row("Localization", "EKF: GNSS + IMU + wheels") +
        row("Navigation", "ROS 2 · Nav2") +
        row("Compute", "NVIDIA Jetson");
    } else if (selection.kind === "wp") {
      const wp = waypoints[selection.id - 1];
      const done = wp.id <= reached;
      const isNext = wp.id === reached + 1 && phase !== "done" && phase !== "returning";
      html =
        head("pin", `Waypoint ${wp.id}`, `Lane ${wp.lane} of ${LANE_COUNT}`, done ? "Reached" : isNext ? "Next goal" : "Pending", done ? "ok" : isNext ? "live" : "") +
        row("Order", `${wp.id} of ${TOTAL}`) +
        row("Position", `x ${wp.x.toFixed(1)} · y ${wp.y.toFixed(1)} m`) +
        row("Reached at", done ? clock(reachedAt[wp.id]) : "–") +
        row("Sent to", "Nav2 as a navigation goal");
    } else if (selection.kind === "tablet") {
      html =
        head("tablet", "Operator tablet", "Mission control app", "Connected", "ok") +
        row("Frontend", "React") +
        row("Backend", "Python · FastAPI") +
        row("Start a mission", "One command") +
        row("Also", "Monitor, drive, manage") +
        row("Last command", `Start mission (${TOTAL} pts)`);
    } else {
      html =
        head("home", "Home point", "Start and finish", phase === "done" ? "Robot home" : "Waiting", phase === "done" ? "ok" : "") +
        row("Position", `x ${HOME.x.toFixed(1)} · y ${HOME.y.toFixed(1)} m`) +
        row("Mission starts", "From the tablet") +
        row("Robot returns", `After waypoint ${TOTAL}`);
    }
    inspector.innerHTML = html;
  }

  const topicBase: Record<string, number> = {};
  function renderTopics() {
    const running = phase !== "done";
    root.querySelectorAll<HTMLElement>("[data-hz]").forEach((el) => {
      const base = (topicBase[el.dataset.hz!] ??= Number(el.dataset.base));
      const live = running || el.dataset.always !== undefined;
      el.textContent = live ? `${(base * (0.97 + Math.random() * 0.06)).toFixed(1)} Hz` : "0.0 Hz";
    });
    root.querySelectorAll<HTMLElement>("[data-node]").forEach((el) => {
      const idle = el.dataset.node === "drive" && (phase === "done" || phase === "command");
      el.classList.toggle("idle", idle);
      el.querySelector("em")!.textContent = idle ? "idle" : "active";
    });
  }

  // ---------- camera: zoom, pan, follow ----------
  const view = { ...defaultView(), follow: false };
  function applyView() {
    const w = VIEW_W / view.scale;
    const h = VIEW_H / view.scale;
    svg.setAttribute("viewBox", `${(view.x - w / 2).toFixed(1)} ${(view.y - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
    $("[data-view=follow]").setAttribute("aria-pressed", String(view.follow));
  }
  function followRobot(pos: Vec, smooth: number) {
    const [gx, gy] = iso(pos.x, pos.y);
    view.x += (gx - view.x) * smooth;
    view.y += (gy - 20 - view.y) * smooth;
    applyView();
  }

  function renderAll() {
    const pos = renderRobot();
    lastReached = -1;
    renderProgress();
    renderStats(pos);
    renderTopics();
  }

  // ---------- main loop ----------
  let frame = 0;
  let last = performance.now();
  let statsTimer = 0;
  let topicTimer = 0;
  let visible = true;
  function loop(now: number) {
    const realDt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (visible) {
      if (playing) update(realDt);
      const pos = renderRobot();
      renderProgress();
      statsTimer += realDt;
      topicTimer += realDt;
      if (statsTimer > 0.2) { statsTimer = 0; renderStats(pos); }
      if (topicTimer > 1) { topicTimer = 0; renderTopics(); }
      if (view.follow) followRobot(pos, Math.min(1, realDt * 4));
    }
    frame = requestAnimationFrame(loop);
  }

  // ---------- controls ----------
  const setPlaying = (value: boolean) => {
    playing = value;
    playBtn.setAttribute("aria-pressed", String(playing));
    playBtn.setAttribute("aria-label", playing ? "Pause replay" : "Play replay");
    root.classList.toggle("paused", !playing);
  };
  playBtn.addEventListener("click", () => setPlaying(!playing));
  $("[data-restart]").addEventListener("click", () => { reset(); setPlaying(true); });
  root.querySelectorAll<HTMLButtonElement>("[data-rate]").forEach((btn) =>
    btn.addEventListener("click", () => {
      rate = Number(btn.dataset.rate);
      root.querySelectorAll("[data-rate]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    }),
  );
  root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const action = btn.dataset.view;
      if (action === "in") view.scale = Math.min(3, view.scale * 1.25);
      if (action === "out") view.scale = Math.max(0.7, view.scale / 1.25);
      if (action === "fit") Object.assign(view, { ...defaultView(), follow: false });
      if (action === "follow") {
        view.follow = !view.follow;
        if (view.follow) view.scale = Math.max(view.scale, 1.9);
      }
      applyView();
    }),
  );
  root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((tab) =>
    tab.addEventListener("click", () => {
      root.querySelectorAll<HTMLElement>("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      root.querySelectorAll<HTMLElement>("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    }),
  );

  // Select things on the map. A drag pans the map instead.
  function select(next: Selection) {
    selection = next;
    root.querySelectorAll(".sel").forEach((el) => el.classList.remove("sel"));
    if (next.kind === "wp") wpEls[next.id - 1].classList.add("sel");
    else root.querySelector(`[data-obj=${next.kind}]`)?.classList.add("sel");
    renderInspector(positionAt(dist).pos);
  }
  let drag: { x: number; y: number; moved: boolean } | null = null;
  svg.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: false };
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) { drag.moved = true; svg.setPointerCapture(e.pointerId); svg.classList.add("dragging"); }
    const r = svg.getBoundingClientRect();
    const unit = Math.max(VIEW_W / view.scale / r.width, VIEW_H / view.scale / r.height);
    view.x -= dx * unit;
    view.y -= dy * unit;
    view.follow = false;
    drag.x = e.clientX;
    drag.y = e.clientY;
    applyView();
  });
  const endDrag = (e: PointerEvent) => {
    if (drag && !drag.moved && e.type === "pointerup") {
      const target = (e.target as Element).closest<SVGElement>("[data-wp], [data-obj]");
      if (target?.dataset.wp) select({ kind: "wp", id: Number(target.dataset.wp) });
      else if (target?.dataset.obj) select({ kind: target.dataset.obj as "robot" | "tablet" | "home" });
    }
    drag = null;
    svg.classList.remove("dragging");
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);

  // Only animate while the dashboard is on screen.
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; last = performance.now(); });
  io.observe(root);

  reset();
  if (reducedMotion) {
    // No animation: show the mission part-way through, paused.
    playing = true;
    while (reached < 23) update(0.1);
    renderAll();
  }
  setPlaying(!reducedMotion);
  select({ kind: "robot" });
  applyView();
  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    io.disconnect();
  };
}
