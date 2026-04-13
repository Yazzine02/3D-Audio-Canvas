// --- DOM ELEMENTS ---
const canvas = document.getElementById("renderCanvas");
const startBtn = document.getElementById("start-btn");
const synthControls = document.getElementById("synth-controls");
const overlayData = document.getElementById("overlay-data");
const mapModeSelect = document.getElementById("map-mode");

// ADSR Sliders
const envA = document.getElementById("env-a");
const envD = document.getElementById("env-d");
const envS = document.getElementById("env-s");
const envR = document.getElementById("env-r");

// Filter Sliders
const filtC = document.getElementById("filt-c");
const filtR = document.getElementById("filt-r");

// --- GLOBAL STATE ---
const engine = new BABYLON.Engine(canvas, true);
let isPlaying = false;
let frames = 0;

// --- BABYLON SCENE CREATION ---
const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.07, 1);

    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 8, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;

    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    // --- THE GRID CANVAS ---
    const plate = BABYLON.MeshBuilder.CreatePlane("plate", { size: 5 }, scene);
    
    const gridMat = new BABYLON.GridMaterial("gridMat", scene);
    gridMat.majorUnitFrequency = 5;
    gridMat.minorUnitVisibility = 0.5;
    gridMat.gridRatio = 0.5; 
    gridMat.mainColor = new BABYLON.Color3(0.0, 1.0, 0.8); 
    gridMat.lineColor = new BABYLON.Color3(0.0, 0.3, 0.3); 
    gridMat.backFaceCulling = false;
    plate.material = gridMat;

    // --- THE PLAYHEAD BALL ---
    const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.3 }, scene);
    ball.position.z = -0.15; 
    
    const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
    ballMat.emissiveColor = new BABYLON.Color3(1, 0, 0.5); 
    ball.material = ballMat;

    // --- INTERACTION LOGIC ---
    let isDragging = false;

    scene.onPointerObservable.add((pointerInfo) => {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERDOWN:
                if (pointerInfo.pickInfo.hit && pointerInfo.pickInfo.pickedMesh === ball) {
                    isDragging = true;
                    camera.detachControl(); 
                }
                break;

            case BABYLON.PointerEventTypes.POINTERUP:
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

    // --- THE EXPRESSIVE ROUTING ENGINE (Fires every frame) ---
    scene.onBeforeRenderObservable.add(() => {
        // 1. Normalize Coordinates (Map -2.5 -> +2.5 into clean 0.0 -> 1.0)
        let normX = (ball.position.x + 2.5) / 5.0;
        let normY = (ball.position.y + 2.5) / 5.0;

        // 2. Update the UI Text Overlay
        overlayData.innerText = `X: ${normX.toFixed(2)} | Y: ${normY.toFixed(2)}`;

        // 3. Modulate the Audio based on the Dropdown selection
        if (isPlaying && synthInstance && ampNode) {
            let mode = mapModeSelect.value;
            
            if (mode === 'pitch_amp') {
                // X = Pitch (OscAFreq)
                let pitch = 10 + (normX * 80); 
                synthInstance.audioNode.setParameterValues({ "OscAFreq": { value: pitch } });
                
                // Y = Amplitude (Using our dedicated GainNode)
                ampNode.gain.setTargetAtTime(normY, audioContext.currentTime, 0.01); 
            } 
            else if (mode === 'cutoff_res') {
                // X = Filter Cutoff
                let cutoff = normX * 100;
                synthInstance.audioNode.setParameterValues({ "FilterCutoff": { value: cutoff } });
                filtC.value = cutoff; // Visual feedback on the slider!

                // Y = Filter Resonance
                let res = normY * 100;
                synthInstance.audioNode.setParameterValues({ "FilterResonance": { value: res } });
                filtR.value = res; // Visual feedback on the slider!
                
                // Keep amplitude steady in this mode so we can actually hear the filter sweep
                ampNode.gain.setTargetAtTime(0.5, audioContext.currentTime, 0.01); 
            }

            // Keep the drone playing to evaluate sound
            if (frames % 30 === 0) triggerDroneNote();
            frames++;
        }
    });

    return scene;
};

// --- START ENGINE & RENDER LOOP ---
const scene = createScene();
engine.runRenderLoop(() => { scene.render(); });
window.addEventListener("resize", () => { engine.resize(); });

// --- UI EVENT LISTENERS ---
startBtn.addEventListener("click", async () => {
    startBtn.innerText = "Loading Engine...";
    if (audioContext.state !== 'running') await audioContext.resume();
    
    await initAudioEngine();
    
    isPlaying = true;
    startBtn.style.display = "none"; 
    synthControls.style.display = "flex"; // Reveal the dashboard
});

// Helper function to attach HTML sliders to WAM parameters
function attachSliderToWam(sliderElement, wamParamId) {
    sliderElement.addEventListener("input", () => {
        if (synthInstance) {
            synthInstance.audioNode.setParameterValues({ 
                [wamParamId]: { value: parseFloat(sliderElement.value) } 
            });
        }
    });
}

// Hook up the HTML sliders to the exact Pro54 parameters
attachSliderToWam(envA, "AmplifierAttack");
attachSliderToWam(envD, "AmplifierDecay");
attachSliderToWam(envS, "AmplifierSustain");
attachSliderToWam(envR, "AmplifierRelease");
attachSliderToWam(filtC, "FilterCutoff");
attachSliderToWam(filtR, "FilterResonance");