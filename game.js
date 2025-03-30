document.addEventListener('DOMContentLoaded', async function () {
  // Mobile device detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
      window.innerWidth <= 1024 || 
      (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

  // Show mobile controls if on mobile device
  if (isMobile) {
      document.getElementById('mobileControls').style.display = 'block';
      document.getElementById('instructions').style.display = 'none';

      // Add viewport meta tag for proper mobile scaling if it doesn't exist
      if (!document.querySelector('meta[name="viewport"]')) {
          const viewport = document.createElement('meta');
          viewport.name = 'viewport';
          viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
          document.getElementsByTagName('head')[0].appendChild(viewport);
      }
  }

  // Set up scene, camera, and renderer
  const scene = new THREE.Scene();
  setupLighting(scene);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add skybox
const skyboxLoader = new THREE.CubeTextureLoader();
  const skyboxMaterials = [
new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // right - light blue
new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // left - light blue
new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // top - light blue
new THREE.MeshBasicMaterial({ color: 0x4682B4, side: THREE.BackSide }), // bottom - darker blue
new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // front - light blue
new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })  // back - light blue
];

  const skyboxGeometry = new THREE.BoxGeometry(3600, 3600, 3600);
  const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
  scene.add(skybox);

// Remove the old skybox background
  scene.background = new THREE.Color(0x87CEEB);

// Add OrbitControls with modified settings
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
controls.minDistance = 8; // Reduced from 10
controls.maxDistance = 30; // Reduced from 50
controls.enablePan = false; // Disable panning
controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent camera from going below horizon
controls.minPolarAngle = 0.1; // Prevent camera from going too high
controls.rotateSpeed = 0.5; // Adjust rotation speed
  controls.enableZoom = true;
  controls.zoomSpeed = 0.5;
  controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE
  };

// Variables for camera control
let currentCameraDistance = 15; // Reduced from 25
  let lastBoatPosition = new THREE.Vector3();

// Add zoom change listener
  controls.addEventListener('change', () => {
// Update stored camera distance when user zooms
      currentCameraDistance = camera.position.distanceTo(controls.target);
  });

// Create lake with reflective water
const lakeGeometry = new THREE.PlaneGeometry(3600, 3600, 180, 180);

// Create enhanced normal map for more pronounced ocean-like waves
const waterNormalMap = new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg');
waterNormalMap.wrapS = waterNormalMap.wrapT = THREE.RepeatWrapping;
waterNormalMap.repeat.set(12, 12); // Keep the same wave pattern scale

const waterMaterial = new THREE.MeshPhysicalMaterial({ 
color: 0x005588, // Deeper blue for ocean-like water
metalness: 0.1, // Increased from 0.05 for more reflection
roughness: 0.05, // Reduced from 0.15 for a more glossy finish
transmission: 0.5, // Slightly reduced for more opacity
reflectivity: 10.0, // Maximized to 1.0 for stronger reflections
envMapIntensity: 0.3, // Reduced from 3.0 to 0.8 to make boat reflections smaller
clearcoat: 1.0, // Maximized to 1.0 for maximum glossiness
clearcoatRoughness: 0.1, // Reduced for smoother surface
normalMap: waterNormalMap,
normalScale: new THREE.Vector2(0.8, 0.8), // Increased from 0.5 for more pronounced waves
ior: 1.33, // Water's index of refraction
side: THREE.FrontSide
});

const lake = new THREE.Mesh(lakeGeometry, waterMaterial);
lake.rotation.x = -Math.PI / 2;
lake.position.y = 0; // Raised to match the bottom of the boat
scene.add(lake);

// Add ocean floor to prevent seeing through water
const oceanFloorGeometry = new THREE.PlaneGeometry(900, 900);
const oceanFloorMaterial = new THREE.MeshPhongMaterial({
color: 0x003366, // Dark blue for deep ocean floor
shininess: 10,
flatShading: true
});
const oceanFloor = new THREE.Mesh(oceanFloorGeometry, oceanFloorMaterial);
oceanFloor.rotation.x = -Math.PI / 2; // Same orientation as water
oceanFloor.position.y = -5; // Position below water
scene.add(oceanFloor);

// Create high-quality environment map for reflections
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {
generateMipmaps: true,
minFilter: THREE.LinearMipmapLinearFilter
});
const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
scene.add(cubeCamera);
waterMaterial.envMap = cubeRenderTarget.texture;

// Add dynamic wave displacement
  let waterVertices = null;
  let waterVerticesInitial = null;

// Store initial vertex positions for wave animation
  function initWaterVertices() {
      if (!waterVertices) {
  const positions = lake.geometry.attributes.position;
          waterVertices = new Float32Array(positions.array.length);
          waterVerticesInitial = new Float32Array(positions.array.length);
  
          for (let i = 0; i < positions.array.length; i++) {
              waterVertices[i] = positions.array[i];
              waterVerticesInitial[i] = positions.array[i];
          }
      }
  }

// Animation function for water with enhanced wave movement
  function animateWater(time) {
      initWaterVertices();

// Animate normal map with varied speeds for more natural waves
const t1 = time * 0.0001; // Slower overall movement
      const t2 = time * 0.00008;

waterNormalMap.offset.x = Math.sin(t1) * 0.1 + time * 0.00002;
waterNormalMap.offset.y = Math.cos(t2) * 0.1 + time * 0.00001;

// Add vertex displacement for more dynamic waves
const positions = lake.geometry.attributes.position;
      const waves = [
  { amp: 0.12, freq: 0.02, speed: 0.00006 }, // Large slow waves
  { amp: 0.06, freq: 0.05, speed: 0.00012 }, // Medium waves
  { amp: 0.03, freq: 0.12, speed: 0.00025 }  // Small ripples
      ];

      for (let i = 0; i < positions.array.length; i += 3) {
  // Only modify Y values (height)
          const x = waterVerticesInitial[i];
  const z = waterVerticesInitial[i+2];
  
          let y = 0;
          for (const wave of waves) {
      // Combine multiple wave patterns
              y += Math.sin(x * wave.freq + time * wave.speed) * 
                   Math.cos(z * wave.freq + time * wave.speed) * 
                   wave.amp;
          }
  
  // Apply to geometry
  positions.array[i+1] = waterVerticesInitial[i+1] + y;
      }

      positions.needsUpdate = true;

// Update reflection map
lake.visible = false;

// Position cube camera exactly at water level with boat x,z
      const boatPos = boat.group.position;
cubeCamera.position.set(boatPos.x, 0, boatPos.z); // Updated to match new water level
cubeCamera.update(renderer, scene);
lake.visible = true;
}

const islands = [
// Starting island (close to spawn)
createIsland(50, 50, 25, 4, 16),    // Original starting island
// Medium island to the east
createIsland(160, -120, 20, 4, 14),  // Original eastern island
// Small island to the north
createIsland(-100, 160, 15, 3, 12),  // Original northern island
// Large island to the west
createIsland(-160, -100, 30, 5, 20),  // Original western island
// Original distant islands
createIsland(300, 300, 35, 6, 24),    // Large northeastern island
createIsland(-280, 320, 28, 5, 18),   // Northern archipelago
createIsland(-350, -280, 32, 5, 20),  // Far western island
createIsland(400, -200, 25, 4, 16),   // Far eastern island
createIsland(200, -350, 30, 5, 18),   // Southern island
createIsland(-200, -400, 22, 4, 14),  // Southwestern island
// New islands in expanded area
createIsland(600, 600, 45, 7, 28),    // Massive northeastern island
createIsland(-700, 500, 38, 6, 22),   // Large northern island
createIsland(800, -400, 40, 5, 24),   // Eastern archipelago
createIsland(-600, -800, 42, 6, 26),  // Far southwestern island
createIsland(400, -700, 35, 5, 20),   // Southern deep water island
createIsland(-800, -200, 33, 5, 18),  // Western deep water island
createIsland(700, 200, 28, 4, 16),    // Eastern shallow water island
createIsland(-400, 700, 25, 4, 14),   // Northern shallow water island
createIsland(200, 800, 30, 5, 18),    // Far northern island
createIsland(-700, -500, 36, 5, 20)   // Southwestern deep water island
];

    // Add dock to the starting island
    const startingIsland = islands[0];
    const dockAngle = -3 * Math.PI / 4;
    const islandRadius = 25;
    const dockStartX = startingIsland.position.x + Math.cos(dockAngle) * islandRadius;
    const dockStartZ = startingIsland.position.z + Math.sin(dockAngle) * islandRadius;

    const dock = createDock(dockStartX, dockStartZ, dockAngle, scene);

