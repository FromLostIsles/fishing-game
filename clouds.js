// Global array to hold cloud objects
const clouds = [];
const CLOUD_DRIFT_SPEED = 0.05; // How fast clouds move
const CLOUD_ALTITUDE_MIN = 100; // Minimum cloud height
const CLOUD_ALTITUDE_MAX = 150; // Maximum cloud height
const CLOUD_SPREAD_XZ = 1500; // How far clouds spread horizontally from center
const CLOUD_WRAP_BOUNDARY = 1800; // When clouds wrap around

// Performance settings
const CLOUD_COUNT = 15; // Further reduced for bigger clouds
const MAX_PLANES_PER_CLOUD = 15; // Reduced from potentially 90+ planes
const FRUSTUM_CULLING_DISTANCE = 1000; // Don't update clouds beyond this distance

// Texture Loader for clouds
const textureLoader = new THREE.TextureLoader();
let cloudTexture = null;
let cloudMaterials = []; // Pre-created materials for reuse

// Create a procedural cloud texture if external file doesn't load
function createProceduralCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Reduced from 256 for better performance
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Create radial gradient (white in center, transparent at edges)
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some noise (fewer particles)
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 1.5 + 0.5;
        const alpha = Math.random() * 0.05;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// Try to load texture, or create procedural one
textureLoader.load(
    'textures/cloud_particle.png',
    function (texture) {
        cloudTexture = texture;
        createSharedMaterials(); // Create shared materials now that texture is loaded
    },
    undefined,
    function (err) {
        console.warn('Using procedural cloud texture instead.');
        cloudTexture = createProceduralCloudTexture();
        createSharedMaterials(); // Create shared materials with procedural texture
    }
);

// Create a set of shared materials (better for performance)
function createSharedMaterials() {
    // Create a small set of materials with different opacities
    const opacityLevels = [0.2, 0.3, 0.4, 0.5];
    
    opacityLevels.forEach(opacity => {
        const material = new THREE.MeshLambertMaterial({
            map: cloudTexture,
            color: 0xffffff,
            transparent: true,
            opacity: opacity,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        cloudMaterials.push(material);
    });
}

// Create geometry pool for reuse
const planeGeometries = [];
function getPlaneGeometry(width, height) {
    // Round sizes to nearest 10 to limit geometry variations
    const roundedWidth = Math.round(width / 10) * 10;
    const roundedHeight = Math.round(height / 10) * 10;
    
    // Create a key for this geometry size
    const geometryKey = `${roundedWidth}_${roundedHeight}`;
    
    // Check if we already have this geometry
    const existing = planeGeometries.find(g => g.userData.key === geometryKey);
    if (existing) return existing;
    
    // Create new geometry if needed
    const geometry = new THREE.PlaneGeometry(roundedWidth, roundedHeight, 1, 1);
    geometry.userData.key = geometryKey;
    planeGeometries.push(geometry);
    return geometry;
}

// Helper function to create a single optimized cloud with more horizontal layout
function createCloudMesh() {
    const cloudGroup = new THREE.Group();
    
    // If materials aren't ready yet, create a simple placeholder
    if (cloudMaterials.length === 0) {
        const placeholderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            depthWrite: false
        });
        cloudMaterials = [placeholderMaterial];
    }
    
    // Create main layers for the cloud (horizontal strata)
    const layerCount = Math.floor(Math.random() * 2) + 2; // 2-3 vertical layers
    const layerSpacing = 10; // Vertical distance between layers
    
    for (let layer = 0; layer < layerCount; layer++) {
        // Each layer has multiple planes arranged horizontally
        const planesInLayer = Math.floor(Math.random() * 5) + 4; // 4-8 planes per layer
        
        for (let i = 0; i < planesInLayer; i++) {
            // Make planes much wider than tall for horizontal strata
            const width = 60 + Math.random() * 80; // 60-140 width
            const height = 25 + Math.random() * 25; // 25-50 height - much shorter than wide
            
            // Get geometry from pool
            const planeGeometry = getPlaneGeometry(width, height);
            
            // Pick a random material from our shared set
            const material = cloudMaterials[Math.floor(Math.random() * cloudMaterials.length)];
            
            const planeMesh = new THREE.Mesh(planeGeometry, material);
            
            // Position planes horizontally with wide spread, minimal vertical variance
            planeMesh.position.set(
                (Math.random() - 0.5) * width * 1.5, // Wide horizontal spread 
                layer * layerSpacing + (Math.random() - 0.5) * 5, // Layered height with minimal variation
                (Math.random() - 0.5) * width * 0.8  // Moderate depth spread
            );
            
            // Primarily horizontal rotation (around Y axis)
            // Keep X and Z rotations minimal to avoid vertical-looking planes
            planeMesh.rotation.set(
                (Math.random() - 0.5) * 0.3, // Keep X rotation minimal (near horizontal)
                Math.random() * Math.PI * 2, // Full rotation around Y is fine
                (Math.random() - 0.5) * 0.3  // Keep Z rotation minimal 
            );
            
            cloudGroup.add(planeMesh);
        }
    }
    
    // Make clouds MUCH larger overall
    const cloudScale = Math.random() * 3.0 + 5.0; // Scale 5.0-8.0 (much bigger)
    cloudGroup.scale.setScalar(cloudScale);
    
    // Add userData for optimization
    cloudGroup.userData.lastUpdateTime = 0;
    cloudGroup.userData.updateInterval = 100 + Math.random() * 100; // Milliseconds between updates
    
    return cloudGroup;
}

