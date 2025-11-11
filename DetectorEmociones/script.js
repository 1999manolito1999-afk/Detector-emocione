console.log("✅ script.js cargado correctamente");

// Referencias
const video = document.getElementById("video");
const canvas = document.getElementById("overlay");
const ctx = canvas.getContext("2d");

// Panel lateral
const emojiDisplay = document.getElementById("emoji-display");
const mainEmotionText = document.getElementById("main-emotion");
const barsContainer = document.getElementById("bars");

let emotionHistory = [];

// Suavizado
function getSmoothedEmotion(emotions) {
  emotionHistory.push(emotions);
  if (emotionHistory.length > 15) emotionHistory.shift();
  const avg = {};
  for (const key of Object.keys(emotions)) {
    avg[key] =
      emotionHistory.reduce((sum, e) => sum + e[key], 0) / emotionHistory.length;
  }
  return avg;
}

// ================================
// INICIO
// ================================
async function start() {
  try {
    console.log("🎥 Solicitando acceso a la cámara...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log("📸 Cámara lista:", video.videoWidth, "x", video.videoHeight);
        resolve();
      };
    });

    console.log("⚙️ Cargando modelos...");
    await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
    await faceapi.nets.faceExpressionNet.loadFromUri("./models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("./models");
    console.log("🚀 Modelos listos");

    console.log("▶️ Iniciando detección...");
    detectEmotions();
  } catch (err) {
    console.error("❌ Error al iniciar detección:", err);
  }
}

async function detectEmotions() {
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.1,
  });

  async function draw() {
    const detections = await faceapi
      .detectAllFaces(video, options)
      .withFaceLandmarks()
      .withFaceExpressions();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length > 0) {
      const d = detections[0];
      const box = d.detection.box;
      const emotions = d.expressions;

      // Solo emociones básicas (Paul Ekman)
      const ekmanEmotions = (({ happy, sad, angry, surprised, fearful, disgusted }) =>
        ({ happy, sad, angry, surprised, fearful, disgusted }))(emotions);

      const smoothed = getSmoothedEmotion(ekmanEmotions);
      const mainEmotion = Object.entries(smoothed).sort((a, b) => b[1] - a[1])[0][0];
      const confidence = smoothed[mainEmotion];

      const traducciones = {
        happy: "Felicidad",
        sad: "Tristeza",
        angry: "Enojo",
        surprised: "Sorpresa",
        fearful: "Miedo",
        disgusted: "Asco",
      };
      const emocionEsp = traducciones[mainEmotion] || mainEmotion;

      // 🟩 Solo recuadro facial
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // 🔹 Actualiza panel lateral
      const emojiMap = {
        happy: "😄",
        sad: "😢",
        angry: "😡",
        surprised: "😲",
        fearful: "😨",
        disgusted: "🤢",
      };
      emojiDisplay.textContent = emojiMap[mainEmotion] || "😐";
      mainEmotionText.textContent = `${emocionEsp} (${Math.round(confidence * 100)}%)`;

      // 🔹 Barras de porcentaje
      barsContainer.innerHTML = "";
      for (const [emotion, value] of Object.entries(smoothed)) {
        const nombre = traducciones[emotion];
        const porcentaje = (value * 100).toFixed(1);
        const color = {
          happy: "#00ff99",
          sad: "#66b2ff",
          angry: "#ff3333",
          surprised: "#ffd633",
          fearful: "#ff9966",
          disgusted: "#cc66ff",
        }[emotion];

        const bar = document.createElement("div");
        bar.innerHTML = `
          <div class="bar-label">
            <span>${nombre}</span><span>${porcentaje}%</span>
          </div>
          <div class="bar"><div class="bar-fill" style="width:${porcentaje}%; background:${color}"></div></div>
        `;
        barsContainer.appendChild(bar);
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// Ejecutar al cargar
window.addEventListener("load", start);
