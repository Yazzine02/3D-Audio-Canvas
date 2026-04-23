// EyeTrackingClass is a singleton that manages camera input, calibration, and gaze mapping
// IT uses p5.js combined with ml5.js FaceMesh to track facial landmarks and derive gaze direction,
// which is then mapped to screen coordinates for controlling the Babylon.js scene.
class EyeTracking {
  static instance = null;

  // Get singleton instance of EyeTrackingClass
  static getInstance() {
    if (!EyeTracking.instance) {
      EyeTracking.instance = new EyeTracking();
    }
    return EyeTracking.instance;
  }

  video = null;
  faceMesh = null;
  detections = [];
  lookHistory = [];
  isCalibrating = true;
  hasStartedCalibration = false;
  calibState = 0;
  moveStartTime = 0;
  tempSamples = [];
  STABLE_THRESHOLD = 0.05;
  REQUIRED_SAMPLES = 60;
  MOVE_DURATION = 1000;
  calibrationPointsHistory = {
    CENTER: [],
    "TOP-LEFT": [],
    "TOP-RIGHT": [],
    "BOTTOM-RIGHT": [],
    "BOTTOM-LEFT": [],
  };
  minEyeX = 1.0;
  maxEyeX = 0.0;
  minEyeY = 1.0;
  maxEyeY = 0.0;
  minHeadX = 1.0;
  maxHeadX = 0.0;
  minHeadY = 1.0;
  maxHeadY = 0.0;
  smoothedX = 0;
  smoothedY = 0;
  isFirstFrame = true;
  isModelReady = false;
  isLoadingModel = false;
  shouldStartHeadDetection = false;
  buttonHead = null;
  buttonMouse = null;
  loaderElement = null;
  options = { maxFaces: 1, refineLandmarks: true, flipHorizontal: false };

  constructor() {
    if (EyeTracking.instance) {
      return EyeTracking.instance;
    }
    EyeTracking.instance = this;
  }

  // Prepare UI and hidden video capture before user interaction
  preload() {
    // No model initialization here; setup will create the hidden video so the model can load cleanly.
  }

  // Initialize canvas, controls, and start loading ml5
  setup() {
    createCanvas(windowWidth, windowHeight);
    window.controlMode = null;
    window.renderDebug = true;

    this.buttonHead = document.getElementById("btnHead");
    this.buttonMouse = document.getElementById("btnMouse");
    this.loaderElement = document.getElementById("loaderMessage");

    this.setLoaderText("");

    this.buttonHead.addEventListener("click", () => {
      window.controlMode = "head";
      document.getElementById("startScreen").style.display = "none";
      clear();
      this.startHeadTracking();
    });

    // Mouse mode skips calibration and starts the app immediately
    this.buttonMouse.addEventListener("click", () => {
      window.controlMode = "mouse";
      document.getElementById("startScreen").style.display = "none";
      this.isCalibrating = false;
      clear();
      if (typeof window.onCalibrationDone === "function") {
        window.onCalibrationDone();
      }
    });
  }

  setButtonsVisible(show) {
    const displayValue = show ? "inline-block" : "none";
    if (this.buttonHead) this.buttonHead.style.display = displayValue;
    if (this.buttonMouse) this.buttonMouse.style.display = displayValue;
  }

  setLoaderText(txt) {
    if (this.loaderElement) {
      this.loaderElement.innerText = txt;
      this.loaderElement.style.display = txt ? "block" : "none";
    }
  }

  startHeadTracking() {
    if (this.isModelReady && this.faceMesh) {
      this.faceMesh.detectStart(this.video, this.gotResults.bind(this)); // bind so we keep instance context
      return;
    }

    if (this.isLoadingModel) return;

    this.isLoadingModel = true;
    this.shouldStartHeadDetection = true;
    this.setLoaderText("Loading ml5 models...");

    this.video = createCapture(VIDEO);
    this.video.size(640, 480);
    this.video.hide();

    this.faceMesh = ml5.faceMesh(
      this.video,
      this.options,
      this.onModelReady.bind(this), // bind to keep instance context
    );
  }

  onModelReady() {
    if (this.isModelReady) return;
    this.isModelReady = true;
    this.isLoadingModel = false;
    this.setLoaderText("");

    if (this.shouldStartHeadDetection && this.faceMesh) {
      this.faceMesh.detectStart(this.video, this.gotResults.bind(this));
    }
  }

