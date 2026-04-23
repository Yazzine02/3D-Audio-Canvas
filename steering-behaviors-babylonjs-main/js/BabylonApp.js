// BabylonApp is the singleton application manager for the Babylon scene.
// It initializes the scene, manages vehicles, target control, jump physics,
// debug rendering, and integrates with the GUI singleton.
class BabylonApp {
  static instance = null;

  static getInstance() {
    if (!BabylonApp.instance) {
      BabylonApp.instance = new BabylonApp();
    }
    return BabylonApp.instance;
  }

  GROUND_WIDTH = 100;
  GROUND_HEIGHT = 100;
  BEHAVIORS = [
    "Seek",
    "Flee",
    "Arrive",
    "Pursue",
    "Evade",
    "Wander",
    "Avoid",
    "Align",
    "Separation",
    "Cohesion",
  ];
  RENDER_DEBUG = true;

  constructor() {
    if (BabylonApp.instance) {
      return BabylonApp.instance;
    }
    BabylonApp.instance = this;
  }

  // Build main Babylon scene, set up camera, lights, physics, and GUI.
  createScene(engine, canvas) {
    const scene = new BABYLON.Scene(engine);

    // Setup babylon environment
    this.camera = this.createCamera(scene, canvas);
    this.light = this.createLight(scene);
    this.ground = this.createGround(scene);
    this.groundHeight = this.GROUND_HEIGHT;

    // Setup target
    this.targetPos = new BABYLON.Vector3(10, 0, 10);
    this.targetMesh = this.createTargetIndicator(scene, this.targetPos);
    this.targetVehicle = new SteeringVehicle(this.targetMesh);
    this.targetVehicle.maxSpeed = 75.0;
    this.targetVehicle.maxForce = 200.0;

    // Init obstacles
    this.obstacles = this.createObstacles(scene, 10);

    // Create vehicles and init shared behavior weights
    this.behaviorWeights = {};
    this.vehicles = this.createVehicles(scene, this.behaviorWeights);

    // Init target control
    this.gazePos = new BABYLON.Vector3(10, 0, 10);
    this.lastTargetPos = this.targetPos.clone();
    this.targetVelocity = new BABYLON.Vector3(0, 0, 0);

    scene.onPointerMove = this.createPointerMoveHandler(scene, this.gazePos);
    window.moveTargetToMapPos = this.moveTargetToMapPos.bind(this); // bind to keep instance context
    window.createVehicleMesh = this.createVehicleMesh.bind(this);
    // Whether to render debug drawing or not (force vectors, radius, etc)
    window.renderDebug = this.RENDER_DEBUG;
    this.renderDebug = window.renderDebug;

    // Create GUI with behaviors controls
    this.createGui(scene, this.vehicles, this.behaviorWeights);

    // Setup jump (y axis) elevation using space key (jump physics or elevation control)
    this.setupJumpControls();

    // Main update loop for the scene
    this.setupSceneUpdate(scene);

    return scene;
  }

  // Create the camera used to view the scene
  createCamera(scene, canvas) {
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 3,
      150,
      BABYLON.Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 20;
    camera.upperRadiusLimit = 120;
    camera.wheelPrecision = 50;
    return camera;
  }

