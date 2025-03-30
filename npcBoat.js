function createNPCBoat(x, z, scene){
const npcBoat = new THREE.Group();

// Hull (similar to player boat but different color)
const hullGeometry = new THREE.BoxGeometry(8, 3, 15);
const hullMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Darker brown color
const hull = new THREE.Mesh(hullGeometry, hullMaterial);
hull.position.y = 1;
npcBoat.add(hull);

// Cabin
const cabinGeometry = new THREE.BoxGeometry(6, 4, 6);
const cabinMaterial = new THREE.MeshPhongMaterial({ color: 0xCD853F }); // Lighter brown
const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
cabin.position.set(0, 4, -2);
npcBoat.add(cabin);

// Mast
const mastGeometry = new THREE.CylinderGeometry(0.3, 0.3, 12);
const mastMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
const mast = new THREE.Mesh(mastGeometry, mastMaterial);
mast.position.set(0, 8, 2);
npcBoat.add(mast);

// Sail
const sailGeometry = new THREE.PlaneGeometry(6, 8);
const sailMaterial = new THREE.MeshPhongMaterial({ 
  color: 0xF5DEB3,
  side: THREE.DoubleSide 
});
const sail = new THREE.Mesh(sailGeometry, sailMaterial);
sail.position.set(2, 8, 2);
sail.rotation.y = Math.PI / 4;
npcBoat.add(sail);

// Position the NPC boat
npcBoat.position.set(x, 0, z);
npcBoat.rotation.y = Math.PI / 6; // Slight rotation for visual interest
scene.add(npcBoat);
}