  // Store latest face tracking detections
  gotResults(results) {
    this.detections = results;
  }

  // Main render loop, switching between calibration and heatmap modes
  draw() {
    if (window.controlMode !== "head") {
      clear();
      return;
    }

    if (this.isCalibrating) {
      background(15);
      this.runAcquireCalibration();
    } else {
      clear();
      this.runHeatmap();
    }

    // Draw debug gaze values during calibration
    if (this.detections.length > 0 && this.isCalibrating) {
      const data = this.getGazeData(this.detections[0]);
      fill(255);
      noStroke();
      textSize(16);
      textAlign(LEFT, TOP);
      text(
        `Eye X: ${data.eyeX.toFixed(3)} | Head X: ${data.headX.toFixed(3)}`,
        10,
        10,
      );
      text(
        `Eye Y: ${data.eyeY.toFixed(3)} | Head Y: ${data.headY.toFixed(3)}`,
        10,
        30,
      );
    }
  }

  levelPoint(p, center, angle) {
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const px = p.x - center.x;
    const py = p.y - center.y;
    return {
      x: px * c - py * s + center.x,
      y: px * s + py * c + center.y,
    };
  }

  // Compute gaze ratios from detected eye and face landmarks
  getGazeData(face) {
    const globalLeftEye = face.keypoints[33];
    const globalRightEye = face.keypoints[263];

    // Compute roll angle of the face to normalize eye coordinate space
    const rollAngle = Math.atan2(
      globalRightEye.y - globalLeftEye.y,
      globalRightEye.x - globalLeftEye.x,
    );

    const lCenter = face.keypoints[468];
    const lPupil = this.levelPoint(face.keypoints[468], lCenter, -rollAngle);
    const lInner = this.levelPoint(face.keypoints[133], lCenter, -rollAngle);
    const lOuter = this.levelPoint(face.keypoints[33], lCenter, -rollAngle);
    const lTop = this.levelPoint(face.keypoints[159], lCenter, -rollAngle);
    const lBot = this.levelPoint(face.keypoints[145], lCenter, -rollAngle);

    // Normalize left pupil position inside left eye bounds
    const leftRatioX =
      Math.abs(lPupil.x - lOuter.x) / Math.abs(lInner.x - lOuter.x);
    const leftRatioY = Math.abs(lPupil.y - lTop.y) / Math.abs(lBot.y - lTop.y);

    const rCenter = face.keypoints[473];
    const rPupil = this.levelPoint(face.keypoints[473], rCenter, -rollAngle);
    const rInner = this.levelPoint(face.keypoints[362], rCenter, -rollAngle);
    const rOuter = this.levelPoint(face.keypoints[263], rCenter, -rollAngle);
    const rTop = this.levelPoint(face.keypoints[386], rCenter, -rollAngle);
    const rBot = this.levelPoint(face.keypoints[374], rCenter, -rollAngle);

    // Normalize right pupil position inside right eye bounds
    const rightRatioX =
      Math.abs(rPupil.x - rOuter.x) / Math.abs(rInner.x - rOuter.x);
    const rightRatioY = Math.abs(rPupil.y - rTop.y) / Math.abs(rBot.y - rTop.y);

    const avgEyeX = (leftRatioX + rightRatioX) / 2;
    const avgEyeY = (leftRatioY + rightRatioY) / 2;

    const noseCenter = face.keypoints[1];
    const nose = this.levelPoint(face.keypoints[1], noseCenter, -rollAngle);
    const cheekL = this.levelPoint(face.keypoints[234], noseCenter, -rollAngle);
    const cheekR = this.levelPoint(face.keypoints[454], noseCenter, -rollAngle);
    const headTop = this.levelPoint(face.keypoints[10], noseCenter, -rollAngle);
    const chin = this.levelPoint(face.keypoints[152], noseCenter, -rollAngle);

    // Derive head rotation ratios from face geometry
    const headYaw = Math.abs(nose.x - cheekL.x) / Math.abs(cheekR.x - cheekL.x);
    const headPitch =
      Math.abs(nose.y - headTop.y) / Math.abs(chin.y - headTop.y);

    return {
      eyeX: avgEyeX,
      eyeY: avgEyeY,
      headX: headYaw,
      headY: headPitch,
    };
  }

