const audioContext = new AudioContext();
let pannerNode;
let ampNode; // NEW: Dedicated volume control
let synthInstance, delayInstance, reverbInstance, distortionInstance;

async function initAudioEngine() {
  const hostGroupId = await setupWamHost();
  
  synthInstance = await loadDynamicComponent("https://wam-4tt.pages.dev/Pro54/index.js", hostGroupId);
  distortionInstance = await loadDynamicComponent("https://www.webaudiomodules.com/community/plugins/burns-audio/distortion/index.js", hostGroupId);
  delayInstance = await loadDynamicComponent("https://www.webaudiomodules.com/community/plugins/wimmics/pingpongdelay/dist/index.js", hostGroupId);
  reverbInstance = await loadDynamicComponent("https://www.webaudiomodules.com/community/plugins/wimmics/greyhole/index.js", hostGroupId);

  // --- ABLETON 'GET STARTED' PATCH INIT (PRO54 MAPPED) ---
  synthInstance.audioNode.setParameterValues({
    
    // --- OSCILLATOR A (Bright Sawtooth) ---
    "OscASaw": { value: 1 },        // Turn Sawtooth ON
    "OscAPulse": { value: 0 },      // Turn Pulse OFF
    "MixerOscALevel": { value: 80 },// Set level high
    
    // --- OSCILLATOR B (Sub/Triangle) ---
    "OscBShapeTri": { value: 1 },   // Turn Triangle ON (for deep, clean sub-bass)
    "OscBShapeSaw": { value: 0 },   // Turn Sawtooth OFF
    "OscBShapePulse": { value: 0 }, // Turn Pulse OFF
    "OscBFreqFine": { value: 50 },  // 50 is perfectly centered/in-tune on the Pro54
    "MixerOscBLevel": { value: 80 },// Match Osc A level
    
    // --- THE ENVELOPE (Mapped to 0-100 scale) ---
    "AmplifierAttack": { value: 0 },    // 0 = Instant, snappy attack
    "AmplifierDecay": { value: 50 },    // Mid-length decay
    "AmplifierSustain": { value: 100 }, // Full sustain volume while held
    "AmplifierRelease": { value: 40 },  // Smooth fade out (acts as your 0.4)
    "Release": { value: 1 },            // Global release switch MUST be 1 for AmplifierRelease to work
    
    // --- THE FILTER ---
    "FilterResonance": { value: 35 }, 
    "FilterEnvAmt": { value: 0 },       // Set to 0 so the internal envelope doesn't fight your Y-axis mouse modulation
    "FilterKeyboardTracking": { value: 100 }, // Ensures the filter opens up as you play higher notes
    
    // --- THE GLIDE (Theremin Pitch Slide) ---
    "Glide": { value: 65 }, 
    
    // --- SYSTEM CLEANUP (Disable internal noise/drift for a pure tone) ---
    "Analog": { value: 0 },             // Disables the vintage pitch-drift emulation
    "DelayON": { value: 0 },            // Disables the Pro54's internal delay (since you have the PingPong WAM)
    "PolyModOscB": { value: 0 },        // Disables cross-modulation interference
    "MixerNoiseLevel": { value: 0 }     // Ensures the noise generator is muted
  });

  pannerNode = audioContext.createStereoPanner();
  
  // NEW: Create the amplitude control node
  ampNode = audioContext.createGain();
  ampNode.gain.value = 0.5; // Start at 50% volume
  
  // Update Signal Chain: Synth -> AMP -> Distortion -> Panner -> Delay -> Reverb -> Out
  synthInstance.audioNode.connect(ampNode);
  ampNode.connect(distortionInstance.audioNode);
  distortionInstance.audioNode.connect(pannerNode);
  pannerNode.connect(delayInstance.audioNode);
  delayInstance.audioNode.connect(reverbInstance.audioNode);
  reverbInstance.audioNode.connect(audioContext.destination);

  console.log("Audio Engine Connected.");
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

function triggerDroneNote() {
  if (synthInstance && synthInstance.audioNode) {
    let now = audioContext.currentTime;
    // Play a low C (MIDI 36)
    synthInstance.audioNode.scheduleEvents({ type: 'wam-midi', time: now, data: { bytes: new Uint8Array([0x80, 36, 100]) } });
    synthInstance.audioNode.scheduleEvents({ type: 'wam-midi', time: now + 0.05, data: { bytes: new Uint8Array([0x90, 36, 100]) } });
  }
}