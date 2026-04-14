const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// --- THE PARAMETER DICTIONARY ---
// Add any Pro54 or custom parameter here, define its absolute min/max limits
const availableParams = {
    "AmplifierAttack": { min: 0, max: 100, label: "Amp Attack" },
    "Release": { min: 0, max: 1, label: "Global Release (Toggle)" },
    "Velocity": { min: 0, max: 1, label: "Velocity Sens" },
    "Repeat": { min: 0, max: 1, label: "Arp Repeat" },
    "Drone": { min: 0, max: 1, label: "Infinite Drone" },
    "FilterCutoff": { min: 10, max: 100, label: "Filter Cutoff" },
    "FilterResonance": { min: 0, max: 90, label: "Filter Resonance" },
    "OscAFreq": { min: 10, max: 90, label: "Oscillator A Pitch" },
    "MasterVolume": { min: 0, max: 1, label: "Output Volume" } // Custom mapping for our ampNode
};

// State arrays to track what is currently assigned to X and Y
let routeX = [];
let routeY = [];

// DOM Elements
const startBtn = document.getElementById("start-btn");
const synthControls = document.getElementById("synth-controls");
const overlayData = document.getElementById("overlay-data");
const routingContainer = document.getElementById("routing-container");

let isPlaying = false;
let frames = 0;

// --- DYNAMIC UI BUILDER ---
function buildRoutingUI() {
    for (let paramId in availableParams) {
        let paramData = availableParams[paramId];

        // Create the row container
        let row = document.createElement("div");
        row.className = "route-row";

        // Create the label
        let label = document.createElement("div");
        label.className = "route-label";
        label.innerText = paramData.label;

        // Create the button group
        let btnGroup = document.createElement("div");
        btnGroup.className = "route-btns";

        // Create X Button
        let btnX = document.createElement("button");
        btnX.className = "btn-axis";
        btnX.innerText = "X";
        btnX.onclick = () => toggleRoute('X', paramId, btnX);

        // Create Y Button
        let btnY = document.createElement("button");
        btnY.className = "btn-axis";
        btnY.innerText = "Y";
        btnY.onclick = () => toggleRoute('Y', paramId, btnY);

        btnGroup.appendChild(btnX);
        btnGroup.appendChild(btnY);
        row.appendChild(label);
        row.appendChild(btnGroup);
        routingContainer.appendChild(row);
    }
}

// Handles adding/removing parameters from the axes arrays
function toggleRoute(axis, paramId, btnElement) {
    let targetArray = axis === 'X' ? routeX : routeY;
    let activeClass = axis === 'X' ? 'active-x' : 'active-y';
    let index = targetArray.indexOf(paramId);

    if (index > -1) {
        // It's already active, so turn it OFF
        targetArray.splice(index, 1);
        btnElement.classList.remove(activeClass);
    } else {
        // Turn it ON
        targetArray.push(paramId);
        btnElement.classList.add(activeClass);
    }
}

// --- BABYLON 3D SCENE ---
const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.07, 1);

    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 8, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;

    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    const plate = BABYLON.MeshBuilder.CreatePlane("plate", { size: 5 }, scene);
    const gridMat = new BABYLON.GridMaterial("gridMat", scene);
    gridMat.majorUnitFrequency = 5;
    gridMat.minorUnitVisibility = 0.5;
    gridMat.gridRatio = 0.5; 
    gridMat.mainColor = new BABYLON.Color3(0.0, 1.0, 0.8); 
    gridMat.lineColor = new BABYLON.Color3(0.0, 0.3, 0.3); 
    gridMat.backFaceCulling = false;
    plate.material = gridMat;

    const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.3 }, scene);
    ball.position.z = -0.15; 
    
    const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
    ballMat.emissiveColor = new BABYLON.Color3(1, 0, 0.5); 
    ball.material = ballMat;

    let isDragging = false;

    // --- 1. TRUE MIDI TOUCH GATE & DRAG LOGIC ---
    scene.onPointerObservable.add((pointerInfo) => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                if (pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh === ball) {
                    isDragging = true;
                    camera.detachControl(); 
                    if (isPlaying) playNote(); // Trigger Native MIDI
                }
                break;
            case BABYLON.PointerEventTypes.POINTERUP:
                if (isDragging && isPlaying) stopNote(); // Release Native MIDI
                isDragging = false;
                camera.attachControl(canvas, true); 
                break;
            case BABYLON.PointerEventTypes.POINTERMOVE:
                if (isDragging) {
                    const pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === plate);
                    if (pickInfo.hit) {
                        ball.position.x = BABYLON.Scalar.Clamp(pickInfo.pickedPoint.x, -2.5, 2.5);
                        ball.position.y = BABYLON.Scalar.Clamp(pickInfo.pickedPoint.y, -2.5, 2.5);
                    }
                }
                break;
        }
    });

    // --- 2. THE MULTI-ROUTING ENGINE (Fires every frame) ---
    scene.onBeforeRenderObservable.add(() => {
        let normX = (ball.position.x + 2.5) / 5.0;
        let normY = (ball.position.y + 2.5) / 5.0;

        overlayData.innerText = `X: ${normX.toFixed(2)} | Y: ${normY.toFixed(2)}`;

        // ONLY update WAM parameters if we are actually dragging the ball
        if (isPlaying && synthInstance && ampNode && isDragging) {
            
            // Map X-Axis parameters
            routeX.forEach(paramId => {
                let pData = availableParams[paramId];
                let mappedValue = pData.min + normX * (pData.max - pData.min);
                
                if (paramId === "MasterVolume") {
                    ampNode.gain.setTargetAtTime(mappedValue, audioContext.currentTime, 0.01);
                } else {
                    synthInstance.audioNode.setParameterValues({ [paramId]: { value: mappedValue } });
                }
            });

            // Map Y-Axis parameters
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
    });

    return scene;
};

// --- INITIALIZE & RUN ---
buildRoutingUI(); 

const scene = createScene();
engine.runRenderLoop(() => { scene.render(); });
window.addEventListener("resize", () => { engine.resize(); });

startBtn.addEventListener("click", async () => {
    startBtn.innerText = "Loading Engine...";
    if (audioContext.state !== 'running') await audioContext.resume();
    
    await initAudioEngine();
    
    isPlaying = true;
    startBtn.style.display = "none"; 
    synthControls.style.display = "flex"; 

});