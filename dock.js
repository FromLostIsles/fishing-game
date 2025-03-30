function createDock(startX, startZ, angle, scene) {
    const dock = new THREE.Group();

    // Create wooden planks for the dock
    const dockLength = 30;
    const dockWidth = 6;
    const plankGeometry = new THREE.BoxGeometry(dockWidth, 0.4, 2);
    const woodMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513,
        flatShading: true
    });

    // Add planks
    for (let i = 0; i < dockLength; i += 2) {
        const plank = new THREE.Mesh(plankGeometry, woodMaterial);
        plank.position.set(0, 0.2, i);
        dock.add(plank);
    }

    // Add support beams
    const supportGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    for (let i = 2; i < dockLength; i += 6) {
        const leftSupport = new THREE.Mesh(supportGeometry, woodMaterial);
        const rightSupport = new THREE.Mesh(supportGeometry, woodMaterial);
        leftSupport.position.set(-2.5, -0.8, i);
        rightSupport.position.set(2.5, -0.8, i);
        dock.add(leftSupport);
        dock.add(rightSupport);
    }

    // Create fishing house
    const house = new THREE.Group();

    // House base
    const baseGeometry = new THREE.BoxGeometry(8, 4, 8);
    const houseMaterial = new THREE.MeshPhongMaterial({
        color: 0xA0522D
    });
    const base = new THREE.Mesh(baseGeometry, houseMaterial);
    base.position.y = 2;
    house.add(base);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(6, 4, 4);
    const roofMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 5;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);

    // Window
    const windowGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    const windowMaterial = new THREE.MeshPhongMaterial({
        color: 0x87CEEB,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(4.01, 2, 0);
    window1.rotation.y = Math.PI / 2;
    house.add(window1);

    // Door
    const doorGeometry = new THREE.PlaneGeometry(2, 3);
    const doorMaterial = new THREE.MeshPhongMaterial({
        color: 0x4A3B22,
        side: THREE.DoubleSide
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, 4.01);
    house.add(door);

    // Position house at the end of dock
    house.position.z = dockLength - 4;
    dock.add(house);

    // Position and rotate entire dock
    dock.position.set(startX, 0, startZ);
    dock.rotation.y = angle;

    // Add dock to the scene
    scene.add(dock);
    return dock;
}