  // Gather calibration samples and move through calibration points
  runAcquireCalibration() {
    if (!this.hasStartedCalibration && this.detections.length > 0) {
      this.hasStartedCalibration = true;
      this.calibState = 0;
    }

    // Wait for first valid detection before starting calibration flow
    if (!this.hasStartedCalibration) {
      this.drawLoadingIndicator(width / 2, height / 2, "Starting Camera...");
      return;
    }

    const data = this.getGazeData(this.detections[0]);

    const points = [
      { x: width / 2, y: height / 2, id: "CENTER" },
      { x: 50, y: 50, id: "TOP-LEFT" },
      { x: width - 50, y: 50, id: "TOP-RIGHT" },
      { x: width - 50, y: height - 50, id: "BOTTOM-RIGHT" },
      { x: 50, y: height - 50, id: "BOTTOM-LEFT" },
    ];

    let currentX;
    let currentY;
    let msg;
    const isHolding = this.calibState % 2 === 0;
    const targetIndex = Math.floor(this.calibState / 2);

    if (this.calibState >= points.length * 2 - 1) {
      this.isCalibrating = false;
      this.setupScreenRatio();
      if (typeof window.onCalibrationDone === "function") {
        window.onCalibrationDone();
      }
      return;
    }

    if (isHolding) {
      currentX = points[targetIndex].x;
      currentY = points[targetIndex].y;
      msg = "Look & Hold...";

      // Collect stable gaze samples while the user holds gaze on the target
      if (!isNaN(data.eyeX) && !isNaN(data.eyeY)) {
        this.tempSamples.push(data);
        if (this.tempSamples.length > this.REQUIRED_SAMPLES) {
          this.tempSamples.shift();
        }
      }

      if (this.tempSamples.length === this.REQUIRED_SAMPLES) {
        const xs = this.tempSamples.map((s) => s.eyeX);
        const ys = this.tempSamples.map((s) => s.eyeY);
        const rangeX = Math.max(...xs) - Math.min(...xs);
        const rangeY = Math.max(...ys) - Math.min(...ys);

        // Check for stable gaze before accepting calibration point

        if (rangeX < this.STABLE_THRESHOLD && rangeY < this.STABLE_THRESHOLD) {
          this.calibrationPointsHistory[points[targetIndex].id].push(
            ...this.tempSamples,
          );
          this.tempSamples = [];
          this.calibState++;
          this.moveStartTime = millis();
        } else {
          msg = "Keep still...";
        }
      } else {
        msg = "Focusing...";
      }
    } else {
      const fromPt = points[targetIndex];
      const toPt = points[targetIndex + 1];
      const t = (millis() - this.moveStartTime) / this.MOVE_DURATION;

      // Move the calibration target smoothly between points

      if (t >= 1.0) {
        this.calibState++;
        this.tempSamples = [];
      } else {
        currentX = lerp(fromPt.x, toPt.x, t);
        currentY = lerp(fromPt.y, toPt.y, t);
        msg = "Follow...";
      }
    }

    this.drawLoadingIndicator(currentX, currentY, msg);
  }

  // Compute mean after trimming outliers
  getArrayMean(arr, prop) {
    if (arr.length === 0) return 0.5;
    const sorted = [...arr].sort((a, b) => a[prop] - b[prop]);
    const trimCount = Math.floor(sorted.length * 0.2);
    let trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    if (trimmed.length === 0) trimmed = sorted;

    return trimmed.reduce((acc, item) => acc + item[prop], 0) / trimmed.length;
  }