// Function to create multiple clouds and add them to the scene
function createClouds(scene, count = CLOUD_COUNT) {
    console.log(`Creating ${count} large horizontal clouds...`);
    
    // If texture/materials aren't ready, delay cloud creation
    if (!cloudTexture) {
        setTimeout(() => createClouds(scene, count), 500);
        return;
    }
    
    // Create clouds with wider spacing (fewer but bigger)
    for (let i = 0; i < count; i++) {
        const cloudMesh = createCloudMesh();
        
        // Set initial position - spread them out more
        cloudMesh.position.set(
            (Math.random() - 0.5) * 2 * CLOUD_SPREAD_XZ,
            CLOUD_ALTITUDE_MIN + Math.random() * (CLOUD_ALTITUDE_MAX - CLOUD_ALTITUDE_MIN),
            (Math.random() - 0.5) * 2 * CLOUD_SPREAD_XZ
        );
        
        // Assign drift properties - slower for big clouds
        cloudMesh.userData.drift = new THREE.Vector3(
            (Math.random() - 0.4) * CLOUD_DRIFT_SPEED * 0.7, // Slower drift for larger clouds
            0,
            (Math.random() - 0.5) * 0.5 * CLOUD_DRIFT_SPEED * 0.7
        );
        
        // Much slower rotation - only on Y axis for better performance
        cloudMesh.userData.rotationSpeed = Math.random() * 0.00002 - 0.00001;
        
        scene.add(cloudMesh);
        clouds.push(cloudMesh);
    }
}

// Frustum for culling
const _frustum = new THREE.Frustum();
const _cameraViewProjectionMatrix = new THREE.Matrix4();
let _cameraPosition = new THREE.Vector3();

// Function to update cloud positions - with optimizations
function updateClouds(deltaTime, camera) {
    // Update frustum for culling
    if (camera) {
        _cameraPosition = camera.position.clone();
        camera.updateMatrixWorld(); // Make sure camera matrices are up to date
        _cameraViewProjectionMatrix.multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse
        );
        _frustum.setFromProjectionMatrix(_cameraViewProjectionMatrix);
    }
    
    // Track current time for time-based updates
    const currentTime = performance.now();
    
    clouds.forEach(cloud => {
        // Distance-based culling - don't update distant clouds every frame
        const distanceToCamera = camera ? 
            cloud.position.distanceTo(_cameraPosition) : 0;
        
        // Update position less frequently for distant clouds
        const updateNeeded = 
            currentTime - cloud.userData.lastUpdateTime > cloud.userData.updateInterval ||
            distanceToCamera < 500; // Always update nearby clouds
        
        if (updateNeeded) {
            // Move the cloud based on drift
            cloud.position.addScaledVector(cloud.userData.drift, deltaTime);
            
            // Simple Y-only rotation for better performance
            cloud.rotation.y += cloud.userData.rotationSpeed * deltaTime * 60;
            
            // Store update time
            cloud.userData.lastUpdateTime = currentTime;
            
            // Only check wrapping when actually updating
            // Wrapping logic (simplified slightly)
            if (cloud.position.x > CLOUD_WRAP_BOUNDARY) {
                cloud.position.x = -CLOUD_WRAP_BOUNDARY;
                cloud.position.z = (Math.random() - 0.5) * 2 * CLOUD_SPREAD_XZ;
                cloud.position.y = CLOUD_ALTITUDE_MIN + Math.random() * (CLOUD_ALTITUDE_MAX - CLOUD_ALTITUDE_MIN);
            }
            else if (cloud.position.x < -CLOUD_WRAP_BOUNDARY) {
                cloud.position.x = CLOUD_WRAP_BOUNDARY;
                cloud.position.z = (Math.random() - 0.5) * 2 * CLOUD_SPREAD_XZ;
                cloud.position.y = CLOUD_ALTITUDE_MIN + Math.random() * (CLOUD_ALTITUDE_MAX - CLOUD_ALTITUDE_MIN);
            }
            
            if (cloud.position.z > CLOUD_WRAP_BOUNDARY) {
                cloud.position.z = -CLOUD_WRAP_BOUNDARY;
                cloud.position.x = (Math.random() - 0.5) * 2 * CLOUD_SPREAD_XZ;
                cloud.position.y = CLOUD_ALTITUDE_MIN + Math.random() * (CLOUD_ALTITUDE_MAX - CLOUD_ALTITUDE_MIN);
            } 
            else if (cloud.position.z < -CLOUD_WRAP_BOUNDARY) {
                cloud.position.z = CLOUD_WRAP_BOUNDARY;
                cloud.position.x = (Math.random() - 0.5) * 2 * CLOUD_SPREAD_XZ;
                cloud.position.y = CLOUD_ALTITUDE_MIN + Math.random() * (CLOUD_ALTITUDE_MAX - CLOUD_ALTITUDE_MIN);
            }
        }
        
        // Toggle visibility based on distance (another optimization)
        if (camera) {
            const isTooFar = distanceToCamera > FRUSTUM_CULLING_DISTANCE;
            cloud.visible = !isTooFar;
        }
    });
} 