// Add golden zone location after deepZoneLocations
const goldenZoneLocation = { x: 1500, z: 1500, size: 80 };  // Even further from starting point

// Define deep water zone locations (away from islands)
const deepZoneLocations = [
{ x: 0, z: -850, size: 40 },
{ x: -950, z: 30, size: 45 },
{ x: 800, z: 600, size: 50 },
{ x: 620, z: -950, size: 55 },
{ x: -800, z: -900, size: 40 },
{ x: 950, z: 850, size: 60 },
{ x: -700, z: 700, size: 45 },
{ x: 500, z: -500, size: 50 },
{ x: -500, z: -300, size: 45 },
{ x: 300, z: 900, size: 55 }
];

WaterZones.init(islands);

// Add underwater terrain around each island
islands.forEach(island => {
const pos = island.position;
WaterZones.createUnderwaterTerrain(scene, pos.x, pos.z, 35);;  // Increased size from 25 to 35
scene.add(island);
});

// Add deep water zones
deepZoneLocations.forEach(zone => {
WaterZones.createDeepWaterZone(scene, zone.x, zone.z, zone.size);
});

// Function to determine water type at a point
function getWaterType(x, z) {
if (WaterZones.isInShallowWater(x, z)) return "shallow";
if (WaterZones.isInDeepWater(x, z)) return "deep";
if (WaterZones.isInGoldenWater(x, z)) return "golden";
return "ocean"; // Default is ocean (regular deep water)
}

// Add weight generation function
  function generateFishWeight(minWeight, maxWeight, scale) {
// Generate a random number between 0 and 1
      const rand = Math.random();

// Use exponential distribution to bias towards smaller weights
// Math.pow(rand, scale) gives us more small numbers as scale increases
      const weight = minWeight + (maxWeight - minWeight) * Math.pow(rand, scale);

// Round to 1 decimal place
      return Math.round(weight * 10) / 10;
  }

