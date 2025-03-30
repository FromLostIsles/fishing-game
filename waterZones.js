function createUnderwaterTerrain(scene, x, z, size) {
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
        specular: 0x666666,
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
}