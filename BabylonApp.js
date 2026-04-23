// --- AUDIO ROUTING STATE ---
const availableParams = {
  "AmplifierAttack": { min: 0, max: 100, label: "Amp Attack" },
  "Release": { min: 0, max: 1, label: "Global Release (Toggle)" },
  "Velocity": { min: 0, max: 1, label: "Velocity Sens" },
  "Repeat": { min: 0, max: 1, label: "Arp Repeat" },
  "Drone": { min: 0, max: 1, label: "Infinite Drone" },
  "FilterCutoff": { min: 10, max: 100, label: "Filter Cutoff" },
  "FilterResonance": { min: 0, max: 90, label: "Filter Resonance" },
  "OscAFreq": { min: 10, max: 90, label: "Oscillator A Pitch" },
  "MasterVolume": { min: 0, max: 1, label: "Output Volume" } 
};

let routeX = [];
let routeY = [];

// --- DYNAMIC UI BUILDER ---
function buildRoutingUI() {
  const routingContainer = document.getElementById("routing-container");
  for (let paramId in availableParams) {
      let paramData = availableParams[paramId];
      let row = document.createElement("div"); row.className = "route-row";
      let label = document.createElement("div"); label.className = "route-label"; label.innerText = paramData.label;
      let btnGroup = document.createElement("div"); btnGroup.className = "route-btns";
      
      let btnX = document.createElement("button"); btnX.className = "btn-axis"; btnX.innerText = "X";
      btnX.onclick = () => toggleRoute('X', paramId, btnX);
      
      let btnY = document.createElement("button"); btnY.className = "btn-axis"; btnY.innerText = "Y";
      btnY.onclick = () => toggleRoute('Y', paramId, btnY);
      
      btnGroup.appendChild(btnX); btnGroup.appendChild(btnY);
      row.appendChild(label); row.appendChild(btnGroup); routingContainer.appendChild(row);
  }
}

function toggleRoute(axis, paramId, btnElement) {
  let targetArray = axis === 'X' ? routeX : routeY;
  let activeClass = axis === 'X' ? 'active-x' : 'active-y';
  let index = targetArray.indexOf(paramId);
  if (index > -1) {
      targetArray.splice(index, 1);
      btnElement.classList.remove(activeClass);
  } else {
      targetArray.push(paramId);
      btnElement.classList.add(activeClass);
  }
}

// --- BABYLON APP ---
class BabylonApp {
  static instance = null;

  static getInstance() {
    if (!BabylonApp.instance) BabylonApp.instance = new BabylonApp();
    return BabylonApp.instance;
  }

  GROUND_WIDTH = 100;
  GROUND_HEIGHT = 100;
  RENDER_DEBUG = true;

  constructor() {
    if (BabylonApp.instance) return BabylonApp.instance;
    BabylonApp.instance = this;
  }

  createScene(engine, canvas) {
    const scene = new BABYLON.Scene(engine);

    this.camera = this.createCamera(scene, canvas);
    this.light = this.createLight(scene);
    this.ground = this.createGround(scene);
    this.groundHeight = this.GROUND_HEIGHT;

    // Setup the main target playhead (The glowing ball)
    this.targetPos = new BABYLON.Vector3(0, 0, 0);
    this.targetMesh = this.createTargetIndicator(scene, this.targetPos);
    this.targetVehicle = new SteeringVehicle(this.targetMesh);
    this.targetVehicle.maxSpeed = 75.0;
    this.targetVehicle.maxForce = 200.0;

    this.obstacles = this.createObstacles(scene, 10);
    this.behaviorWeights = {};
    this.vehicles = this.createVehicles(scene, this.behaviorWeights);

    this.lastTargetPos = this.targetPos.clone();
    this.targetVelocity = new BABYLON.Vector3(0, 0, 0);

    // --- CLEAN MOUSE FOLLOWING LOGIC ---
    scene.onPointerMove = () => {
      const pickingInfo = scene.pick(scene.pointerX, scene.pointerY);
      if (pickingInfo && pickingInfo.hit && pickingInfo.pickedMesh && pickingInfo.pickedMesh.name === "ground") {
        // Confine the target to the exact bounds of the 100x100 floor
        this.targetPos.x = BABYLON.Scalar.Clamp(pickingInfo.pickedPoint.x, -this.GROUND_WIDTH / 2, this.GROUND_WIDTH / 2);
        this.targetPos.z = BABYLON.Scalar.Clamp(pickingInfo.pickedPoint.z, -this.GROUND_HEIGHT / 2, this.GROUND_HEIGHT / 2);
      }
    };

    window.createVehicleMesh = this.createVehicleMesh.bind(this);
    window.renderDebug = this.RENDER_DEBUG;
    this.renderDebug = window.renderDebug;

    this.createGui(scene, this.vehicles, this.behaviorWeights);
    this.setupSceneUpdate(scene);

    return scene;
  }

