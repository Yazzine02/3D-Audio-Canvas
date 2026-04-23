const audioContext = new AudioContext();
let ampNode;  
let synthInstance;

async function initAudioEngine() {
  const hostGroupId = await setupWamHost();
  synthInstance = await loadDynamicComponent("https://wam-4tt.pages.dev/Pro54/index.js", hostGroupId);

  // --- THE FIX: ACTIVATING THE NATIVE DRONE ---
  synthInstance.audioNode.setParameterValues({
    "Drone": { value: 1 },              // <--- THE MAGIC SWITCH: Continuous sound without MIDI!
    
    "OscASaw": { value: 1 },        
    "MixerOscALevel": { value: 100 },
    "OscBShapeTri": { value: 1 },   
    "OscBFreqFine": { value: 52 },  
    "MixerOscBLevel": { value: 80 },
    
    "FilterCutoff": { value: 100 },     // Start wide open so it isn't muffled
    "FilterEnvAmt": { value: 0 }        // Stop the envelope from closing the filter   
  });

  ampNode = audioContext.createGain();
  ampNode.gain.value = 1.0; 
  
  // Clean Signal Chain: Synth -> Amp (Matrix) -> Output
  synthInstance.audioNode.connect(ampNode);
  ampNode.connect(audioContext.destination);

  console.log("Pure Pro54 Audio Engine Connected & Drone Activated.");
}

async function setupWamHost() {
  const { default: initializeWamHost } = await import("https://www.webaudiomodules.com/sdk/2.0.0-alpha.6/src/initializeWamHost.js");
  const [hostGroupId] = await initializeWamHost(audioContext); 
  return hostGroupId;
}

async function loadDynamicComponent(wamURI, hostGroupId) {
  try {
    const { default: WAM } = await import(wamURI);
    return await WAM.createInstance(hostGroupId, audioContext);
  } catch (error) { console.error("Error loading WAM:", error); }
}

// --- TRUE MIDI TRIGGERS (Kept as a safe fallback) ---
function playNote() {
  if (!synthInstance) return;
  
  // FIX: Add a tiny 100ms delay so the WAM has time to wake up and catch the note
  let safeTime = audioContext.currentTime + 0.1; 
  
  // Send Note On (MIDI 48 is C3)
  synthInstance.audioNode.scheduleEvents({ type: 'wam-midi', time: safeTime, data: { bytes: new Uint8Array([0x90, 48, 100]) } });
}

function stopNote() {
  if (!synthInstance) return;
  let now = audioContext.currentTime;
  // Send Note Off
  synthInstance.audioNode.scheduleEvents({ type: 'wam-midi', time: now, data: { bytes: new Uint8Array([0x80, 48, 100]) } });
}