// Create boat class
  class Boat {
constructor() {
          this.group = new THREE.Group();
  this.speed = 0.4; // Increased from 0.2
  this.rotationSpeed = 0.025; // Increased from 0.015
          this.isFishing = false;
          this.fishingLine = null;
          this.fishingRadius = null;
          this.fishingStartTime = 0;
          this.canCatchFish = false;
  this.collection = {};  // Store caught fish
  this.records = {};     // Store records
  this.collisionRadius = 2; // Radius for boat collision
  this.money = 0; // Player's money
  this.nearShop = false; // Flag to track if near the fishing house
  this.ownedItems = new Set(); // Track owned items
  this.baseSpeed = 0.4; // Store base speed for motor calculations
  this.nearNPC = false; // Add nearNPC property
          this.completedQuests = new Set();
          this.questRewards = new Map();
  
  // Initialize quest rewards
          this.questRewards.set('shallowFishQuest', 'compass');
          this.createBoat();
          this.createWakeSystem();
      }

      createBoat() {
// Boat hull
          const hullGeometry = new THREE.BoxGeometry(2.5, 1.5, 5);
          const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x800000 });
          const hull = new THREE.Mesh(hullGeometry, hullMaterial);
          this.group.add(hull);

  // Boat cabin
          const cabinGeometry = new THREE.BoxGeometry(2, 1.5, 2);
          const cabinMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
          const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
          cabin.position.set(0, 1.25, -0.5);
          this.group.add(cabin);

  // Cabin roof
          const roofGeometry = new THREE.BoxGeometry(2.2, 0.2, 2.2);
          const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x2F4F4F });
          const roof = new THREE.Mesh(roofGeometry, roofMaterial);
          roof.position.set(0, 2.1, -0.5);
          this.group.add(roof);

  // Fishing rod holders
          const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2);
          const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
          const pole = new THREE.Mesh(poleGeometry, poleMaterial);
          pole.position.set(0.5, 1.5, 1.5);
          pole.rotation.z = -Math.PI / 6;
          this.group.add(pole);

          const pole2 = pole.clone();
          pole2.position.set(-0.5, 1.5, 1.5);
          pole2.rotation.z = Math.PI / 6;
          this.group.add(pole2);

  // Front railing
          const railingGeometry = new THREE.TorusGeometry(1, 0.03, 8, 12, Math.PI);
          const railingMaterial = new THREE.MeshPhongMaterial({ color: 0xC0C0C0 });
          const railing = new THREE.Mesh(railingGeometry, railingMaterial);
          railing.position.set(0, 1.2, 2);
          railing.rotation.y = Math.PI / 2;
          this.group.add(railing);

  // Create fishing line (initially hidden)
          const lineGeometry = new THREE.BufferGeometry();
          const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
  const linePoints = new Float32Array([
      0, 1.5, 1.5,  // Start point (at the rod tip)
      0, 0, 1.5     // End point (in water)
  ]);
          lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePoints, 3));
          this.fishingLine = new THREE.Line(lineGeometry, lineMaterial);
          this.fishingLine.visible = false;
          this.group.add(this.fishingLine);

  // Create fishing radius indicator (initially hidden)
          const radiusGeometry = new THREE.CircleGeometry(4.5, 32);
          const radiusMaterial = new THREE.MeshBasicMaterial({ 
              color: 0xff0000,
              transparent: true,
              opacity: 0.3,
              side: THREE.DoubleSide,
              depthWrite: false,
              depthTest: true,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -4
          });
          this.fishingRadius = new THREE.Mesh(radiusGeometry, radiusMaterial);
          this.fishingRadius.rotation.x = -Math.PI / 2;
  this.fishingRadius.position.y = -0.85; // Raised higher above water waves
          this.fishingRadius.visible = false;
          this.fishingRadius.renderOrder = 1;
          this.group.add(this.fishingRadius);

  // Create glow effect for the radius
          const glowGeometry = new THREE.CircleGeometry(4.8, 32);
          const glowMaterial = new THREE.MeshBasicMaterial({
              color: 0xff3333,
              transparent: true,
              opacity: 0.15,
              side: THREE.DoubleSide,
              depthWrite: false,
              depthTest: true,
              polygonOffset: true,
              polygonOffsetFactor: -1,
              polygonOffsetUnits: -4
          });
          this.glowRadius = new THREE.Mesh(glowGeometry, glowMaterial);
          this.glowRadius.rotation.x = -Math.PI / 2;
  this.glowRadius.position.y = -0.85; // Raised to match main circle
          this.glowRadius.visible = false;
          this.glowRadius.renderOrder = 2;
          this.group.add(this.glowRadius);

          this.group.position.y = 1;
          this.group.rotation.y = -Math.PI / 2;
      }

      createWakeSystem() {
  // Create a container for wake positioned at the back of the boat
          this.wakeContainer = new THREE.Object3D();
  this.wakeContainer.position.set(0, 0, 2.5); // Position at the back of the boat
          this.group.add(this.wakeContainer);

  // Create wake particles
          const wakeGeometry = new THREE.BufferGeometry();
  const wakeParticles = 20; // Number of particles in wake
          const positions = new Float32Array(wakeParticles * 3);
          const scales = new Float32Array(wakeParticles);
          const opacities = new Float32Array(wakeParticles);

  // Initialize particle positions
          for (let i = 0; i < wakeParticles; i++) {
      positions[i * 3] = 0;     // x
      positions[i * 3 + 1] = 0; // y
      positions[i * 3 + 2] = 0; // z
              scales[i] = 0;
              opacities[i] = 0;
          }

          wakeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          wakeGeometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
          wakeGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

  // Create wake material
          const wakeMaterial = new THREE.ShaderMaterial({
      uniforms: {
          color: { value: new THREE.Color(0xffffff) },
      },
              vertexShader: `
                  attribute float scale;
                  attribute float opacity;
                  varying float vOpacity;
          
                  void main() {
                      vOpacity = opacity;
                      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                      gl_Position = projectionMatrix * mvPosition;
                      gl_PointSize = scale * (300.0 / -mvPosition.z);
                  }
              `,
              fragmentShader: `
                  varying float vOpacity;
                  uniform vec3 color;
          
                  void main() {
                      float r = length(gl_PointCoord - vec2(0.5, 0.5));
                      if (r > 0.5) discard;
                      float alpha = smoothstep(0.5, 0.0, r) * vOpacity;
                      gl_FragColor = vec4(color, alpha * 0.5);
                  }
              `,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending
          });

          this.wakeSystem = new THREE.Points(wakeGeometry, wakeMaterial);
  this.wakeSystem.position.y = -1.0; // Position below the boat at water level
  this.wakeSystem.renderOrder = 2; // Ensure wake renders after water
          this.wakeContainer.add(this.wakeSystem);

  // Store particle data for animation
          this.wakeParticles = wakeParticles;
          this.wakePositions = positions;
          this.wakeScales = scales;
          this.wakeOpacities = opacities;
          this.wakeAge = new Float32Array(wakeParticles);
          this.wakeActive = new Float32Array(wakeParticles);
  this.nextParticleIndex = 0; // Track which particle to spawn next
      }

      updateWake(isMovingForward) {
          const positions = this.wakePositions;
          const scales = this.wakeScales;
          const opacities = this.wakeOpacities;
          const age = this.wakeAge;
          const active = this.wakeActive;

  // Update existing particles
          for (let i = 0; i < this.wakeParticles; i++) {
              if (active[i] === 1) {
          // Age the particle
          age[i] += 0.016; // Approximate for 60fps
          
          // Expand and fade out
          scales[i] = 1.5 + age[i] * 3.0;  // Increased expansion rate
                  opacities[i] = Math.max(0, 0.8 - age[i] * 0.8);

          // Make wake particles spread outward in a V-shape as they age
          const spreadFactor = age[i] * 1.0; // Controls how quickly the wake spreads
          const direction = (i % 2 === 0) ? 1 : -1; // Alternate left and right sides
                  const spreadAmount = spreadFactor * direction;
          
          // Move particles outward as they age
                  positions[i * 3] = spreadAmount;
          
          // Move particles slightly backward as they age to create a trail
                  positions[i * 3 + 2] = age[i] * 0.5;

          // Deactivate if fully faded
                  if (opacities[i] <= 0) {
                      active[i] = 0;
                  }
              }
          }

  // Spawn new particle if moving forward
          if (isMovingForward) {
      // Find next available particle slot
              let particleIndex = this.nextParticleIndex;
              let attempts = 0;
      
      // Look for an inactive particle or use the oldest one
              while (active[particleIndex] === 1 && attempts < this.wakeParticles) {
                  particleIndex = (particleIndex + 1) % this.wakeParticles;
                  attempts++;
              }

      // Calculate initial position with slight random offset to add variation
      const initialOffset = (Math.random() - 0.5) * 0.2; // Small random horizontal offset
      
      // Spawn new particle
      positions[particleIndex * 3] = initialOffset; // Small initial x offset for variation
      positions[particleIndex * 3 + 1] = 0;         // At water level
      positions[particleIndex * 3 + 2] = 0;         // At origin of wake container
      scales[particleIndex] = 1.0 + Math.random() * 0.5; // Varied initial scale
              opacities[particleIndex] = 0.8;
              age[particleIndex] = 0;
              active[particleIndex] = 1;
      
      // Update next particle index
              this.nextParticleIndex = (particleIndex + 1) % this.wakeParticles;
          }

  // Update geometry attributes
          this.wakeSystem.geometry.attributes.position.needsUpdate = true;
          this.wakeSystem.geometry.attributes.scale.needsUpdate = true;
          this.wakeSystem.geometry.attributes.opacity.needsUpdate = true;
      }

      checkCollision(newPosition) {
  // Check collision with each island
  for (const island of islands) {
              const dx = newPosition.x - island.position.x;
              const dz = newPosition.z - island.position.z;
              const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Get the island's size (assuming it's the first child's scale)
              const islandBase = island.children[island.children.length - 1];
              const islandRadius = islandBase.geometry.parameters.radius * islandBase.scale.x;
      
      // Add some padding to the collision radius
              const minDistance = islandRadius + this.collisionRadius;
      
              if (distance < minDistance) {
          return true; // Collision detected
              }
          }
  return false; // No collision
      }

      moveForward() {
          if (!this.isFishing) {
              const direction = new THREE.Vector3(0, 0, -1);
              direction.applyQuaternion(this.group.quaternion);
      
      // Calculate new position
              const newPosition = this.group.position.clone().add(direction.multiplyScalar(this.speed));
      
      // Only move if there's no collision
              if (!this.checkCollision(newPosition)) {
                  this.group.position.copy(newPosition);
          // Update wake when moving forward
                  this.updateWake(true);
              }
          }
      }

      moveBackward() {
          if (!this.isFishing) {
              const direction = new THREE.Vector3(0, 0, 1);
              direction.applyQuaternion(this.group.quaternion);
      
      // Calculate new position
              const newPosition = this.group.position.clone().add(direction.multiplyScalar(this.speed));
      
      // Only move if there's no collision
              if (!this.checkCollision(newPosition)) {
                  this.group.position.copy(newPosition);
          // Update wake with no forward movement
                  this.updateWake(false);
              }
          }
      }

      turnLeft() {
          if (!this.isFishing) {
              this.group.rotation.y += this.rotationSpeed;
          }
      }

      turnRight() {
          if (!this.isFishing) {
              this.group.rotation.y -= this.rotationSpeed;
          }
      }

      toggleFishing() {
          this.isFishing = !this.isFishing;
          this.fishingLine.visible = this.isFishing;
          this.fishingRadius.visible = this.isFishing;
          this.glowRadius.visible = this.isFishing;

          if (this.isFishing) {
              this.fishingStartTime = Date.now();
              this.canCatchFish = false;
      // Increased initial waiting time to 5 seconds
              setTimeout(() => {
                  this.canCatchFish = true;
              }, 5000);

              const linePositions = this.fishingLine.geometry.attributes.position.array;
              linePositions[4] = 0;
              this.fishingLine.geometry.attributes.position.needsUpdate = true;
          } else {
              document.getElementById('fishCaught').style.display = 'none';
          }
      }

      checkForFish() {
          if (!this.canCatchFish || !this.isFishing) return;

  const timeSpentFishing = (Date.now() - this.fishingStartTime) / 1000; // Convert to seconds
  const baseProbability = 0.02; // 2% base chance per check (reduced from 10%)
  const timeBonus = Math.min(0.08, timeSpentFishing * 0.002); // Max 8% bonus, slower increase
          const catchChance = baseProbability + timeBonus;

          if (Math.random() < catchChance) {
              this.catchFish();
          }
      }

      catchFish() {
  // Determine water type at boat position
  const waterType = getWaterType(this.group.position.x, this.group.position.z);

  // Check if trying to fish in deeps without the deep rod
          if (waterType === "deep" && !this.ownedItems.has('deeprod')) {
              const fishCaughtDiv = document.getElementById('fishCaught');
              const fishImage = document.getElementById('fishImage');
              const fishName = document.getElementById('fishName');

              fishImage.src = '';
              fishName.textContent = "You need a Deep Sea Fishing Rod to fish here!\nVisit the shop at the fishing house to purchase one.";
              fishCaughtDiv.style.display = 'block';
      
              this.canCatchFish = false;
              return;
          }

  // Check if trying to fish in golden waters without the golden rod
          if (waterType === "golden" && !this.ownedItems.has('goldenrod')) {
              const fishCaughtDiv = document.getElementById('fishCaught');
              const fishImage = document.getElementById('fishImage');
              const fishName = document.getElementById('fishName');

              fishImage.src = '';
              fishName.textContent = "You need a Golden Fishing Rod to fish here!\nYou must first own the Deep Sea Fishing Rod before you can purchase the Golden Rod.";
              fishCaughtDiv.style.display = 'block';
      
              this.canCatchFish = false;
              return;
          }

  // Select appropriate fish list based on water type
          let availableFish;
          let waterName;

          switch(waterType) {
              case "shallow":
                  availableFish = SHALLOW_WATER_FISH;
                  waterName = "Shallow Water";
                  break;
              case "deep":
                  availableFish = DEEP_WATER_FISH;
                  waterName = "The Deeps";
                  break;
              case "golden":
                  availableFish = GOLDEN_FISH;
                  waterName = "Golden Waters";
                  break;
              default:
                  availableFish = OCEAN_FISH;
                  waterName = "Ocean";
          }

  // Generate a random number between 0 and 1
          const rand = Math.random();
  
  // Calculate total probability to normalize
          const totalProbability = availableFish.reduce((sum, fish) => sum + fish.rarity, 0);
          let cumulativeProbability = 0;
          let caughtFish = null;

  // Normalize probabilities and select fish
          for (const fish of availableFish) {
              cumulativeProbability += fish.rarity / totalProbability;
              if (rand <= cumulativeProbability && !caughtFish) {
                  caughtFish = fish;
              }
          }

  // Fallback to first fish if somehow none was selected
          if (!caughtFish) {
              caughtFish = availableFish[0];
          }

  const weight = generateFishWeight(
      caughtFish.minWeight,
      caughtFish.maxWeight,
      caughtFish.weightScale
  );

  // Update collection with water type tracking
          const collectionKey = `${caughtFish.name}_${waterType}`;
          if (!this.collection[collectionKey]) {
              this.collection[collectionKey] = {
                  name: caughtFish.name,
                  count: 0,
                  heaviest: 0,
                  image: caughtFish.image,
                  waterType: waterType,
          weights: [], // Store individual fish weights
          baseValue: waterType === "deep" ? 20 : (waterType === "shallow" ? 5 : 10) // Base values
              };
          }
          this.collection[collectionKey].count++;
  this.collection[collectionKey].weights.push(weight); // Store this fish weight
  this.collection[collectionKey].heaviest = Math.max(
      this.collection[collectionKey].heaviest,
      weight
  );

  // Update records
          if (!this.records.heaviest || weight > this.records.heaviest.weight) {
              this.records.heaviest = {
                  name: caughtFish.name,
                  weight: weight,
                  image: caughtFish.image,
                  waterType: waterType
              };
          }

  // Display the caught fish
          const fishCaughtDiv = document.getElementById('fishCaught');
          const fishImage = document.getElementById('fishImage');
          const fishName = document.getElementById('fishName');

          fishImage.src = caughtFish.image;
          fishName.textContent = `You caught a ${caughtFish.name}!\nWeight: ${weight} lbs\nCaught in: ${waterName}`;
          fishCaughtDiv.style.display = 'block';

          this.canCatchFish = false;
      }

      showCollection() {
          const collection = document.getElementById('collection');
          const fishGrid = document.getElementById('fishGrid');
          const inventoryGrid = document.getElementById('inventoryGrid');
          const fishInventoryGrid = document.getElementById('fishInventoryGrid');

  // Clear previous content
          fishGrid.innerHTML = '';
          inventoryGrid.innerHTML = '';
          fishInventoryGrid.innerHTML = '';

  // Function to create a fish section for a specific water type
          const createFishSection = (fishArray, title, color) => {
              const section = document.createElement('div');
              section.innerHTML = `<h2 style="color: ${color}; margin-top: 20px;">${title}</h2>`;
              const grid = document.createElement('div');
              grid.className = 'fish-grid';
              section.appendChild(grid);

      // Add all fish of this type
              fishArray.forEach(fish => {
                  const key = `${fish.name}_${title.toLowerCase().split(' ')[0]}`;
                  const data = this.collection[key];
                  grid.appendChild(createFishCard(fish, data));
              });

              fishGrid.appendChild(section);
          };

  // Function to create a fish card (either populated or blank)
          const createFishCard = (fish, data) => {
              const card = document.createElement('div');
              card.className = 'fish-card';
      
              if (data) {
          // Populated card for caught fish
                  card.innerHTML = `
                      <img src="${data.image}" alt="${fish.name}">
                      <h3>${fish.name}</h3>
                      <p>Caught: ${data.count}</p>
                      <p>Heaviest: ${data.heaviest} lbs</p>
                  `;
              } else {
          // Blank card for uncaught fish
                  card.innerHTML = `
                      <div style="width: 150px; height: 150px; background: rgba(255,255,255,0.1); margin: 0 auto;"></div>
                      <h3>${fish.name}</h3>
                      <p style="color: #666;">Not yet caught</p>
                  `;
              }
              return card;
          };

  // Create sections for each water type
          createFishSection(OCEAN_FISH, "Ocean", "#0077be");
          createFishSection(SHALLOW_WATER_FISH, "Shallow", "#00ffff");
          createFishSection(DEEP_WATER_FISH, "Deep", "#000066");
          createFishSection(GOLDEN_FISH, "Golden", "#FFD700");

  // Add inventory items (equipment)
          const upgrades = [
      {
          id: 'motor',
          name: 'High-Performance Motor',
          description: 'Doubles your boat speed',
          effect: 'Current boat speed: ' + (this.speed).toFixed(1) + ' units/s'
      },
      {
          id: 'deeprod',
          name: 'Deep Sea Fishing Rod',
          description: 'Allows fishing in The Deeps',
          effect: 'Enables catching rare deep water fish'
      },
      {
          id: 'goldenrod',
          name: 'Golden Fishing Rod',
          description: 'Required for fishing in Golden Waters',
          effect: 'Enables catching legendary golden fish'
      },
      {
          id: 'compass',
          name: 'Ancient Mariner\'s Compass',
          description: 'A weathered compass from the old fisherman',
          effect: 'Helps navigate to distant waters'
      }
          ];

          upgrades.forEach(upgrade => {
              const owned = this.ownedItems.has(upgrade.id);
      if (owned || upgrade.id === 'compass') { // Always show compass slot
                  const item = document.createElement('div');
                  item.className = `inventory-item ${owned ? 'owned' : ''}`;
                  item.innerHTML = `
                      <h3>${upgrade.name}</h3>
                      <p>${upgrade.description}</p>
              ${owned ? `<p style="color: #00ff00;">✓ Owned</p><p>${upgrade.effect}</p>` : 
                      '<p style="color: #ff0000;">✗ Not Owned</p>'}
                  `;
                  inventoryGrid.appendChild(item);
              }
          });

  // Add caught fish to fish inventory section
          let hasFish = false;
          for (const [key, data] of Object.entries(this.collection)) {
              if (data.count > 0) {
                  hasFish = true;
                  const waterTypeName = data.waterType === "shallow" ? "Shallow Water" : 
                                      data.waterType === "deep" ? "Deep Water" : 
                                      data.waterType === "golden" ? "Golden Waters" : "Ocean";
          
                  const fishItem = document.createElement('div');
                  fishItem.className = 'inventory-item fish';
                  fishItem.innerHTML = `
                      <img src="${data.image}" alt="${data.name}" style="width: 50px; height: 50px; object-fit: contain;">
                      <h3>${data.name}</h3>
                      <p>${waterTypeName}</p>
                      <p>Quantity: ${data.count}</p>
                      <p>Heaviest: ${data.heaviest} lbs</p>
                  `;
                  fishInventoryGrid.appendChild(fishItem);
              }
          }

          if (!hasFish) {
              const emptyMessage = document.createElement('p');
              emptyMessage.textContent = "You haven't caught any fish yet. Go fishing!";
              emptyMessage.style.textAlign = "center";
              emptyMessage.style.gridColumn = "1 / -1";
              fishInventoryGrid.appendChild(emptyMessage);
          }

          collection.style.display = 'block';
      }

      showFishShop() {
          const fishShop = document.getElementById('fishShop');
          const shopGrid = document.getElementById('shopGrid');
          const shopMoney = document.getElementById('shopMoney');
          const shopNotification = document.getElementById('shopNotification');
          const upgradeGrid = document.getElementById('upgradeGrid');

  // Clear previous content
          shopGrid.innerHTML = '';
          upgradeGrid.innerHTML = '';
          shopNotification.textContent = '';
          shopMoney.textContent = this.money;

  // Add shop items for each type of fish in collection
          for (const [key, data] of Object.entries(this.collection)) {
              if (data.count > 0) {
          // Calculate value based on rarity and weight
          let fishRarity = 0.2; // default
                  if (data.waterType === "shallow") {
                      fishRarity = SHALLOW_WATER_FISH.find(f => f.name === data.name)?.rarity || 0.2;
                  } else if (data.waterType === "deep") {
                      fishRarity = DEEP_WATER_FISH.find(f => f.name === data.name)?.rarity || 0.2;
                  } else {
                      fishRarity = OCEAN_FISH.find(f => f.name === data.name)?.rarity || 0.2;
                  }

          // Rarer fish are worth more
                  const rarityMultiplier = 1 + (1 - fishRarity) * 10;
          
          // Calculate value per fish
          const baseValue = data.baseValue || 
              (data.waterType === "deep" ? 20 : 
              (data.waterType === "shallow" ? 5 : 10));
                  const valuePerPound = baseValue * rarityMultiplier;
          
          // Calculate total potential value
                  let totalValue = 0;
                  for (const weight of data.weights) {
                      totalValue += Math.round(valuePerPound * weight);
                  }

          // Get water type name for display
                  const waterTypeName = data.waterType === "shallow" ? "Shallow Water" : 
                              data.waterType === "deep" ? "The Deeps" : "Ocean";

                  const item = document.createElement('div');
                  item.className = 'shop-item';
                  item.dataset.key = key;
                  item.innerHTML = `
                      <span class="count">${data.count}</span>
                      <img src="${data.image}" alt="${data.name}">
                      <h3>${data.name}</h3>
                      <p>${waterTypeName}</p>
                      <p class="price">${Math.round(valuePerPound)} coins per pound</p>
                      <button class="shop-button">Sell for ${totalValue} coins</button>
                  `;
          
          // Add click handler for selling
          item.querySelector('button').addEventListener('click', () => {
              this.sellFish(key);
          });
          
                  shopGrid.appendChild(item);
              }
          }

  // If no fish to sell
          if (shopGrid.children.length === 0) {
              shopGrid.innerHTML = '<p style="text-align:center;grid-column:1/-1;">You have no fish to sell. Go fishing first!</p>';
          }

  // Add upgrade items
          const upgrades = [
      {
          id: 'motor',
          name: 'High-Performance Motor',
          description: 'Doubles your boat speed',
          price: 1000,
          owned: this.ownedItems.has('motor')
      },
      {
          id: 'deeprod',
          name: 'Deep Sea Fishing Rod',
          description: 'Allows fishing in The Deeps',
          price: 2000,
          owned: this.ownedItems.has('deeprod')
      },
      {
          id: 'goldenrod',
          name: 'Golden Fishing Rod',
          description: 'Required for fishing in the Golden Waters',
          price: 10000,
          owned: this.ownedItems.has('goldenrod'),
          requires: 'deeprod'
      }
          ];

          upgrades.forEach(upgrade => {
              const item = document.createElement('div');
              item.className = `upgrade-item ${upgrade.owned ? 'owned' : ''}`;
      
      // Check if upgrade has requirements and they're not met
              const requirementMet = !upgrade.requires || this.ownedItems.has(upgrade.requires);
      const requirementText = upgrade.requires && !requirementMet ? 
          `<p style="color: #ff6666;">Requires Deep Sea Fishing Rod</p>` : '';
      
              item.innerHTML = `
                  <h3>${upgrade.name}</h3>
                  <p>${upgrade.description}</p>
                  ${requirementText}
                  <p class="price">${upgrade.price} coins</p>
                  <button ${upgrade.owned || !requirementMet ? 'disabled' : ''} data-id="${upgrade.id}">
                      ${upgrade.owned ? 'Owned' : (!requirementMet ? 'Locked' : 'Purchase')}
                  </button>
              `;
      
              const button = item.querySelector('button');
              button.addEventListener('click', () => this.purchaseUpgrade(upgrade));
      
              upgradeGrid.appendChild(item);
          });

          fishShop.style.display = 'block';
      }

      sellFish(fishKey) {
  if (!this.collection[fishKey] || this.collection[fishKey].count === 0) {
      return;
  }

  // Calculate fish value
          const data = this.collection[fishKey];
  let fishRarity = 0.2; // default
  
          if (data.waterType === "shallow") {
              fishRarity = SHALLOW_WATER_FISH.find(f => f.name === data.name)?.rarity || 0.2;
          } else if (data.waterType === "deep") {
              fishRarity = DEEP_WATER_FISH.find(f => f.name === data.name)?.rarity || 0.2;
          } else {
              fishRarity = OCEAN_FISH.find(f => f.name === data.name)?.rarity || 0.2;
          }

          const rarityMultiplier = 1 + (1 - fishRarity) * 10;
  const baseValue = data.baseValue || 
      (data.waterType === "deep" ? 20 : 
      (data.waterType === "shallow" ? 5 : 10));
          const valuePerPound = baseValue * rarityMultiplier;
  
  // Calculate total value
          let totalValue = 0;
          for (const weight of data.weights) {
              totalValue += Math.round(valuePerPound * weight);
          }

  // Add money
          this.money += totalValue;
  
  // Update money display
          document.getElementById('moneyDisplay').textContent = `${this.money} coins`;
          document.getElementById('shopMoney').textContent = this.money;

  // Show notification
          const notification = document.getElementById('shopNotification');
          notification.textContent = `Sold ${data.count} ${data.name}(s) for ${totalValue} coins!`;
          notification.style.color = '#00ff00';

  // Remove fish from inventory
          data.count = 0;
          data.weights = [];
  
  // Update shop
          this.showFishShop();
      }

      sellAllFish() {
          let totalSold = 0;
          let totalValue = 0;

          for (const [key, data] of Object.entries(this.collection)) {
              if (data.count > 0) {
          // Calculate fish value
          const fishRarity = data.isShallow ? 
              SHALLOW_WATER_FISH.find(f => f.name === data.name)?.rarity || 0.2 :
              DEEP_WATER_FISH.find(f => f.name === data.name)?.rarity || 0.2;

                  const rarityMultiplier = 1 + (1 - fishRarity) * 10;
          const baseValue = data.baseValue || (data.isShallow ? 5 : 10);
                  const valuePerPound = baseValue * rarityMultiplier;
          
          // Calculate value for this fish type
                  let fishValue = 0;
                  for (const weight of data.weights) {
                      fishValue += Math.round(valuePerPound * weight);
                  }

                  totalSold += data.count;
                  totalValue += fishValue;
          
          // Remove fish from inventory
                  data.count = 0;
                  data.weights = [];
              }
          }

          if (totalSold > 0) {
      // Add money
              this.money += totalValue;
      
      // Update money display
              document.getElementById('moneyDisplay').textContent = `${this.money} coins`;
              document.getElementById('shopMoney').textContent = this.money;

      // Show notification
              const notification = document.getElementById('shopNotification');
              notification.textContent = `Sold ${totalSold} fish for ${totalValue} coins!`;
              notification.style.color = '#00ff00';
      
      // Update shop
              this.showFishShop();
          }
      }

      checkProximityToShop() {
  // Calculate fishing house position in world coordinates
          const dockWorldPos = new THREE.Vector3();
  dock.getWorldPosition(dockWorldPos);
  
  // House is at the end of the dock
          const dockLength = 30;
          const houseLocal = new THREE.Vector3(0, 0, dockLength - 4);
  houseLocal.applyMatrix4(dock.matrixWorld);

  // Check distance between boat and fishing house
          const distance = this.group.position.distanceTo(houseLocal);
          const wasNearShop = this.nearShop;
  
  // If within 15 units, consider "near shop"
          this.nearShop = distance < 15;

  // If just entered shop range
          if (this.nearShop && !wasNearShop) {
      // Show notification
              const notification = document.createElement('div');
              notification.style.position = 'fixed';
              notification.style.top = '40%';
              notification.style.left = '50%';
              notification.style.transform = 'translate(-50%, -50%)';
              notification.style.background = 'rgba(0, 0, 0, 0.8)';
              notification.style.color = '#fff';
              notification.style.padding = '20px';
              notification.style.borderRadius = '10px';
              notification.style.fontFamily = 'Arial, sans-serif';
              notification.style.zIndex = '1001';
              notification.style.textAlign = 'center';
              notification.innerHTML = isMobile ? 
                  `<h3>Fish Market & Upgrades</h3><p>Tap the shop button (🏪) to open</p>` :
                  `<h3>Fish Market & Upgrades</h3><p>Press E to open shop</p>`;
      
              document.body.appendChild(notification);
      
              setTimeout(() => {
                  if (notification.parentNode) {
                      notification.parentNode.removeChild(notification);
                  }
              }, 3000);
          }

  // Update shop button visibility for mobile
          if (isMobile) {
              const shopButton = document.getElementById('shopButton');
              if (shopButton) {
                  shopButton.style.opacity = this.nearShop ? '1' : '0.5';
                  shopButton.style.pointerEvents = this.nearShop ? 'auto' : 'none';
              }
          }
      }

      update(time) {
  // Bob up and down
          this.group.position.y = 1 + Math.sin(time) * 0.2;

  // Update wake system even when not moving (for fade out)
          if (!keys.w) {
              this.updateWake(false);
          }

  // Animate fishing line and check for fish
          if (this.isFishing) {
              const linePositions = this.fishingLine.geometry.attributes.position.array;
      // Reduced bobbing amplitude from 0.1 to 0.05
              linePositions[4] = 0.2 + Math.sin(time * 2) * 0.05;
              this.fishingLine.geometry.attributes.position.needsUpdate = true;

      // Reduced glow effect amplitude
      this.glowRadius.material.opacity = 0.15 + Math.sin(time * 3) * 0.05;  // Reduced from 0.2 + sin * 0.1
      this.fishingRadius.material.opacity = 0.4 + Math.sin(time * 3) * 0.1;  // Reduced from 0.5 + sin * 0.2

      // Check for fish every update
              this.checkForFish();
          }

  // Check if near fishing house
          this.checkProximityToShop();
}