  // Convert calibration samples into screen mapping ratios
  setupScreenRatio() {
    const leftXs = [
      ...this.calibrationPointsHistory["TOP-LEFT"],
      ...this.calibrationPointsHistory["BOTTOM-LEFT"],
    ];
    const rightXs = [
      ...this.calibrationPointsHistory["TOP-RIGHT"],
      ...this.calibrationPointsHistory["BOTTOM-RIGHT"],
    ];
    const topYs = [
      ...this.calibrationPointsHistory["TOP-LEFT"],
      ...this.calibrationPointsHistory["TOP-RIGHT"],
    ];
    const bottomYs = [
      ...this.calibrationPointsHistory["BOTTOM-LEFT"],
      ...this.calibrationPointsHistory["BOTTOM-RIGHT"],
    ];

    this.minEyeX = this.getArrayMean(leftXs, "eyeX");
    this.maxEyeX = this.getArrayMean(rightXs, "eyeX");
    this.minEyeY = this.getArrayMean(topYs, "eyeY");
    this.maxEyeY = this.getArrayMean(bottomYs, "eyeY");

    // Save screen mapping ratios from calibration data

    this.minHeadX = this.getArrayMean(leftXs, "headX");
    this.maxHeadX = this.getArrayMean(rightXs, "headX");
    this.minHeadY = this.getArrayMean(topYs, "headY");
    this.maxHeadY = this.getArrayMean(bottomYs, "headY");

    if (Math.abs(this.maxHeadX - this.minHeadX) < 0.03) {
      this.minHeadX -= 0.05;
      this.maxHeadX += 0.05;
    }
    if (Math.abs(this.maxHeadY - this.minHeadY) < 0.03) {
      this.minHeadY -= 0.05;
      this.maxHeadY += 0.05;
    }
  }

  // Draw current calibration prompt and pulse indicator
  drawLoadingIndicator(x, y, txt) {
    noStroke();
    const pulse = sin(millis() * 0.005) * 10 + 20;
    fill(0, 255, 150, 150);
    circle(x, y, pulse + 10);
    fill(0, 255, 150);
    circle(x, y, 15);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    const textOffsetX = x > width / 2 ? -100 : 100;
    const textOffsetY = y > height / 2 ? -40 : 40;
    text(txt, x + textOffsetX, y + textOffsetY);
  }

  // Draw gaze heatmap and map gaze into normalized coordinates
  runHeatmap() {
    if (this.detections.length > 0) {
      const data = this.getGazeData(this.detections[0]);

      const screenEyeX = map(
        data.eyeX,
        this.minEyeX,
        this.maxEyeX,
        0,
        width,
        true,
      );
      const screenEyeY = map(
        data.eyeY,
        this.minEyeY,
        this.maxEyeY,
        0,
        height,
        true,
      );

      const screenHeadX = map(
        data.headX,
        this.minHeadX,
        this.maxHeadX,
        0,
        width,
        true,
      );
      const screenHeadY = map(
        data.headY,
        this.minHeadY,
        this.maxHeadY,
        0,
        height,
        true,
      );

      const targetX = screenEyeX * 0.15 + screenHeadX * 0.85;
      const targetY = screenEyeY * 0.15 + screenHeadY * 0.85;

      if (this.isFirstFrame) {
        this.smoothedX = targetX;
        this.smoothedY = targetY;
        this.isFirstFrame = false;
      }

      let distance = dist(this.smoothedX, this.smoothedY, targetX, targetY);
      let dynamicLerp = map(distance, 0, 150, 0.001, 0.4);
      dynamicLerp = constrain(dynamicLerp, 0.001, 0.5);

      // Smooth gaze movement so the target is stable and not jittery
      this.smoothedX = lerp(this.smoothedX, targetX, dynamicLerp);
      this.smoothedY = lerp(this.smoothedY, targetY, dynamicLerp);

      this.lookHistory.push({ x: this.smoothedX, y: this.smoothedY });
      if (this.lookHistory.length > 150) this.lookHistory.shift();
    }

    if (window.renderDebug !== false) {
      noStroke();
      for (let i = 0; i < this.lookHistory.length; i++) {
        const alpha = map(i, 0, this.lookHistory.length, 0, 80);
        fill(255, 50, 0, alpha);
        circle(this.lookHistory[i].x, this.lookHistory[i].y, 60);
      }
      fill(0, 255, 200);
      circle(this.smoothedX, this.smoothedY, 20);
    }

    if (
      typeof window.moveTargetToMapPos === "function" &&
      this.detections.length > 0
    ) {
      const gazeX = (this.smoothedX / width) * 2 - 1;
      const gazeY = -((this.smoothedY / height) * 2 - 1);
      // Send normalized gaze coordinates to BabylonApp target mapping
      window.moveTargetToMapPos(gazeX, gazeY);
    }
  }
}

const eyeTracking = EyeTracking.getInstance();
window.EyeTracking = eyeTracking;

function preload() {
  eyeTracking.preload();
}

function setup() {
  eyeTracking.setup();
}

function draw() {
  eyeTracking.draw();
}
