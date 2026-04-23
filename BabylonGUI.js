// BabylonGUI builds and manages the in-scene Babylon GUI overlay.
// It is implemented as a singleton so only one control panel exists for the whole application.
class BabylonGUI {
  static BEHAVIORS = [
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

  // Singleton instance
  static instance = null;

  // Returns the shared GUI instance, creating it on first access.
  static getInstance(scene, vehicles, behaviorWeights = {}) {
    if (!BabylonGUI.instance) {
      BabylonGUI.instance = new BabylonGUI(
        scene,
        vehicles,
        BabylonGUI.BEHAVIORS,
        behaviorWeights,
      );
    }
    return BabylonGUI.instance;
  }

  // Initialize the Babylon GUI controls and bind them to the vehicle state.
  constructor(
    scene,
    vehicles,
    behaviors = BabylonGUI.BEHAVIORS,
    behaviorWeights = {},
  ) {
    if (BabylonGUI.instance) {
      return BabylonGUI.instance;
    }

    BabylonGUI.instance = this;
    this.scene = scene;
    this.vehicles = vehicles;
    this.behaviorWeights = behaviorWeights;
    this.behaviors = behaviors;
    this.renderDebug = true;

    // Create fullscreen UI texture for Babylon GUI controls
    const advancedTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Main sidebar panel for all GUI controls
    const panel = new BABYLON.GUI.StackPanel();
    panel.width = "240px";
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    panel.top = "20px";
    panel.left = "-20px";
    panel.background = "rgba(0,0,0,0.6)";
    panel.paddingTop = "10px";
    panel.paddingBottom = "10px";
    advancedTexture.addControl(panel);

    const header = new BABYLON.GUI.TextBlock();
    header.text = "Steering Behaviors";
    header.height = "30px";
    header.color = "white";
    header.fontSize = 18;
    panel.addControl(header);

    this.panel = panel;

    // Add all steering behavior sliders to the panel
    this.behaviors.forEach((name) => this.addBehaviorControl(panel, name));

    // Add toggle for rendering debug drawing on vehicles
    const debugCheckbox = new BABYLON.GUI.Checkbox();
    debugCheckbox.width = "20px";
    debugCheckbox.height = "20px";
    debugCheckbox.color = "white";
    debugCheckbox.isChecked = true;

    const debugLabel = new BABYLON.GUI.TextBlock();
    debugLabel.text = "Debug Drawing";
    debugLabel.color = "white";
    debugLabel.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    debugLabel.paddingLeft = "30px";

    const debugRow = new BABYLON.GUI.Rectangle();
    debugRow.thickness = 0;
    debugRow.height = "40px";
    debugRow.addControl(debugCheckbox);
    debugRow.addControl(debugLabel);
    debugCheckbox.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    debugCheckbox.left = "5px";
    panel.addControl(debugRow);

    // Toggle debug drawing state and clear any existing debug meshes
    debugCheckbox.onIsCheckedChangedObservable.add((state) => {
      this.renderDebug = state;
      window.renderDebug = state;
      this.vehicles.forEach((v) => v.clearDebugMeshes());
    });

    // Initial values for motion control sliders come from the 1st vehicle
    const initialMaxSpeed =
      this.vehicles.length > 0 ? this.vehicles[0].maxSpeed : 50;
    const initialMaxForce =
      this.vehicles.length > 0 ? this.vehicles[0].maxForce : 200;

    this.addSlider(panel, "Max Speed", 1, 100, initialMaxSpeed, (val) => {
      this.vehicles.forEach((v) => (v.maxSpeed = val));
    });
    this.addSlider(panel, "Max Force", 1, 100, initialMaxForce, (val) => {
      this.vehicles.forEach((v) => (v.maxForce = val * 15));
    });

    // Control the total number of active vehicles in the scene
    this.addSlider(
      panel,
      "Number of Vehicles",
      1,
      100,
      this.vehicles.length,
      (val) => {
        const desiredCount = Math.max(1, Math.round(val));
        // When value changes, add or remove vehicle instances dynamically
        const currentCount = this.vehicles.length;
        if (desiredCount > currentCount) {
          for (let i = currentCount; i < desiredCount; i++) {
            const v = this.createVehicleMesh(scene, this.behaviorWeights);
            this.vehicles.push(v);
          }
        } else if (desiredCount < currentCount) {
          for (let i = currentCount - 1; i >= desiredCount; i--) {
            this.vehicles[i].dispose();
            this.vehicles.splice(i, 1);
          }
        }
      },
      { integerOnly: true },
    );

    // Enable elevation control by default
    window.physicJump = false;

    const physicCheckbox = new BABYLON.GUI.Checkbox();
    physicCheckbox.width = "20px";
    physicCheckbox.height = "20px";
    physicCheckbox.color = "white";
    physicCheckbox.isChecked = window.physicJump;

    const physicLabel = new BABYLON.GUI.TextBlock();
    physicLabel.text = "Physic Jump (Spacebar)";
    physicLabel.color = "white";
    physicLabel.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    physicLabel.paddingLeft = "30px";

    const physicRow = new BABYLON.GUI.Rectangle();
    physicRow.thickness = 0;
    physicRow.height = "40px";
    physicRow.addControl(physicCheckbox);
    physicRow.addControl(physicLabel);
    physicCheckbox.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    physicCheckbox.left = "5px";
    panel.addControl(physicRow);

    physicCheckbox.onIsCheckedChangedObservable.add((state) => {
      window.physicJump = state;
    });
  }

  // Add one behavior slider row to the panel and connect it to vehicles.
  addBehaviorControl(panel, text) {
    this.behaviorWeights[text] = 0;

    const label = new BABYLON.GUI.TextBlock();
    label.text = text;
    label.color = "white";
    label.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    label.paddingLeft = "5px";

    const weightLabel = new BABYLON.GUI.TextBlock();
    weightLabel.text = "0.00";
    weightLabel.color = "white";
    weightLabel.fontSize = 12;
    weightLabel.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    weightLabel.paddingRight = "10px";

    // Create slider control for the behavior weight
    const slider = new BABYLON.GUI.Slider();
    slider.minimum = 0;
    slider.maximum = 5;
    slider.value = 0;
    slider.height = "20px";
    slider.width = "120px";
    slider.color = "green";
    slider.background = "white";

    slider.onValueChangedObservable.add((value) => {
      this.behaviorWeights[text] = value;
      weightLabel.text = value.toFixed(2);
      this.vehicles.forEach((v) => {
        v.behaviorManager.setBehaviorWeight(text, value);
      });
    });

    // Layout the behavior row in a 3 column grid
    const row = new BABYLON.GUI.Grid();
    row.addColumnDefinition(0.35);
    row.addColumnDefinition(0.5);
    row.addColumnDefinition(0.15);
    row.height = "40px";
    row.addControl(label, 0, 0);
    row.addControl(slider, 0, 1);
    row.addControl(weightLabel, 0, 2);

    label.paddingLeft = "5px";
    label.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    slider.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    slider.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    weightLabel.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    weightLabel.verticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;

    panel.addControl(row);
  }

  // Add a slider with a label and change callback
  addSlider(panel, labelTxt, min, max, initial, onChange, options = {}) {
    const integerOnly = options.integerOnly === true;
    const formatValue = (value) =>
      integerOnly ? Math.round(value).toString() : value.toFixed(1);

    const label = new BABYLON.GUI.TextBlock();
    label.text = labelTxt + ": " + formatValue(initial);
    label.height = "30px";
    label.color = "white";
    label.paddingTop = "10px";
    panel.addControl(label);

    // Create slider control for the given label and value range
    const slider = new BABYLON.GUI.Slider();
    slider.minimum = min;
    slider.maximum = max;
    slider.value = initial;
    if (integerOnly) {
      slider.step = 1;
    }
    slider.height = "20px";
    slider.width = "180px";
    slider.color = "green";
    slider.background = "white";
    slider.onValueChangedObservable.add((value) => {
      const normalizedValue = integerOnly ? Math.round(value) : value;
      label.text = labelTxt + ": " + formatValue(normalizedValue);
      onChange(normalizedValue);
    });
    panel.addControl(slider);
  }

  // Forward to a global vehicle factory function because BabylonGUI does not own the vehicle creation logic
  createVehicleMesh(scene, behaviorWeights) {
    if (
      typeof window !== "undefined" &&
      typeof window.createVehicleMesh === "function"
    ) {
      return window.createVehicleMesh(scene, behaviorWeights);
    }
    if (typeof createVehicleMesh === "function") {
      return createVehicleMesh(scene, behaviorWeights);
    }
    throw new Error(
      "GUI.createVehicleMesh requires a global createVehicleMesh function.",
    );
  }
}

window.GUI = BabylonGUI;
