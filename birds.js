// Global array to hold all bird instances
const birds = [];
const BIRD_FLAP_SPEED = 20; // Faster flapping
const BIRD_FLIGHT_SPEED_FACTOR = 0.05; // Slower flight path speed
const BIRD_VERTICAL_OSCILLATION = 2; // How much birds move up/down
const BIRD_VERTICAL_SPEED_FACTOR = 0.1; // Speed of vertical movement
const BIRD_DRIFT_SPEED = 0.1; // Speed at which the center of the flight path moves

class Bird {
    constructor(scene, startPos = new THREE.Vector3(0, 50, 0), flightRadius = 50, color = 0xffffff) {
        this.scene = scene;
        this.initialStartPos = startPos.clone(); // Keep the original start for reference if needed
        this.currentCenter = startPos.clone(); // This will be the moving center
        this.flightRadius = flightRadius;
        this.color = color;

        this.speed = (Math.random() * 0.5 + 0.5) * BIRD_FLIGHT_SPEED_FACTOR; // Randomize speed slightly
        this.verticalSpeed = (Math.random() * 0.5 + 0.5) * BIRD_VERTICAL_SPEED_FACTOR;
        this.phaseOffset = Math.random() * Math.PI * 2; // Random start position in flight path
        this.verticalPhaseOffset = Math.random() * Math.PI * 2; // Random start in vertical oscillation

        // Assign a random drift direction (normalized)
        this.driftDirection = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            0, // Birds drift horizontally
            (Math.random() - 0.5) * 2
        ).normalize();

        this.group = new THREE.Group();

        // Simple bird geometry
        const bodyGeometry = new THREE.ConeGeometry(0.3, 1, 8); // Body shape
        const wingGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.5); // Wing shape

        const material = new THREE.MeshBasicMaterial({ color: this.color });

        // Body
        this.body = new THREE.Mesh(bodyGeometry, material);
        this.body.rotation.x = Math.PI / 2; // Point forward
        this.group.add(this.body);

        // Left Wing
        this.leftWing = new THREE.Mesh(wingGeometry, material);
        this.leftWing.position.set(-0.75, 0, 0); // Position relative to body center
        this.group.add(this.leftWing);

        // Right Wing
        this.rightWing = new THREE.Mesh(wingGeometry, material);
        this.rightWing.position.set(0.75, 0, 0); // Position relative to body center
        this.group.add(this.rightWing);

        this.group.position.copy(this.currentCenter); // Start at the initial center
        this.scene.add(this.group);
    }

    update(time, deltaTime) { // Added deltaTime for consistent drift speed
        // Update the center position based on drift
        this.currentCenter.addScaledVector(this.driftDirection, BIRD_DRIFT_SPEED * deltaTime);

        // --- Keep birds within a general boundary (optional, prevents them flying too far) ---
        const boundary = 1800; // Half the size of the skybox/water
        if (Math.abs(this.currentCenter.x) > boundary || Math.abs(this.currentCenter.z) > boundary) {
            // Simple reversal: Point drift back towards the center of the world
            this.driftDirection.copy(this.currentCenter).multiplyScalar(-1).normalize();
             // Add a slight random nudge to avoid getting stuck on axes
            this.driftDirection.x += (Math.random() - 0.5) * 0.1;
            this.driftDirection.z += (Math.random() - 0.5) * 0.1;
            this.driftDirection.normalize();
        }
        // --- End Boundary Check ---

        // Wing flap animation
        const flapAngle = Math.sin(time * BIRD_FLAP_SPEED + this.phaseOffset) * Math.PI / 6; // Angle range: -30 to +30 degrees
        this.leftWing.rotation.z = flapAngle;
        this.rightWing.rotation.z = -flapAngle;

        // Circular flight path animation relative to the *current center*
        const angle = time * this.speed + this.phaseOffset;
        const x = this.currentCenter.x + Math.cos(angle) * this.flightRadius;
        const z = this.currentCenter.z + Math.sin(angle) * this.flightRadius;

        // Vertical oscillation relative to the *current center*
        const y = this.currentCenter.y + Math.sin(time * this.verticalSpeed + this.verticalPhaseOffset) * BIRD_VERTICAL_OSCILLATION;

        const nextPosition = new THREE.Vector3(x, y, z);

        // Calculate the look-at target relative to the *current center*
        const lookAtTarget = new THREE.Vector3(
            this.currentCenter.x - Math.sin(angle) * this.flightRadius,
            y,
            this.currentCenter.z + Math.cos(angle) * this.flightRadius
        );
        
        // Add the drift direction influence to the lookAt target for more natural turning
        lookAtTarget.addScaledVector(this.driftDirection, 10); // Look slightly ahead in drift direction

        this.group.lookAt(lookAtTarget);
        this.group.rotateY(Math.PI); // Adjust rotation

        // Apply the calculated position
        this.group.position.copy(nextPosition);
    }
}

// Function to create multiple birds
function createBirds(scene, count = 10) {
    for (let i = 0; i < count; i++) {
        // Distribute birds around the world
        const startX = (Math.random() - 0.5) * 1000; // Spread over a larger area
        const startZ = (Math.random() - 0.5) * 1000;
        const startY = 15 + Math.random() * 15; // Lowered altitude range (was 40 + Math.random() * 20)
        const radius = 30 + Math.random() * 40; // Vary flight radius
        const color = Math.random() > 0.5 ? 0xffffff : 0xaaaaaa; // White or grey birds

        const bird = new Bird(scene, new THREE.Vector3(startX, startY, startZ), radius, color);
        birds.push(bird);
    }
}

// Function to update all birds in the animation loop
function updateBirds(time, deltaTime) { // Added deltaTime
    birds.forEach(bird => bird.update(time, deltaTime)); // Pass deltaTime to each bird
} 