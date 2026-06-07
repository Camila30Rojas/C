let handPose;
let video;
let hands = [];

let fondoImg;
let lupaImg;

let lupaX;
let lupaY;

let velocidad = 8;

// Mensaje de depuración (se muestra en pantalla)
let debugMsg = "";
// Variables para detección de cambio de gesto
let lastTargetX = null;
let lastTargetY = null;
const gestureThreshold = 50; // px, cambio grande que indica nuevo gesto
const gestureSlowFactor = 0.03; // interpolación lenta cuando detecta cambio

let tiempoQuieto = 0;
let ultimaX;
let ultimaY;

// Variables para el movimiento por frames (comportamiento inicial)
let contadorFrames = 0;
const movementThreshold = 40; // px
const framesThreshold = 6; // frames (reducido para respuesta más rápida)

const BASE_W = 640;
const BASE_H = 480;

const baseDifferences = [

  // 1. Nube superior izquierda
  {x: 170,  y: 130,  radio: 20, encontrada:false},

  // 2. Mariposa / libélula
  {x: 140, y: 270, radio: 25, encontrada:false},

  // 3. Pecho del conejo
  {x: 170, y: 260, radio: 25, encontrada:false},

  // 4. Ojo del zorro
  {x: 150,  y: 310, radio: 20, encontrada:false},

  // 5. Rama en la boca del ave
  {x: 140,  y: 390, radio: 25, encontrada:false},

  // 6. Rana (aparece solo en la imagen derecha)
  {x: 210, y: 410, radio: 25, encontrada:false},

  // 7. Flor junto al alce
  {x: 250, y: 370, radio: 25, encontrada:false},

  // 8. Ojo del alce
  {x: 270, y: 270, radio: 20, encontrada:false},

  // 9. Árbol derecho con textura diferente
  {x: 290, y: 330, radio: 25, encontrada:false},

  // 10. Hongo rojo (cantidad de puntos)
  {x: 245, y: 420, radio: 25, encontrada:false}

];

let diferencias = [];

function preload() {

  fondoImg = loadImage(
    "Images/Fondo.jpg",
    () => console.log("Fondo cargado"),
    () => console.log("No se pudo cargar Fondo.jpg")
  );

  lupaImg = loadImage(
    "Images/lupita.png",
    () => console.log("Lupa cargada"),
    () => console.log("No se pudo cargar lupita.png")
  );

  handPose = ml5.handPose();
}

function setup() {

  createCanvas(windowWidth, windowHeight);

  lupaX = width / 2;
  lupaY = height / 2;

  ultimaX = lupaX;
  ultimaY = lupaY;

  recomputeDifferences();

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);
}

function recomputeDifferences() {

  let sx = width / BASE_W;
  let sy = height / BASE_H;

  let sAvg = (sx + sy) / 2;

  diferencias = baseDifferences.map(d => ({
    x: d.x * sx,
    y: d.y * sy,
    radio: d.radio * sAvg,
    encontrada: d.encontrada
  }));
}

function windowResized() {

  resizeCanvas(windowWidth, windowHeight);

  recomputeDifferences();

  lupaX = constrain(lupaX, 0, width);
  lupaY = constrain(lupaY, 0, height);
}

function drawBackgroundCover(img) {

  if (!img) return;

  let scale = min(
    width / img.width,
    height / img.height
  );

  let w = img.width * scale;
  let h = img.height * scale;

  let x = (width - w) / 2;
  let y = (height - h) / 2;

  image(img, x, y, w, h);
}

function draw() {

  background(240);

  if (fondoImg) {
    drawBackgroundCover(fondoImg);
  }

  controlarLupa();

  verificarDiferencia();

  for (let d of diferencias) {

    if (d.encontrada) {

      noFill();
      stroke( "#e3757d" );
      strokeWeight(7);

      circle( 
        d.x,
        d.y,
        d.radio * 2
      );

      circle(
        d.x + width /3,
        d.y,
        d.radio * 2
      );
    }
  }

  dibujarLupa();

  // Mostrar mensaje de depuración (útil para verificar keypoints detectados)
  push();
  textSize(14);
  fill(255);
  stroke(0);
  strokeWeight(2);
  textAlign(LEFT, BOTTOM);
  text(debugMsg, 10, height - 10);
  pop();

  mostrarEstado();
}

function controlarLupa() {

  if (hands.length == 0) return;

  let hand = hands[0];

  let tip = hand.keypoints.find(p => p.name === 'index_finger_tip');
  let mcp = hand.keypoints.find(p => p.name === 'index_finger_mcp');

  if (!tip || !mcp) return;

  let dx = tip.x - mcp.x;
  let dy = tip.y - mcp.y;

  contadorFrames++;

  if (contadorFrames > framesThreshold) {

    if (abs(dx) > abs(dy)) {
      if (dx > movementThreshold) {
        lupaX += velocidad;
      }
      if (dx < -movementThreshold) {
        lupaX -= velocidad;
      }
    } else {
      if (dy < -movementThreshold) {
        lupaY -= velocidad;
      }
      if (dy > movementThreshold) {
        lupaY += velocidad;
      }
    }

    contadorFrames = 0;
  }

  lupaX = constrain(lupaX, 0, width);
  lupaY = constrain(lupaY, 0, height);
}

function verificarDiferencia() {

  let distanciaMovimiento =
    dist(
      lupaX,
      lupaY,
      ultimaX,
      ultimaY
    );

  if (distanciaMovimiento < 2) {
    tiempoQuieto++;
  } else {
    tiempoQuieto = 0;
  }

  ultimaX = lupaX;
  ultimaY = lupaY;

  if (tiempoQuieto > 60) {

    for (let d of diferencias) {

      if (!d.encontrada) {

        let distancia =
          dist(
            lupaX,
            lupaY,
            d.x,
            d.y
          );

        if (distancia < d.radio) {

          d.encontrada = true;
          tiempoQuieto = 0;
        }
      }
    }
  }
}

function dibujarLupa() {

  if (lupaImg) {

    imageMode(CENTER);

    image(
      lupaImg,
      lupaX,
      lupaY,
      100,
      100
    );

    imageMode(CORNER);

    return;
  }

  push();

  translate(lupaX, lupaY);

  stroke(60);
  strokeWeight(5);
  fill(255);

  ellipse(0, 0, 72);

  line(18, 18, 40, 40);

  pop();
}

function mostrarEstado() {

  let encontradas =
    diferencias.filter(
      d => d.encontrada
    ).length;

 fill(255); // blanco
noStroke();

textAlign(CENTER, TOP);

textSize(34);

// Cambia la tipografía
textFont("Simply Olive DEMO.ttf");

text(
  "Diferencias encontradas: " +
  encontradas +
  "/" +
  diferencias.length,
  width / 2,
  18
);

  if (encontradas === diferencias.length) {

    textAlign(CENTER);

    fill( "#5c3f21");
    textSize(70);
    stroke( "#ffffff")
    

    text(
      "¡FELICIDADES!",
      width / 2,
      height / 2
    );

    textSize(30);

    text(
      "Encontraste las 10 diferencias",
      width / 2,
      height / 2.5 + 50
    );
  }
}

function gotHands(results) {
  hands = results;
}