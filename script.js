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
const soundButton = document.getElementById("soundButton");
const soundIcon = soundButton.querySelector(".sound-icon");
const soundLabel = soundButton.querySelector(".sound-label");
const volumeSlider = document.getElementById("volumeSlider");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rockets = [];
const sparks = [];
const colors = ["#ffd98a", "#f5bb55", "#ff914d", "#fff3c4", "#e8754c", "#a9d8ff"];
let frameId;
let lastLaunch = 0;
let audioContext;
let masterGain;
let compressor;
let ambienceSource;
let soundEnabled = sessionStorage.getItem("diwali-sound") === "on";
let masterVolume = Number(sessionStorage.getItem("diwali-volume") || .55);
document.body.classList.add("is-locked");
volumeSlider.value = String(Math.round(masterVolume * 100));

function ensureAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  if (!masterGain) {
    masterGain = audioContext.createGain();
    compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = .003;
    compressor.release.value = .22;
    masterGain.gain.value = masterVolume;
    masterGain.connect(compressor).connect(audioContext.destination);
  }
}

function startAmbience() {
  if (ambienceSource || !soundEnabled) return;
  ensureAudio();
  const length = audioContext.sampleRate * 2;
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * .2;
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  ambienceSource = audioContext.createBufferSource();
  ambienceSource.buffer = buffer;
  ambienceSource.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = 340;
  gain.gain.value = .018;
  ambienceSource.connect(filter).connect(gain).connect(masterGain);
  ambienceSource.start();
}

function stopAmbience() {
  if (!ambienceSource) return;
  ambienceSource.stop();
  ambienceSource.disconnect();
  ambienceSource = null;
}

function playChime(frequency = 392, duration = .18, volume = .025) {
  if (!soundEnabled) return;
  ensureAudio();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function playDiyaSound() {
  if (!soundEnabled) return;
  playChime(660, .35, .025);
  window.setTimeout(() => playChime(880, .5, .018), 110);
}

function vibrate(pattern) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
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
  if (surpriseReveal.classList.contains("is-open")) {
    playChime(587, .25, .02);
    window.setTimeout(() => playChime(784, .45, .018), 160);
  }
}

function lightDiya() {
  vibrate([18, 30, 35]);
  miniScene.classList.toggle("lit");
  const lit = miniScene.classList.contains("lit");
  lightButton.querySelector("span:nth-child(2)").textContent = lit ? "Wish is glowing" : "Make a Wish";
  lightStatus.textContent = lit ? "Your light is shining bright." : "Your light is waiting.";
  if (lit) {
    playDiyaSound();
    [-180, -60, 60, 180].forEach((offset, index) => {
      window.setTimeout(() => createFirework(window.innerWidth / 2 + offset, window.innerHeight * .2, true), index * 190);
    });
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  sessionStorage.setItem("diwali-sound", soundEnabled ? "on" : "off");
  if (soundEnabled) {
    ensureAudio();
    startAmbience();
  } else {
    stopAmbience();
  }
  soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
  soundLabel.textContent = soundEnabled ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-label", soundEnabled ? "Mute sound" : "Turn sound on");
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled) {
    ensureAudio();
    startAmbience();
  }
  if (soundEnabled) playChime(392, .5, .035);
}

window.addEventListener("resize", resizeCanvas);
enterButton.addEventListener("click", () => {
  vibrate(18);
  welcomeScreen.classList.add("is-hidden");
  document.body.classList.remove("is-locked");
  playChime(523, .35, .02);
  window.setTimeout(() => playChime(659, .5, .015), 100);
});
celebrateButton.addEventListener("click", celebrate);
lightButton.addEventListener("click", lightDiya);
surpriseButton.addEventListener("click", openSurprise);
soundButton.addEventListener("click", toggleSound);
volumeSlider.addEventListener("input", (event) => {
  masterVolume = Number(event.target.value) / 100;
  sessionStorage.setItem("diwali-volume", String(masterVolume));
  if (masterGain) masterGain.gain.setTargetAtTime(masterVolume, audioContext.currentTime, .02);
});
canvas.addEventListener("click", (event) => {
  createFirework(event.clientX, event.clientY, false);
});
soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
soundLabel.textContent = soundEnabled ? "Sound on" : "Sound off";
soundButton.setAttribute("aria-pressed", String(soundEnabled));
resizeCanvas();
// Keep the renderer alive for user-triggered fireworks, even when reduced motion
// is enabled. Reduced motion only disables the unattended background launches.
frameId = requestAnimationFrame(animate);

window.addEventListener("beforeunload", () => cancelAnimationFrame(frameId));