// Add method to show upgrade shop
showUpgradeShop() {
  const upgradeShop = document.getElementById('upgradeShop');
  const upgradeGrid = document.getElementById('upgradeGrid');
  
  // Clear previous content
  upgradeGrid.innerHTML = '';
  
  // Define available upgrades
  const upgrades = [
      {
          id: 'motor',
          name: 'High-Performance Motor',
          description: 'Doubles your boat speed',
          price: 1000,
          owned: this.ownedItems.has('motor')
      },
      {
          id: 'deeprod',
          name: 'Deep Sea Fishing Rod',
          description: 'Allows fishing in The Deeps',
          price: 2000,
          owned: this.ownedItems.has('deeprod')
      },
      {
          id: 'goldenrod',
          name: 'Golden Fishing Rod',
          description: 'Required for fishing in the Golden Waters',
          price: 10000,
          owned: this.ownedItems.has('goldenrod'),
          requires: 'deeprod'
      }
  ];
  
  // Add upgrade items to the grid
  upgrades.forEach(upgrade => {
      const item = document.createElement('div');
      item.className = `upgrade-item ${upgrade.owned ? 'owned' : ''}`;
      
      // Check if upgrade has requirements and they're not met
      const requirementMet = !upgrade.requires || this.ownedItems.has(upgrade.requires);
      const requirementText = upgrade.requires && !requirementMet ? 
          `<p style="color: #ff6666;">Requires Deep Sea Fishing Rod</p>` : '';
      
      item.innerHTML = `
          <h3>${upgrade.name}</h3>
          <p>${upgrade.description}</p>
          ${requirementText}
          <p class="price">${upgrade.price} coins</p>
          <button ${upgrade.owned || !requirementMet ? 'disabled' : ''} data-id="${upgrade.id}">
              ${upgrade.owned ? 'Owned' : (!requirementMet ? 'Locked' : 'Purchase')}
          </button>
      `;
      
      const button = item.querySelector('button');
      button.addEventListener('click', () => this.purchaseUpgrade(upgrade));
      
      upgradeGrid.appendChild(item);
  });
  
  upgradeShop.style.display = 'block';
}