  // Create a simple hemispheric light for scene illumination
  createLight(scene) {
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0),
      scene,
    );
    light.intensity = 0.7;
    return light;
  }

  // Create the ground mesh used as the main floor plane
  createGround(scene) {
    const ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: this.GROUND_WIDTH, height: this.GROUND_HEIGHT },
      scene,
    );
    const groundMat = new BABYLON.StandardMaterial("gMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.15, 0.15, 0.15);
    ground.material = groundMat;
    return ground;
  }

  // Create the red target indicator mesh used as the seek target
  createTargetIndicator(scene, position) {
    const targetMesh = BABYLON.MeshBuilder.CreateSphere(
      "target",
      { diameter: 2 },
      scene,
    );
    const targetMat = new BABYLON.StandardMaterial("tMat", scene);
    targetMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
    targetMesh.material = targetMat;
    targetMesh.position = position.clone();
    return targetMesh;
  }

  // Create a set of static obstacle meshes for avoid behavior
  createObstacles(scene, count) {
    const obstacles = [];
    const obstacleMat = new BABYLON.StandardMaterial("obsMat", scene);
    obstacleMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2);

    for (let i = 0; i < count; i++) {
      const obsParams = { height: 4, diameter: 4 };
      const obs = BABYLON.MeshBuilder.CreateCylinder(
        "obs" + i,
        obsParams,
        scene,
      );
      obs.material = obstacleMat;
      const rx = (Math.random() - 0.5) * 80;
      const rz = (Math.random() - 0.5) * 80;
      obs.position = new BABYLON.Vector3(rx, 2, rz);
      obs.radius = obsParams.diameter / 2;
      obstacles.push(obs);
    }

    return obstacles;
  }

  // Init the initial fleet of steering vehicles
  createVehicles(scene, behaviorWeights) {
    const vehicles = [];
    const NUM_VEHICLES = 1;

    for (let i = 0; i < NUM_VEHICLES; i++) {
      const vehicle = this.createVehicleMesh(scene, behaviorWeights);
      vehicles.push(vehicle);
    }

    return vehicles;
  }

  // Create or retrieve the singleton GUI instance for this scene
  createGui(scene, vehicles, behaviorWeights) {
    this.gui = BabylonGUI.getInstance(scene, vehicles, behaviorWeights);
  }

  // Create pointer move handler for mouse-based gaze control
  createPointerMoveHandler(scene, gazePos) {
    const boundLimitX = this.GROUND_WIDTH / 2;
    const boundLimitZ = this.GROUND_HEIGHT / 2;
    // Pointer Move handler to update target position based on mouse movement (when in mouse control mode)
    return () => {
      if (window.controlMode === "mouse") {
        // Keep the gaze target inside the ground boundaries
        const pickingInfo = scene.pick(scene.pointerX, scene.pointerY);
        if (
          pickingInfo &&
          pickingInfo.hit &&
          pickingInfo.pickedMesh &&
          pickingInfo.pickedMesh.name === "ground"
        ) {
          gazePos.x = Math.max(
            -boundLimitX,
            Math.min(boundLimitX, pickingInfo.pickedPoint.x),
          );
          gazePos.z = Math.max(
            -boundLimitZ,
            Math.min(boundLimitZ, pickingInfo.pickedPoint.z),
          );
        }
      }
    };
  }

  // Convert normalized gaze input into ground-plane world coordinates
  moveTargetToMapPos(gazeX, gazeY) {
    const mappedX = gazeX * (this.GROUND_WIDTH / 2);
    const mappedZ = gazeY * (this.GROUND_HEIGHT / 2);

    this.gazePos.x = mappedX;
    this.gazePos.z = mappedZ;
  }

  // Setup keyboard listeners for jump behavior and local jump state
  setupJumpControls() {
    const jumpState = {
      spacePressed: false,
      jumpVelocity: 0,
    };

    // Spacebar Keyboard down listener to begin jump input
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        jumpState.spacePressed = true;
        if (window.physicJump && !e.repeat && this.gazePos.y <= 0.1) {
          jumpState.jumpVelocity = 75;
        }
      }
    });

    // Spacebar Keyboard up listener to stop jump input
    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        jumpState.spacePressed = false;
      }
    });

    this.getJumpState = () => jumpState;
    this.setJumpVelocity = (value) => {
      jumpState.jumpVelocity = value;
    };
    this.resetJumpVelocity = () => {
      jumpState.jumpVelocity = 0;
    };
  }

  // Set up the main update loop that runs before each frame render
  setupSceneUpdate(scene) {
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(scene.getEngine().getDeltaTime() / 1000.0, 0.1);
      const jumpState = this.getJumpState();
      const shouldRenderDebug = window.renderDebug !== false;

      // Draw a debug sphere when debug rendering is enabled
      if (shouldRenderDebug) {
        this.createDebugSphere(scene, this.gazePos);
      }

      if (dt > 0) {
        // Apply jump physics or manual elevation based on mode
        if (window.physicJump) {
          jumpState.jumpVelocity -= 120 * dt;
          this.gazePos.y += jumpState.jumpVelocity * dt;

          if (this.gazePos.y < 0) {
            this.gazePos.y = 0;
            jumpState.jumpVelocity = 0;
          }
        } else {
          if (jumpState.spacePressed) {
            this.gazePos.y = Math.min(this.gazePos.y + 100 * dt, 40);
          } else {
            this.gazePos.y = Math.max(this.gazePos.y - 100 * dt, 0);
          }
          jumpState.jumpVelocity = 0;
        }

        this.targetVehicle.applyBehavior("Seek", { position: this.gazePos });
        this.targetVehicle.update(dt);
        this.targetVehicle.edges(this.GROUND_WIDTH, this.groundHeight);

        if (shouldRenderDebug) {
          // Draw debug information for the target vehicle
          this.targetVehicle.drawComplexBehaviorDebug({
            position: this.gazePos,
            obstacles: this.obstacles,
          });
        }

        this.targetPos.copyFrom(this.targetVehicle.position);
        this.targetVelocity.copyFrom(this.targetVehicle.velocity);
      }

      // Prepare data for boid/flocking behavior on each vehicle
      const targetData = {
        position: this.targetPos,
        velocity: this.targetVelocity,
        obstacles: this.obstacles,
        boids: this.vehicles,
      };

      for (const v of this.vehicles) {
        v.behaviorManager.flock(targetData.boids, {
          x: -this.GROUND_WIDTH / 2,
          y: -this.groundHeight / 2,
          width: this.GROUND_WIDTH,
          height: this.groundHeight,
          distance: 10,
        });

        v.applyComplexBehaviors(targetData);
        v.update(dt);
        v.edges(this.GROUND_WIDTH, this.groundHeight);

        if (shouldRenderDebug) {
          v.drawComplexBehaviorDebug(targetData);
        }
      }
    });
  }

  // Create a small debug sphere at the gaze position each frame
  createDebugSphere(scene, gazePos) {
    const debugSphere = BABYLON.MeshBuilder.CreateSphere(
      "debugSphere",
      { diameter: 1 },
      scene,
    );
    const debugMat = new BABYLON.StandardMaterial("dMat", scene);
    debugMat.emissiveColor = new BABYLON.Color3(0, 1, 0);
    debugSphere.material = debugMat;
    debugSphere.position = gazePos.clone();
    setTimeout(() => {
      if (debugSphere && !debugSphere.isDisposed()) {
        debugSphere.dispose();
      }
    }, 100);
  }

  // Build and init a new vehicle with the shared behavior weights
  createVehicleMesh(scene, behaviorWeights) {
    const vehicleRootMesh = new BABYLON.TransformNode("vehicleRootMesh", scene);

    // Create a hidden capsule parent node for the imported model
    const capsule = BABYLON.MeshBuilder.CreateCapsule(
      "capsule",
      { height: 2, radius: 0.5 },
      scene,
    );
    capsule.rotation.x = Math.PI / 2;
    capsule.parent = vehicleRootMesh;
    capsule.isVisible = false;

    BABYLON.SceneLoader.ImportMesh(
      "",
      "./assets/",
      "aedes.glb",
      scene,
      function (meshes, particleSystems, skeletons, animationGroups) {
        const model = meshes[0];
        model.scaling = new BABYLON.Vector3(1, 1, 1);
        model.rotate(BABYLON.Axis.X, 90, BABYLON.Space.LOCAL);
        model.rotate(BABYLON.Axis.Y, 135, BABYLON.Space.LOCAL);
        model.rotate(BABYLON.Axis.Z, 0, BABYLON.Space.LOCAL);
        model.parent = capsule;

        if (animationGroups && animationGroups.length > 0) {
          animationGroups.forEach((a) => a.stop());
          const flyAnim = animationGroups.find((a) =>
            a.name.toLowerCase().includes("fly"),
          );
          if (flyAnim) {
            flyAnim.play(true);
          } else {
            animationGroups[0].play(true);
          }
        }
      },
    );

    const v = new SteeringVehicle(vehicleRootMesh);
    v.perceptionRadius = 15;
    v.alignWeight = 1.0;
    v.cohesionWeight = 1.0;
    v.separationWeight = 1.5;
    v.boundariesWeight = 1.0;
    v.boundariesX = -50;
    v.boundariesY = -50;
    v.boundariesWidth = 100;
    v.boundariesHeight = 100;
    v.boundariesDistance = 10;

    if (behaviorWeights) {
      for (const [behavior, weight] of Object.entries(behaviorWeights)) {
        if (weight > 0) {
          v.behaviorManager.setBehaviorWeight(behavior, weight);
        }
      }
    }

    return v;
  }
}

const babylonApp = BabylonApp.getInstance();
window.BabylonApp = babylonApp;

window.onCalibrationDone = function () {
  const canvas = document.getElementById("renderCanvas");
  canvas.style.opacity = 1;
  const engine = new BABYLON.Engine(canvas, true);
  const scene = babylonApp.createScene(engine, canvas);
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
};
