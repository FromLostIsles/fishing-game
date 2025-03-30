function createIsland(x, z, size, height, complexity) {
const island = new THREE.Group();

// Create a spherical cap for the island base
const segments = complexity * 2;
const baseGeometry = new THREE.SphereGeometry(size, segments, segments / 2, 0, Math.PI * 2, 0, Math.PI / 2);
const baseMaterial = new THREE.MeshPhongMaterial({ 
  color: 0xC2B280,
  flatShading: false
});
const base = new THREE.Mesh(baseGeometry, baseMaterial);

// Scale the geometry to create the desired height
base.scale.set(1, height / size, 1);

// Add smooth terrain variation
const vertices = base.geometry.attributes.position.array;
for (let i = 0; i < vertices.length; i += 3) {
  const x = vertices[i];
  const y = vertices[i + 1];
  const z = vertices[i + 2];
  
  // Calculate distance from center
  const distanceFromCenter = Math.sqrt(x * x + z * z);
  const normalizedDistance = distanceFromCenter / size;
  
  // Add subtle height variation using multiple sine waves
  if (y > 0) {
      const variation = 
          Math.sin(normalizedDistance * 5) * 0.1 +
          Math.sin(normalizedDistance * 8 + x * 0.2) * 0.05 +
          Math.sin(normalizedDistance * 6 + z * 0.2) * 0.05;
      
      vertices[i + 1] += variation;
  }
}
base.geometry.attributes.position.needsUpdate = true;
base.geometry.computeVertexNormals();

// Add vegetation (trees) with better placement
const treeCount = Math.floor(size * 1.5);
for (let i = 0; i < treeCount; i++) {
  const treeGeometry = new THREE.ConeGeometry(1.2, 3, 8);  // Doubled size
  const treeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x2D5A27,
      flatShading: false
  });
  const tree = new THREE.Mesh(treeGeometry, treeMaterial);
  
  // Place trees on the curved surface
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * (size * 0.7);
  const treeX = Math.cos(angle) * radius;
  const treeZ = Math.sin(angle) * radius;
  
  // Calculate Y position based on sphere surface
  const normalizedRadius = radius / size;
  const sphereY = Math.sqrt(1 - normalizedRadius * normalizedRadius) * height;
  
  // Position the tree
  tree.position.set(treeX, sphereY + 1.5, treeZ);
  
  // Calculate surface normal but only use it for minimal tilt
  const surfaceNormal = new THREE.Vector3(treeX, sphereY, treeZ).normalize();
  const upVector = new THREE.Vector3(0, 1, 0);
  
  // Create a quaternion for the rotation
  const quaternion = new THREE.Quaternion();
  const tiltAmount = 0.1; // Reduced tilt for more upright trees
  
  // Interpolate between up vector and surface normal
  quaternion.setFromUnitVectors(upVector, new THREE.Vector3().copy(upVector).lerp(surfaceNormal, tiltAmount));
  tree.setRotationFromQuaternion(quaternion);
  
  // Random rotation around Y axis only
  tree.rotateY(Math.random() * Math.PI * 2);
  
  // Random scale variation (but maintaining larger overall size)
  const scale = 1.2 + Math.random() * 0.4;
  tree.scale.set(scale, scale, scale);
  
  island.add(tree);
}

island.add(base);
island.position.set(x, 0, z);
return island;
}