// Add method to handle upgrade purchases
      purchaseUpgrade(upgrade) {
          if (this.money >= upgrade.price && !this.ownedItems.has(upgrade.id)) {
              this.money -= upgrade.price;
              this.ownedItems.add(upgrade.id);

      // Apply upgrade effects
              if (upgrade.id === 'motor') {
                  this.speed = this.baseSpeed * 2;
              }

      // Update money displays
              document.getElementById('moneyDisplay').textContent = `${this.money} coins`;
              document.getElementById('shopMoney').textContent = this.money;

      // Show success message
              const notification = document.createElement('div');
              notification.style.position = 'fixed';
              notification.style.top = '40%';
              notification.style.left = '50%';
              notification.style.transform = 'translate(-50%, -50%)';
              notification.style.background = 'rgba(0, 255, 0, 0.8)';
              notification.style.color = '#fff';
              notification.style.padding = '20px';
              notification.style.borderRadius = '10px';
              notification.style.fontFamily = 'Arial, sans-serif';
              notification.style.zIndex = '1001';
              notification.style.textAlign = 'center';
              notification.textContent = `Successfully purchased ${upgrade.name}!`;
      
              document.body.appendChild(notification);
              setTimeout(() => notification.remove(), 2000);

      // Refresh shop display
              this.showFishShop();
          }
      }

