const audioContext = new AudioContext();
let ampNode;  
let synthInstance;

async function initAudioEngine() {
  const hostGroupId = await setupWamHost();
  synthInstance = await loadDynamicComponent("https://wam-4tt.pages.dev/Pro54/index.js", hostGroupId);

  // --- THICK ANALOG PATCH INIT ---
  synthInstance.audioNode.setParameterValues({
    "OscASaw": { value: 1 },        
    "MixerOscALevel": { value: 100 },
    "OscBShapeTri": { value: 1 },   
    "OscBFreqFine": { value: 52 },  
    "MixerOscBLevel": { value: 80 },
    
    "FilterCutoff": { value: 100 },     // FIX: Ensure the filter starts WIDE OPEN
    "FilterEnvAmt": { value: 0 },       
    
    // Utilize the synth's actual ADSR envelope
    "AmplifierAttack": { value: 10 },   // 10ms quick fade in  
    "AmplifierDecay": { value: 100 },    
    "AmplifierSustain": { value: 100 }, 
    "Release": { value: 0.5 },          // Smooth 500ms fade out on release
    
    "Analog": { value: 20 },            
    "DelayON": { value: 0 },            
    "MixerNoiseLevel": { value: 0 }     
  });

  ampNode = audioContext.createGain();
  ampNode.gain.value = 1.0; 
  
  // Clean Signal Chain: Synth -> Amp (Matrix) -> Output
  synthInstance.audioNode.connect(ampNode);
  ampNode.connect(audioContext.destination);

  console.log("Pure Pro54 Audio Engine Connected.");
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

// --- TRUE MIDI TRIGGERS ---
function playNote() {
  if (!synthInstance) return;
  let now = audioContext.currentTime;
  // Send Note On (MIDI 48 is C3)
  synthInstance.audioNode.scheduleEvents({ type: 'wam-midi', time: now, data: { bytes: new Uint8Array([0x90, 48, 100]) } });
}

function stopNote() {
  if (!synthInstance) return;
  let now = audioContext.currentTime;
  // Send Note Off
  synthInstance.audioNode.scheduleEvents({ type: 'wam-midi', time: now, data: { bytes: new Uint8Array([0x80, 48, 100]) } });
}