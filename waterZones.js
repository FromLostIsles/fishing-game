const WaterZones = {
    islands: [],
    deepWaterZones: [],
    goldenWaterZones: [],

    // Initialize with the islands array from game.js
    init(islands) {
        this.islands = islands;
    },

    // Create shallow water terrain around islands
    createUnderwaterTerrain(scene, x, z, size) {
        const segments = 64;
        const points = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const radius = size * 2.2 * (1 +
                Math.sin(angle * 2) * 0.15 +
                Math.cos(angle * 3) * 0.1 +
                Math.sin(angle * 4) * 0.05
            );
            points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
        }

        const shapeGeometry = new THREE.ShapeGeometry(new THREE.Shape(points));
        const shallowMaterial = new THREE.MeshPhongMaterial({
            color: 0x40E0D0,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            shininess: 100,
            specularHm: 0x666666,
            depthWrite: false,
            depthTest: true,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -4
        });

        const shallowWater = new THREE.Mesh(shapeGeometry, shallowMaterial);
        shallowWater.rotation.x = -Math.PI / 2;
        shallowWater.position.set(x, 0.1, z);
        shallowWater.renderOrder = 1;
        scene.add(shallowWater);
    },

    // Create a deep water zone
    createDeepWaterZone(scene, x, z, size) {
        const segments = 64;
        const points = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const radius = size * (1 +
                Math.sin(angle * 3) * 0.1 +
                Math.cos(angle * 2) * 0.15 +
                Math.sin(angle * 5) * 0.05
            );
            points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
        }

        const shapeGeometry = new THREE.ShapeGeometry(new THREE.Shape(points));
        const deepMaterial = new THREE.MeshPhongMaterial({
            color: 0x001428,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            shininess: 30,
            specular: 0x222222,
            depthWrite: false,
            depthTest: true,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -3
        });

        const deepWater = new THREE.Mesh(shapeGeometry, deepMaterial);
        deepWater.rotation.x = -Math.PI / 2;
        deepWater.position.set(x, 0.15, z);
        deepWater.renderOrder = 2;
        scene.add(deepWater);

        this.deepWaterZones.push({ position: new THREE.Vector2(x, z), size: size });
    },

    // Create a golden water zone
    createGoldenWaterZone(scene, x, z, size) {
        const segments = 64;
        const points = [];

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const radius = size * (1 +
                Math.sin(angle * 3) * 0.1 +
                Math.cos(angle * 2) * 0.15 +
                Math.sin(angle * 5) * 0.05
            );
            points.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
        }

        const shapeGeometry = new THREE.ShapeGeometry(new THREE.Shape(points));
        const goldenMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            shininess: 100,
            specular: 0xFFFFFF,
            depthWrite: false,
            depthTest: true,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -3
        });

        const goldenWater = new THREE.Mesh(shapeGeometry, goldenMaterial);
        goldenWater.rotation.x = -Math.PI / 2;
        goldenWater.position.set(x, 0.15, z);
        goldenWater.renderOrder = 2;
        scene.add(goldenWater);

        this.goldenWaterZones.push({ position: new THREE.Vector2(x, z), size: size });
    },

    // Check if a point is in shallow water
    isInShallowWater(x, z) {
        for (const island of this.islands) {
            const dx = x - island.position.x;
            const dz = z - island.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const shallowRadius = island.scale.x * 35 * 2.2;
            if (distance <= shallowRadius) {
                return true;
            }
        }
        return false;
    },

    // Check if a point is in deep water
    isInDeepWater(x, z) {
        for (const zone of this.deepWaterZones) {
            const dx = x - zone.position.x;
            const dz = z - zone.position.y;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance <= zone.size) {
                return true;
            }
        }
        return false;
    },

    // Check if a point is in golden water
    isInGoldenWater(x, z) {
        for (const zone of this.goldenWaterZones) {
            const dx = x - zone.position.x;
            const dz = z - zone.position.y;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance <= zone.size) {
                return true;
            }
        }
        return false;
    }
};