// Add after other methods
      checkNPCDistance() {
          const npcDistance = Math.sqrt(
              Math.pow(this.group.position.x - (-100), 2) + 
              Math.pow(this.group.position.z - (-60), 2)
          );
  
          const wasNearNPC = this.nearNPC;
          this.nearNPC = npcDistance < 30;

  // Update quest prompt visibility
          const questPrompt = document.getElementById('questPrompt');
          questPrompt.style.display = this.nearNPC ? 'block' : 'none';

  // Only trigger if state changed
          if (wasNearNPC !== this.nearNPC) {
              if (this.nearNPC) {
                  document.addEventListener('keydown', this.handleQuestKey);
              } else {
                  document.removeEventListener('keydown', this.handleQuestKey);
              }
          }
      }

      handleQuestKey = (e) => {
          if (e.key.toLowerCase() === 'e' && this.nearNPC) {
              this.showQuestMenu();
          }
      }

      showQuestMenu() {
          document.getElementById('questMenu').style.display = 'block';
  this.updateQuestStatus(); // Update quest status when opening menu
      }

// Add to the Boat class
      completeShallowFishQuest() {
  if (this.completedQuests.has('shallowFishQuest')) {
      return;
  }

  // Check if all shallow water fish are caught
          const allShallowFish = SHALLOW_WATER_FISH.map(fish => fish.name);
          const allCaught = allShallowFish.every(fishName => {
              const key = `${fishName}_shallow`;
              return this.collection[key] && this.collection[key].count > 0;
          });

          if (!allCaught) {
      // Show message if not all fish are caught
              const fishCaughtDiv = document.getElementById('fishCaught');
              const fishImage = document.getElementById('fishImage');
              const fishName = document.getElementById('fishName');
      
              fishImage.src = '';
              fishName.textContent = "\"Ye haven't caught all the shallow water fish yet, matey! I need one of each: Small Carp, Tropical Fish, Angelfish, Coral Fish, and Golden Minnow. Keep fishin'!\"";
              fishCaughtDiv.style.display = 'block';
              return;
          }

  // Mark quest as completed
          this.completedQuests.add('shallowFishQuest');
  
  // Add reward to inventory
          this.ownedItems.add('compass');

  // Remove the fish from inventory
          allShallowFish.forEach(fishName => {
              const key = `${fishName}_shallow`;
              if (this.collection[key]) {
          // Keep track of how many fish were given to the fisherman
          const fishGiven = this.collection[key].count;
          
          // Remove fish from inventory
                  this.collection[key].count = 0;
                  this.collection[key].weights = [];
          
          console.log(`Gave ${fishGiven} ${fishName}(s) to the Old Fisherman`);
              }
          });

  // Update UI
          this.updateQuestStatus();

  // Show completion message
          const fishCaughtDiv = document.getElementById('fishCaught');
          const fishImage = document.getElementById('fishImage');
          const fishName = document.getElementById('fishName');
  
          fishImage.src = '';
          fishName.textContent = "\"Arr, ye did it! These specimens are perfect for me research! I'll take those fish off yer hands now. Here's that ancient compass I promised ye. Found it years ago while sailin' the golden waters... it'll help ye navigate to treasures unknown!\"";
          fishCaughtDiv.style.display = 'block';

  // Update quest button
          const completeButton = document.getElementById('completeShallowFishQuest');
          completeButton.textContent = 'Completed';
          completeButton.disabled = true;
      }

      updateQuestStatus() {
  // Update shallow fish quest status
          const shallowFishList = document.getElementById('shallowFishList');
  if (!shallowFishList) return; // Guard clause in case element doesn't exist yet
  
          shallowFishList.innerHTML = '';

  // Get all shallow water fish
          const allShallowFish = SHALLOW_WATER_FISH.map(fish => fish.name);
  
  // Check which ones the player has caught
          let allCaught = true;

          allShallowFish.forEach(fishName => {
              const li = document.createElement('li');
      
      // Check if this fish is in the collection
              const key = `${fishName}_shallow`;
              const hasFish = this.collection[key] && this.collection[key].count > 0;
      
              if (hasFish) {
                  li.textContent = `${fishName} - Caught (${this.collection[key].count})`;
                  li.className = 'completed';
              } else {
                  li.textContent = `${fishName} - Not caught yet`;
                  li.className = 'missing';
                  allCaught = false;
              }
      
              shallowFishList.appendChild(li);
          });

  // Enable/disable complete button
          const completeButton = document.getElementById('completeShallowFishQuest');
          if (completeButton) {
              completeButton.disabled = !allCaught || this.completedQuests.has('shallowFishQuest');
      
              if (this.completedQuests.has('shallowFishQuest')) {
                  completeButton.textContent = 'Completed';
              }
          }
      }
  }

