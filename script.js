const canvas = document.getElementById("fireworksCanvas");
const context = canvas.getContext("2d");
const welcomeScreen = document.getElementById("welcomeScreen");
const enterButton = document.getElementById("enterButton");
const celebrateButton = document.getElementById("celebrateButton");
const lightButton = document.getElementById("lightButton");
const lightStatus = document.getElementById("lightStatus");
const miniScene = document.querySelector(".mini-scene");
const surpriseButton = document.getElementById("surpriseButton");
const surpriseReveal = document.getElementById("surpriseReveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rockets = [];
const sparks = [];
const colors = ["#ffd98a", "#f5bb55", "#ff914d", "#fff3c4", "#e8754c", "#a9d8ff"];
let frameId;
let lastLaunch = 0;
document.body.classList.add("is-locked");

function vibrate(pattern) {
  if (typeof navigator.vibrate === "function") navigator.vibrate(pattern);
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createFirework(x = Math.random() * window.innerWidth, y = 110 + Math.random() * window.innerHeight * 0.42, deep = false) {
  const color = colors[Math.floor(Math.random() * colors.length)];
  vibrate(deep ? [18, 12, 18] : 12);
  rockets.push({
    x: x + (Math.random() - .5) * 90,
    y: window.innerHeight + 10,
    targetX: x,
    targetY: y,
    speed: 8 + Math.random() * 2,
    color,
    deep,
  });
}

function burst(rocket) {
  vibrate(rocket.deep ? [35, 18, 55] : [24, 16, 34]);
  const count = window.innerWidth < 600 ? 48 : 82;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - .5) * .12;
    const speed = 1.6 + Math.random() * 4.4;
    sparks.push({
      x: rocket.targetX, y: rocket.targetY,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1, decay: .008 + Math.random() * .014, color: rocket.color,
      size: 1 + Math.random() * 1.8,
    });
  }
  // Add a smaller inner burst for a fuller, layered firecracker effect.
  for (let i = 0; i < 16; i += 1) {
    const angle = (Math.PI * 2 * i) / 16;
    const speed = .8 + Math.random() * 1.4;
    sparks.push({
      x: rocket.targetX, y: rocket.targetY,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: .85, decay: .014 + Math.random() * .012, color: "#fff3c4",
      size: 1.2 + Math.random() * 1.4,
    });
  }
}

function animate(timestamp = 0) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  // Clear the transparent overlay each frame so fireworks never leave a dark
  // wash or ghosted background behind after the burst ends.
  context.clearRect(0, 0, width, height);
  if (!reduceMotion && timestamp - lastLaunch > (width < 600 ? 2400 : 1800)) {
    createFirework();
    lastLaunch = timestamp;
  }
  rockets.forEach((rocket, index) => {
    const dx = rocket.targetX - rocket.x;
    const dy = rocket.targetY - rocket.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 12) {
      burst(rocket);
      rockets.splice(index, 1);
      return;
    }
    rocket.x += (dx / distance) * rocket.speed;
    rocket.y += (dy / distance) * rocket.speed;
    context.fillStyle = rocket.color;
    context.shadowBlur = 10;
    context.shadowColor = rocket.color;
    context.fillRect(rocket.x - 1, rocket.y - 1, 2, 2);
  });
  sparks.forEach((spark, index) => {
    spark.x += spark.vx;
    spark.y += spark.vy;
    spark.vy += .025;
    spark.vx *= .986;
    spark.life -= spark.decay;
    if (spark.life <= 0) {
      sparks.splice(index, 1);
      return;
    }
    context.globalAlpha = spark.life;
    context.fillStyle = spark.color;
    context.shadowBlur = 8;
    context.shadowColor = spark.color;
    context.beginPath();
    context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  frameId = requestAnimationFrame(animate);
}

function celebrate() {
  const center = window.innerWidth / 2;
  const launchPoints = [
    [center - 285, .3], [center - 220, .18], [center - 145, .35],
    [center - 75, .13], [center, .28], [center + 75, .1],
    [center + 145, .34], [center + 220, .18], [center + 285, .3],
  ];
  launchPoints.forEach(([x, height], index) => {
    window.setTimeout(() => createFirework(x, window.innerHeight * height), index * 150);
  });
  // A second wave keeps the sky lively after the first row has burst.
  window.setTimeout(() => {
    [-180, -60, 60, 180].forEach((offset, index) => {
      window.setTimeout(
        () => createFirework(center + offset, window.innerHeight * (.16 + (index % 2) * .12)),
        index * 170,
      );
    });
  }, 1550);
  window.setTimeout(() => {
    document.body.classList.add("grand-finale");
    const finalePoints = [
      [-300, .18], [-200, .3], [-100, .12], [0, .23],
      [100, .12], [200, .3], [300, .18],
    ];
    finalePoints.forEach(([offset, height], index) => {
      window.setTimeout(() => createFirework(center + offset, window.innerHeight * height, true), index * 100);
    });
    window.setTimeout(() => document.body.classList.remove("grand-finale"), 2600);
  }, 2650);
  celebrateButton.querySelector("span").textContent = "The sky is glowing";
  celebrateButton.classList.add("firecracker-flash");
  window.setTimeout(() => {
    celebrateButton.querySelector("span").textContent = "Glow the Sky";
    celebrateButton.classList.remove("firecracker-flash");
  }, 3000);
}

function openSurprise() {
  vibrate(12);
  surpriseReveal.classList.toggle("is-open");
  surpriseReveal.setAttribute("aria-hidden", String(!surpriseReveal.classList.contains("is-open")));
  surpriseButton.querySelector("span").textContent = surpriseReveal.classList.contains("is-open")
    ? "Close Your Surprise" : "Open Your Surprise";
}

function lightDiya() {
  vibrate([18, 30, 35]);
  miniScene.classList.toggle("lit");
  const lit = miniScene.classList.contains("lit");
  lightButton.querySelector("span:nth-child(2)").textContent = lit ? "Wish is glowing" : "Make a Wish";
  lightStatus.textContent = lit ? "Your light is shining bright." : "Your light is waiting.";
  if (lit) {
    [-180, -60, 60, 180].forEach((offset, index) => {
      window.setTimeout(() => createFirework(window.innerWidth / 2 + offset, window.innerHeight * .2, true), index * 190);
    });
  }
}

window.addEventListener("resize", resizeCanvas);
enterButton.addEventListener("click", () => {
  vibrate(18);
  welcomeScreen.classList.add("is-hidden");
  document.body.classList.remove("is-locked");
});
celebrateButton.addEventListener("click", celebrate);
lightButton.addEventListener("click", lightDiya);
surpriseButton.addEventListener("click", openSurprise);
document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button, a, input, .welcome-screen")) return;
  createFirework(event.clientX, event.clientY, false);
});
resizeCanvas();
// Keep the renderer alive for user-triggered fireworks, even when reduced motion
// is enabled. Reduced motion only disables the unattended background launches.
frameId = requestAnimationFrame(animate);

window.addEventListener("beforeunload", () => cancelAnimationFrame(frameId));