  createCamera(scene, canvas) {
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 150, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 20;
    camera.upperRadiusLimit = 120;
    camera.wheelPrecision = 50;
    return camera;
  }

  createLight(scene) {
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    return light;
  }

  createGround(scene) {
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: this.GROUND_WIDTH, height: this.GROUND_HEIGHT }, scene);
    
    // Apply the Grid Material to the massive floor
    const gridMat = new BABYLON.GridMaterial("gridMat", scene);
    gridMat.majorUnitFrequency = 10;
    gridMat.minorUnitVisibility = 0.5;
    gridMat.gridRatio = 1.0; 
    gridMat.mainColor = new BABYLON.Color3(0.0, 1.0, 0.8); 
    gridMat.lineColor = new BABYLON.Color3(0.0, 0.3, 0.3); 
    gridMat.backFaceCulling = false;
    ground.material = gridMat;
    
    return ground;
  }

  createTargetIndicator(scene, position) {
    const targetMesh = BABYLON.MeshBuilder.CreateSphere("target", { diameter: 3 }, scene);
    const targetMat = new BABYLON.StandardMaterial("tMat", scene);
    targetMat.emissiveColor = new BABYLON.Color3(1, 0, 0.5); // Hot Pink Playhead
    targetMesh.material = targetMat;
    targetMesh.position = position.clone();
    return targetMesh;
  }

  createObstacles(scene, count) {
    const obstacles = [];
    const obstacleMat = new BABYLON.StandardMaterial("obsMat", scene);
    obstacleMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);
    for (let i = 0; i < count; i++) {
      const obsParams = { height: 4, diameter: 4 };
      const obs = BABYLON.MeshBuilder.CreateCylinder("obs" + i, obsParams, scene);
      obs.material = obstacleMat;
      const rx = (Math.random() - 0.5) * 80;
      const rz = (Math.random() - 0.5) * 80;
      obs.position = new BABYLON.Vector3(rx, 2, rz);
      obs.radius = obsParams.diameter / 2;
      obstacles.push(obs);
    }
    return obstacles;
  }

  createVehicles(scene, behaviorWeights) {
    const vehicles = [];
    for (let i = 0; i < 1; i++) {
      vehicles.push(this.createVehicleMesh(scene, behaviorWeights));
    }
    return vehicles;
  }

  createGui(scene, vehicles, behaviorWeights) {
    this.gui = BabylonGUI.getInstance(scene, vehicles, behaviorWeights);
  }

  setupSceneUpdate(scene) {
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime() / 1000.0, 0.1);
      const shouldRenderDebug = window.renderDebug !== false;

      if (dt > 0) {
        this.targetVehicle.applyBehavior("Seek", { position: this.targetPos });
        this.targetVehicle.update(dt);
        this.targetVehicle.edges(this.GROUND_WIDTH, this.groundHeight);
        this.targetPos.copyFrom(this.targetVehicle.position);
        this.targetVelocity.copyFrom(this.targetVehicle.velocity);
      }

      // --- THE AUDIO MATRIX ROUTER LOGIC ---
      if (window.audioReady && typeof synthInstance !== 'undefined' && typeof ampNode !== 'undefined') {
        
        // Normalize floor coordinates (-50 to 50) into (0.0 to 1.0)
        let normX = BABYLON.Scalar.Clamp((this.targetPos.x + (this.GROUND_WIDTH / 2)) / this.GROUND_WIDTH, 0, 1);
        let normY = BABYLON.Scalar.Clamp((this.targetPos.z + (this.GROUND_HEIGHT / 2)) / this.GROUND_HEIGHT, 0, 1);

        document.getElementById("overlay-data").innerText = `X: ${normX.toFixed(2)} | Y: ${normY.toFixed(2)}`;

        // Map active X parameters
        routeX.forEach(paramId => {
            let pData = availableParams[paramId];
            let mappedValue = pData.min + normX * (pData.max - pData.min);
            if (paramId === "MasterVolume") {
                ampNode.gain.setTargetAtTime(mappedValue, audioContext.currentTime, 0.01);
            } else {
                synthInstance.audioNode.setParameterValues({ [paramId]: { value: mappedValue } });
            }
        });

        // Map active Y parameters
        routeY.forEach(paramId => {
            let pData = availableParams[paramId];
            let mappedValue = pData.min + normY * (pData.max - pData.min);
            if (paramId === "MasterVolume") {
                ampNode.gain.setTargetAtTime(mappedValue, audioContext.currentTime, 0.01);
            } else {
                synthInstance.audioNode.setParameterValues({ [paramId]: { value: mappedValue } });
            }
        });
      }

      const targetData = {
        position: this.targetPos,
        velocity: this.targetVelocity,
        obstacles: this.obstacles,
        boids: this.vehicles,
      };

      for (const v of this.vehicles) {
        v.behaviorManager.flock(targetData.boids, {
          x: -this.GROUND_WIDTH / 2, y: -this.groundHeight / 2,
          width: this.GROUND_WIDTH, height: this.groundHeight, distance: 10,
        });

        v.applyComplexBehaviors(targetData);
        v.update(dt);
        v.edges(this.GROUND_WIDTH, this.groundHeight);

        if (shouldRenderDebug) v.drawComplexBehaviorDebug(targetData);
      }
    });
  }

  createVehicleMesh(scene, behaviorWeights) {
    const vehicleRootMesh = new BABYLON.TransformNode("vehicleRootMesh", scene);
    const capsule = BABYLON.MeshBuilder.CreateCapsule("capsule", { height: 2, radius: 0.5 }, scene);
    capsule.rotation.x = Math.PI / 2;
    capsule.parent = vehicleRootMesh;
    capsule.isVisible = false;

    BABYLON.SceneLoader.ImportMesh("", "./assets/", "aedes.glb", scene, function (meshes, particleSystems, skeletons, animationGroups) {
        const model = meshes[0];
        model.scaling = new BABYLON.Vector3(1, 1, 1);
        model.rotate(BABYLON.Axis.X, 90, BABYLON.Space.LOCAL);
        model.rotate(BABYLON.Axis.Y, 135, BABYLON.Space.LOCAL);
        model.parent = capsule;
        if (animationGroups && animationGroups.length > 0) animationGroups[0].play(true);
    });

    const v = new SteeringVehicle(vehicleRootMesh);
    v.perceptionRadius = 15; v.alignWeight = 1.0; v.cohesionWeight = 1.0; v.separationWeight = 1.5; v.boundariesWeight = 1.0;
    v.boundariesX = -50; v.boundariesY = -50; v.boundariesWidth = 100; v.boundariesHeight = 100; v.boundariesDistance = 10;

    if (behaviorWeights) {
      for (const [behavior, weight] of Object.entries(behaviorWeights)) {
        if (weight > 0) v.behaviorManager.setBehaviorWeight(behavior, weight);
      }
    }
    return v;
  }
}

// --- SYSTEM INITIALIZATION ---
window.audioReady = false;
buildRoutingUI(); 

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const babylonApp = BabylonApp.getInstance();
const scene = babylonApp.createScene(engine, canvas);

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

// Start Audio Engine
document.getElementById("start-btn").addEventListener("click", async () => {
    document.getElementById("start-btn").style.display = "none";
    document.getElementById("synth-controls").style.display = "flex";
    
    if (audioContext.state !== 'running') await audioContext.resume();
    await initAudioEngine();
    window.audioReady = true;

    // Trigger the continuous drone!
    playNote();
});