// Create boat instance
const boat = new Boat();
  scene.add(boat.group);

// Add fog for softer atmosphere
  scene.fog = new THREE.Fog(0x87CEEB, 800, 3000);

// Create Birds (after scene and before starting animation)
createBirds(scene, 30); // Increased from 15 to 30 birds

// Position camera
  camera.position.set(20, 20, 20);
  camera.lookAt(scene.position);

// Update key controls
const keys = {
w: false,
s: false,
a: false,
d: false,
space: false
};

// Update keyboard controls
  window.addEventListener('keydown', (e) => {
      switch(e.key.toLowerCase()) {
          case 'w': keys.w = true; break;
          case 's': keys.s = true; break;
          case 'a': keys.a = true; break;
          case 'd': keys.d = true; break;
          case ' ': 
      if (!keys.space) {
          boat.toggleFishing();
      }
              keys.space = true;
              break;
          case 'e':
      // Open shop if near fishing house
              if (boat.nearShop && document.getElementById('fishShop').style.display !== 'block') {
                  boat.showFishShop();
              }
              break;
      }
  });

  window.addEventListener('keyup', (e) => {
      switch(e.key.toLowerCase()) {
          case 'w': keys.w = false; break;
          case 's': keys.s = false; break;
          case 'a': keys.a = false; break;
          case 'd': keys.d = false; break;
          case ' ': keys.space = false; break;
      }
  });

// Animation variables
  let time = 0;
  const clock = new THREE.Clock(); // Add a clock to measure delta time

// Animation loop
  function animate() {
      requestAnimationFrame(animate);
      const deltaTime = clock.getDelta(); // Get time since last frame

// Handle boat movement
if (keys.w) {
  boat.moveForward();
}
if (keys.s) {
  boat.moveBackward();
}
if (keys.a) {
  boat.turnLeft();
}
if (keys.d) {
  boat.turnRight();
}

// Update boat and water
      time += deltaTime; // Use deltaTime for smoother time progression
      boat.update(time); // Pass consistent time if needed by boat later
      animateWater(time * 1000); // animateWater might use its own time calculation or could be updated
      updateBirds(time, deltaTime); // Pass time and deltaTime to birds update

// Update camera position while maintaining zoom level
      const boatPosition = boat.group.position.clone();

// Only update camera if boat has moved
      if (!boatPosition.equals(lastBoatPosition)) {
          controls.target.copy(boatPosition);
  
  // Get current camera direction relative to boat
          const directionToCamera = camera.position.clone().sub(controls.target).normalize();
  
  // Calculate desired height based on movement
  const baseHeight = 12; // Reduced from 20
  const forwardBoost = keys.w ? 6 : 0; // Reduced from 10
          const targetHeight = baseHeight + forwardBoost;
  
  // Blend current height with target height for smooth transition
          const currentHeight = camera.position.y;
          const smoothedHeight = currentHeight + (targetHeight - currentHeight) * 0.1;
  
  // Set camera position at the desired distance and height
          camera.position.copy(boatPosition.clone().add(directionToCamera.multiplyScalar(currentCameraDistance)));
          camera.position.y = smoothedHeight;
  
          lastBoatPosition.copy(boatPosition);
      }

// Apply damping to camera movement
      controls.update();

      renderer.render(scene, camera);

// Check NPC distance
      boat.checkNPCDistance();
  }

// Handle window resizing
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
}

animate();

// Add event listeners for collection UI
  document.querySelector('.close-btn').addEventListener('click', () => {
      document.getElementById('collection').style.display = 'none';
  });

// Add event listeners for shop UI
  document.querySelectorAll('.close-btn, .close-shop').forEach(btn => {
      btn.addEventListener('click', () => {
          document.getElementById('fishShop').style.display = 'none';
      });
  });

// Add sell all button handler
  document.getElementById('sellAll').addEventListener('click', () => {
      boat.sellAllFish();
  });

// Function to toggle collection visibility
  function toggleCollection() {
      const collection = document.getElementById('collection');
      if (collection.style.display === 'block') {
          collection.style.display = 'none';
      } else {
          boat.showCollection();
      }
  }

// Add Tab key handler for toggling collection
  window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
  e.preventDefault(); // Prevent tab from changing focus
          toggleCollection();
      }
  });

// Add mobile touch controls
      let moveJoystickActive = false;
      let turnJoystickActive = false;
      let moveJoystickTouchId = null;
      let turnJoystickTouchId = null;
      let moveJoystickCenter = { x: 0, y: 0 };
      let turnJoystickCenter = { x: 0, y: 0 };
      const moveJoystickArea = document.getElementById('moveJoystickArea');
      const turnJoystickArea = document.getElementById('turnJoystickArea');
      const moveJoystick = document.getElementById('moveJoystick');
      const turnJoystick = document.getElementById('turnJoystick');
      const fishButton = document.getElementById('fishButton');
      const collectionButton = document.getElementById('collectionButton');

      function handleJoystickStart(e, isMove) {
          e.preventDefault();
          e.stopPropagation();

// Get the touch that started in this joystick area
          const touch = e.changedTouches[0];

// Only proceed if we don't already have an active touch for this joystick
          if (isMove && !moveJoystickActive) {
              moveJoystickActive = true;
              moveJoystickTouchId = touch.identifier;
  
              const rect = moveJoystickArea.getBoundingClientRect();
              moveJoystickCenter.x = rect.left + rect.width / 2;
              moveJoystickCenter.y = rect.top + rect.height / 2;
  
              moveJoystick.style.transition = '';
              moveJoystick.style.transform = 'translate(-50%, -50%)';
              keys.w = keys.s = false;
  
          } else if (!isMove && !turnJoystickActive) {
              turnJoystickActive = true;
              turnJoystickTouchId = touch.identifier;
  
              const rect = turnJoystickArea.getBoundingClientRect();
              turnJoystickCenter.x = rect.left + rect.width / 2;
              turnJoystickCenter.y = rect.top + rect.height / 2;
  
              turnJoystick.style.transition = '';
              turnJoystick.style.transform = 'translate(-50%, -50%)';
              keys.a = keys.d = false;
          }
      }

// Track the last time we updated joystick positions to throttle updates
      let lastJoystickUpdate = 0;

      function handleJoystickMove(e) {
          e.preventDefault();
          e.stopPropagation();

// Throttle updates to improve performance (16ms ≈ 60fps)
          const now = performance.now();
          if (now - lastJoystickUpdate < 16) return;
          lastJoystickUpdate = now;

// Process each active touch
          for (let i = 0; i < e.changedTouches.length; i++) {
              const touch = e.changedTouches[i];
  
  // Update move joystick if this is its touch
              if (moveJoystickActive && touch.identifier === moveJoystickTouchId) {
                  updateJoystickPosition(touch.clientX, touch.clientY, true);
              }
  
  // Update turn joystick if this is its touch
              if (turnJoystickActive && touch.identifier === turnJoystickTouchId) {
                  updateJoystickPosition(touch.clientX, touch.clientY, false);
              }
          }
      }

      function handleJoystickEnd(e, isMove) {
          e.preventDefault();
          e.stopPropagation();

// Check each ended touch
          for (let i = 0; i < e.changedTouches.length; i++) {
              const touch = e.changedTouches[i];
  
  // Reset move joystick if its touch ended
              if (isMove && moveJoystickActive && touch.identifier === moveJoystickTouchId) {
                  moveJoystickActive = false;
                  moveJoystickTouchId = null;
                  moveJoystick.style.transition = 'transform 0.15s ease-out';
                  moveJoystick.style.transform = 'translate(-50%, -50%)';
                  keys.w = keys.s = false;
      
                  setTimeout(() => {
          if (!moveJoystickActive) {
              moveJoystick.style.transition = '';
          }
                  }, 150);
              }
  
  // Reset turn joystick if its touch ended
              if (!isMove && turnJoystickActive && touch.identifier === turnJoystickTouchId) {
                  turnJoystickActive = false;
                  turnJoystickTouchId = null;
                  turnJoystick.style.transition = 'transform 0.15s ease-out';
                  turnJoystick.style.transform = 'translate(-50%, -50%)';
                  keys.a = keys.d = false;
      
                  setTimeout(() => {
          if (!turnJoystickActive) {
              turnJoystick.style.transition = '';
          }
                  }, 150);
              }
          }
      }

      function updateJoystickPosition(x, y, isMove) {
          const center = isMove ? moveJoystickCenter : turnJoystickCenter;
          const joystick = isMove ? moveJoystick : turnJoystick;
          const dx = x - center.x;
          const dy = y - center.y;
          const maxDistance = 50;

          const distance = Math.sqrt(dx * dx + dy * dy);
          const normalizedDistance = Math.min(distance, maxDistance);
          const angle = Math.atan2(dy, dx);

          const joystickX = Math.cos(angle) * normalizedDistance;
          const joystickY = Math.sin(angle) * normalizedDistance;

joystick.style.transition = '';
          joystick.style.transform = `translate(calc(${joystickX}px - 50%), calc(${joystickY}px - 50%))`;

          const intensity = Math.min(distance / maxDistance, 1);
          const deadzone = 0.2;

          if (intensity > deadzone) {
              if (isMove) {
      // Forward/backward movement
                  const forward = -Math.cos(angle - Math.PI/2);
                  keys.w = forward > deadzone;
                  keys.s = forward < -deadzone;
              } else {
      // Left/right turning with reduced sensitivity
                  const right = Math.sin(angle - Math.PI/2);
      const turnDeadzone = 0.3; // Increased deadzone for turning
      const turnIntensity = Math.pow(intensity, 1.5); // Add non-linear scaling for smoother control
                  keys.a = right < -turnDeadzone && turnIntensity > turnDeadzone;
                  keys.d = right > turnDeadzone && turnIntensity > turnDeadzone;
              }
          } else {
  if (isMove) {
      keys.w = keys.s = false;
  } else {
      keys.a = keys.d = false;
  }
}
}

// Initialize mobile controls
if (isMobile) {
console.log("Mobile device detected, initializing mobile controls");

// Add touch event listeners for joysticks
      moveJoystickArea.addEventListener('touchstart', (e) => handleJoystickStart(e, true), { passive: false });
      turnJoystickArea.addEventListener('touchstart', (e) => handleJoystickStart(e, false), { passive: false });

      moveJoystickArea.addEventListener('touchmove', handleJoystickMove, { passive: false });
      turnJoystickArea.addEventListener('touchmove', handleJoystickMove, { passive: false });

      moveJoystickArea.addEventListener('touchend', (e) => handleJoystickEnd(e, true), { passive: false });
      moveJoystickArea.addEventListener('touchcancel', (e) => handleJoystickEnd(e, true), { passive: false });

      turnJoystickArea.addEventListener('touchend', (e) => handleJoystickEnd(e, false), { passive: false });
      turnJoystickArea.addEventListener('touchcancel', (e) => handleJoystickEnd(e, false), { passive: false });

// Handle mobile button touches with improved feedback
      function handleButtonTouch(button, action) {
          let isActive = false;
  
          button.addEventListener('touchstart', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isActive) {
                  isActive = true;
                  button.classList.add('mobile-active');
                  action();
              }
          }, { passive: false });

          button.addEventListener('touchend', (e) => {
              e.preventDefault();
              e.stopPropagation();
              isActive = false;
              button.classList.remove('mobile-active');
          });

          button.addEventListener('touchcancel', (e) => {
              e.preventDefault();
              e.stopPropagation();
              isActive = false;
              button.classList.remove('mobile-active');
          });
      }

// Set up fishing button
handleButtonTouch(fishButton, () => {
  boat.toggleFishing();
});

// Set up collection button
handleButtonTouch(collectionButton, () => {
  toggleCollection();
});

// Set up shop button
const shopButton = document.getElementById('shopButton');
      handleButtonTouch(shopButton, () => {
  if (boat.nearShop) {
      boat.showFishShop();
  }
      });

// Initialize shop button state
      shopButton.style.opacity = '0.5';
      shopButton.style.pointerEvents = 'none';

// Prevent default touch behavior only on game controls
      document.addEventListener('touchmove', (e) => {
  if (e.target.closest('.joystickArea, .mobileButton')) {
      e.preventDefault();
  }
      }, { passive: false });

// Allow zooming on the canvas with two fingers
      renderer.domElement.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
      e.stopPropagation();
  }
      }, { passive: true });

// Update fishing popup text for mobile
      const fishingText = document.querySelector('#fishCaught p:last-child');
      fishingText.textContent = 'Tap fishing button to continue';
  }

  animate();

// Add event listeners for upgrade shop UI
document.querySelectorAll('#fishShop .close-btn, #fishShop .close-shop').forEach(btn => {
btn.addEventListener('click', () => {
  document.getElementById('fishShop').style.display = 'none';
});
});

// Add tab switching functionality
  document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
  // Remove active class from all tabs and content
          document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.shop-content').forEach(c => c.classList.remove('active'));
  
  // Add active class to clicked tab and corresponding content
          tab.classList.add('active');
          document.getElementById(tab.dataset.tab + 'Content').classList.add('active');
      });
  });

// Add tab switching functionality for collection
  document.querySelectorAll('.collection-tab').forEach(tab => {
      tab.addEventListener('click', () => {
  // Remove active class from all tabs and content
          document.querySelectorAll('.collection-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.collection-content').forEach(c => c.classList.remove('active'));
  
  // Add active class to clicked tab and corresponding content
          tab.classList.add('active');
          document.getElementById(tab.dataset.tab + 'Content').classList.add('active');
      });
  });

// Add golden zone creation after other zone creations
WaterZones.createGoldenWaterZone(scene, goldenZoneLocation.x, goldenZoneLocation.z, goldenZoneLocation.size);

// Create NPC boat near starting area
createNPCBoat(-100, -60, scene);

// Add quest menu close functionality after other event listeners
  document.querySelector('.close-quest').addEventListener('click', () => {
      document.getElementById('questMenu').style.display = 'none';
  });

// Add event listener for quest completion after other event listeners
  document.getElementById('completeShallowFishQuest').addEventListener('click', () => {
      boat.completeShallowFishQuest();
  });
});