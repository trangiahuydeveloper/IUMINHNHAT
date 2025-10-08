import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---- KHỞI TẠO SCENE, CAMERA, RENDERER ----
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(0, 20, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('container').appendChild(renderer.domElement);

// ---- KHỞI TẠO CONTROLS ----
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enabled = false;
controls.target.set(0, 0, 0);
controls.enablePan = false;
controls.minDistance = 15;
controls.maxDistance = 300;
controls.zoomSpeed = 0.3;
controls.rotateSpeed = 0.3;
controls.update();

// ---- HÀM TIỆN ÍCH TẠO HIỆU ỨNG GLOW ----
function createGlowMaterial(color, size = 128, opacity = 0.55) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  return new THREE.Sprite(material);
}

// ---- TẠO CÁC THÀNH PHẦN CỦA SCENE ----

// Glow trung tâm
const centralGlow = createGlowMaterial('rgba(255,255,255,0.8)', 156, 0.25);
centralGlow.scale.set(8, 8, 1);
scene.add(centralGlow);

// Các đám mây tinh vân (Nebula) ngẫu nhiên
for (let i = 0; i < 15; i++) {
  const hue = Math.random() * 360;
  const color = `hsla(${hue}, 80%, 50%, 0.6)`;
  const nebula = createGlowMaterial(color, 256);
  nebula.scale.set(100, 100, 1);
  nebula.position.set(
    (Math.random() - 0.5) * 175,
    (Math.random() - 0.5) * 175,
    (Math.random() - 0.5) * 175
  );
  scene.add(nebula);
}

// ---- TẠO THIÊN HÀ (GALAXY) ----
const galaxyParameters = {
  count: 100000,
  arms: 6,
  radius: 100,
  spin: 0.5,
  randomness: 0.2,
  randomnessPower: 20,
  insideColor: new THREE.Color(0xd63ed6),
  outsideColor: new THREE.Color(0x48b8b8),
};

const defaultHeartImages = Array.from({ length: 9 }, (_, i) => `images/img${i + 1}.jpg`);

const heartImages = [
  ...(window.dataCCD?.data?.heartImages || []),
  ...defaultHeartImages,
];

const textureLoader = new THREE.TextureLoader();
const numGroups = heartImages.length;

// --- LOGIC DÙNG NỘI SUY ---

// Mật độ điểm khi chỉ có 1 ảnh (cao nhất)
const maxDensity = 50000;
// Mật độ điểm khi có 10 ảnh trở lên (thấp nhất)
const minDensity = 2000;
// Số lượng ảnh tối đa mà chúng ta quan tâm để điều chỉnh
const maxGroupsForScale = 14;

let pointsPerGroup;

if (numGroups <= 1) {
  pointsPerGroup = maxDensity;
} else if (numGroups >= maxGroupsForScale) {
  pointsPerGroup = minDensity;
} else {
  const t = (numGroups - 1) / (maxGroupsForScale - 1);
  pointsPerGroup = Math.floor(maxDensity * (1 - t) + minDensity * t);
}

if (pointsPerGroup * numGroups > galaxyParameters.count) {
  pointsPerGroup = Math.floor(galaxyParameters.count / numGroups);
}

console.log(`Số lượng ảnh: ${numGroups}, Điểm mỗi ảnh: ${pointsPerGroup}`);

const positions = new Float32Array(galaxyParameters.count * 3);
const colors = new Float32Array(galaxyParameters.count * 3);

let pointIdx = 0;
for (let i = 0; i < galaxyParameters.count; i++) {
  const radius = Math.pow(Math.random(), galaxyParameters.randomnessPower) * galaxyParameters.radius;
  const branchAngle = (i % galaxyParameters.arms) / galaxyParameters.arms * Math.PI * 2;
  const spinAngle = radius * galaxyParameters.spin;

  const randomX = (Math.random() - 0.5) * galaxyParameters.randomness * radius;
  const randomY = (Math.random() - 0.5) * galaxyParameters.randomness * radius * 1.2;
  const randomZ = (Math.random() - 0.5) * galaxyParameters.randomness * radius;
  const totalAngle = branchAngle + spinAngle;

  if (radius < 30 && Math.random() < 0.8) continue;

  const i3 = pointIdx * 3;
  positions[i3] = Math.cos(totalAngle) * radius + randomX;
  positions[i3 + 1] = randomY;
  positions[i3 + 2] = Math.sin(totalAngle) * radius + randomZ;

  const mixedColor = new THREE.Color(0xff66ff);
  mixedColor.lerp(new THREE.Color(0x66ffff), radius / galaxyParameters.radius);
  mixedColor.multiplyScalar(0.7 + 0.3 * Math.random());
  colors[i3] = mixedColor.r;
  colors[i3 + 1] = mixedColor.g;
  colors[i3 + 2] = mixedColor.b;

  pointIdx++;
}

const galaxyGeometry = new THREE.BufferGeometry();
galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, pointIdx * 3), 3));
galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, pointIdx * 3), 3));

const galaxyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uSize: { value: 50.0 * renderer.getPixelRatio() },
    uRippleTime: { value: -1.0 },
    uRippleSpeed: { value: 40.0 },
    uRippleWidth: { value: 20.0 }
  },
  vertexShader: `
    uniform float uSize;
    uniform float uTime;
    uniform float uRippleTime;
    uniform float uRippleSpeed;
    uniform float uRippleWidth;

    varying vec3 vColor;

    void main() {
        vColor = color;

        vec4 modelPosition = modelMatrix * vec4(position, 1.0);

        if (uRippleTime > 0.0) {
            float rippleRadius = (uTime - uRippleTime) * uRippleSpeed;
            float particleDist = length(modelPosition.xyz);

            float strength = 1.0 - smoothstep(rippleRadius - uRippleWidth, rippleRadius + uRippleWidth, particleDist);
            strength *= smoothstep(rippleRadius + uRippleWidth, rippleRadius - uRippleWidth, particleDist);

            if (strength > 0.0) {
                vColor += vec3(strength * 2.0);
            }
        }

        vec4 viewPosition = viewMatrix * modelPosition;
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = uSize / -viewPosition.z;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        gl_FragColor = vec4(vColor, 1.0);
    }
  `,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  vertexColors: true
});

const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
scene.add(galaxy);

function createNeonTexture(image, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const aspectRatio = image.width / image.height;
  let drawWidth, drawHeight, offsetX, offsetY;
  if (aspectRatio > 1) {
    drawWidth = size;
    drawHeight = size / aspectRatio;
    offsetX = 0;
    offsetY = (size - drawHeight) / 2;
  } else {
    drawHeight = size;
    drawWidth = size * aspectRatio;
    offsetX = (size - drawWidth) / 2;
    offsetY = 0;
  }
  ctx.clearRect(0, 0, size, size);
  const cornerRadius = size * 0.1;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(offsetX + cornerRadius, offsetY);
  ctx.lineTo(offsetX + drawWidth - cornerRadius, offsetY);
  ctx.arcTo(offsetX + drawWidth, offsetY, offsetX + drawWidth, offsetY + cornerRadius, cornerRadius);
  ctx.lineTo(offsetX + drawWidth, offsetY + drawHeight - cornerRadius);
  ctx.arcTo(offsetX + drawWidth, offsetY + drawHeight, offsetX + drawWidth - cornerRadius, offsetY + drawHeight, cornerRadius);
  ctx.lineTo(offsetX + cornerRadius, offsetY + drawHeight);
  ctx.arcTo(offsetX, offsetY + drawHeight, offsetX, offsetY + drawHeight - cornerRadius, cornerRadius);
  ctx.lineTo(offsetX, offsetY + cornerRadius);
  ctx.arcTo(offsetX, offsetY, offsetX + cornerRadius, offsetY, cornerRadius);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
  ctx.restore();
  return new THREE.CanvasTexture(canvas);
}

// ---- TẠO CÁC NHÓM ĐIỂM HÌNH TRÁI TIM ----
for (let group = 0; group < numGroups; group++) {
  const groupPositions = new Float32Array(pointsPerGroup * 3);
  const groupColorsNear = new Float32Array(pointsPerGroup * 3);
  const groupColorsFar = new Float32Array(pointsPerGroup * 3);
  let validPointCount = 0;

  for (let i = 0; i < pointsPerGroup; i++) {
    const idx = validPointCount * 3;
    const globalIdx = group * pointsPerGroup + i;
    const radius = Math.pow(Math.random(), galaxyParameters.randomnessPower) * galaxyParameters.radius;
    if (radius < 30) continue;

    const branchAngle = (globalIdx % galaxyParameters.arms) / galaxyParameters.arms * Math.PI * 2;
    const spinAngle = radius * galaxyParameters.spin;

    const randomX = (Math.random() - 0.5) * galaxyParameters.randomness * radius;
    const randomY = (Math.random() - 0.5) * galaxyParameters.randomness * radius * 0.5;
    const randomZ = (Math.random() - 0.5) * galaxyParameters.randomness * radius;
    const totalAngle = branchAngle + spinAngle;

    groupPositions[idx] = Math.cos(totalAngle) * radius + randomX;
    groupPositions[idx + 1] = randomY;
    groupPositions[idx + 2] = Math.sin(totalAngle) * radius + randomZ;

    const colorNear = new THREE.Color(0xffffff);
    groupColorsNear[idx] = colorNear.r;
    groupColorsNear[idx + 1] = colorNear.g;
    groupColorsNear[idx + 2] = colorNear.b;

    const colorFar = galaxyParameters.insideColor.clone();
    colorFar.lerp(galaxyParameters.outsideColor, radius / galaxyParameters.radius);
    colorFar.multiplyScalar(0.7 + 0.3 * Math.random());
    groupColorsFar[idx] = colorFar.r;
    groupColorsFar[idx + 1] = colorFar.g;
    groupColorsFar[idx + 2] = colorFar.b;

    validPointCount++;
  }

  if (validPointCount === 0) continue;

  // Geometry cho trạng thái gần camera
  const groupGeometryNear = new THREE.BufferGeometry();
  groupGeometryNear.setAttribute('position', new THREE.BufferAttribute(groupPositions.slice(0, validPointCount * 3), 3));
  groupGeometryNear.setAttribute('color', new THREE.BufferAttribute(groupColorsNear.slice(0, validPointCount * 3), 3));

  // Geometry cho trạng thái xa camera
  const groupGeometryFar = new THREE.BufferGeometry();
  groupGeometryFar.setAttribute('position', new THREE.BufferAttribute(groupPositions.slice(0, validPointCount * 3), 3));
  groupGeometryFar.setAttribute('color', new THREE.BufferAttribute(groupColorsFar.slice(0, validPointCount * 3), 3));

  // Tính toán tâm của nhóm điểm và dịch chuyển về gốc tọa độ
  const posAttr = groupGeometryFar.getAttribute('position');
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < posAttr.count; i++) {
    cx += posAttr.getX(i);
    cy += posAttr.getY(i);
    cz += posAttr.getZ(i);
  }
  cx /= posAttr.count;
  cy /= posAttr.count;
  cz /= posAttr.count;
  groupGeometryNear.translate(-cx, -cy, -cz);
  groupGeometryFar.translate(-cx, -cy, -cz);

  // Tải hình ảnh và tạo vật thể
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = heartImages[group];
  img.onload = () => {
    const neonTexture = createNeonTexture(img, 256);

    // Material khi ở gần
    const materialNear = new THREE.PointsMaterial({
      size: 1.8,
      map: neonTexture,
      transparent: false,
      alphaTest: 0.2,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
      vertexColors: true
    });

    // Material khi ở xa
    const materialFar = new THREE.PointsMaterial({
      size: 1.8,
      map: neonTexture,
      transparent: true,
      alphaTest: 0.2,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const pointsObject = new THREE.Points(groupGeometryFar, materialFar);
    pointsObject.position.set(cx, cy, cz);

    // Lưu trữ các trạng thái để chuyển đổi sau này
    pointsObject.userData.materialNear = materialNear;
    pointsObject.userData.geometryNear = groupGeometryNear;
    pointsObject.userData.materialFar = materialFar;
    pointsObject.userData.geometryFar = groupGeometryFar;

    scene.add(pointsObject);
  };
}

// ---- ÁNH SÁNG MÔI TRƯỜNG ----
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// ---- TẠO NỀN SAO (STARFIELD) ----
const starCount = 20000;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 900;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 900;
  starPositions[i * 3 + 2] = (Math.random() - 0.5) * 900;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.7,
  transparent: true,
  opacity: 0.7,
  depthWrite: false
});
const starField = new THREE.Points(starGeometry, starMaterial);
starField.name = 'starfield';
starField.renderOrder = 999;
scene.add(starField);

// ---- TẠO SAO BĂNG (SHOOTING STARS) ----
let shootingStars = [];

function createRandomCurve() {
  const startPoint = new THREE.Vector3(-200 + Math.random() * 100, -100 + Math.random() * 200, -100 + Math.random() * 200);
  const endPoint = new THREE.Vector3(600 + Math.random() * 200, startPoint.y + (-100 + Math.random() * 200), startPoint.z + (-100 + Math.random() * 200));
  const controlPoint1 = new THREE.Vector3(startPoint.x + 200 + Math.random() * 100, startPoint.y + (-50 + Math.random() * 100), startPoint.z + (-50 + Math.random() * 100));
  const controlPoint2 = new THREE.Vector3(endPoint.x - 200 + Math.random() * 100, endPoint.y + (-50 + Math.random() * 100), endPoint.z + (-50 + Math.random() * 100));

  return new THREE.CubicBezierCurve3(startPoint, controlPoint1, controlPoint2, endPoint);
}

function createShootingStar() {
  const trailLength = 100;

  // Đầu sao băng
  const headGeometry = new THREE.SphereGeometry(2, 32, 32);
  const headMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);

  // Hào quang của sao băng
  const glowGeometry = new THREE.SphereGeometry(3, 32, 32);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform float time;
      void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(1.0, 1.0, 1.0, intensity * (0.8 + sin(time * 5.0) * 0.2));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  head.add(glow);

  // Đuôi sao băng
  const curve = createRandomCurve();
  const trailPoints = [];
  for (let i = 0; i < trailLength; i++) {
    const progress = i / (trailLength - 1);
    trailPoints.push(curve.getPoint(progress));
  }
  const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
  const trailMaterial = new THREE.LineBasicMaterial({
    color: 0x99eaff,
    transparent: true,
    opacity: 0.7,
    linewidth: 2
  });
  const trail = new THREE.Line(trailGeometry, trailMaterial);

  const shootingStarGroup = new THREE.Group();
  shootingStarGroup.add(head);
  shootingStarGroup.add(trail);
  shootingStarGroup.userData = {
    curve: curve,
    progress: 0,
    speed: 0.001 + Math.random() * 0.001,
    life: 0,
    maxLife: 300,
    head: head,
    trail: trail,
    trailLength: trailLength,
    trailPoints: trailPoints,
  };
  scene.add(shootingStarGroup);
  shootingStars.push(shootingStarGroup);
}

// ---- TẠO HÀNH TINH TRUNG TÂM ----

// Hàm tạo texture cho hành tinh
function createPlanetTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Nền gradient
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size / 8, size / 2, size / 2, size / 2);
  gradient.addColorStop(0.00, '#f8bbd0');
  gradient.addColorStop(0.12, '#f48fb1');
  gradient.addColorStop(0.22, '#f06292');
  gradient.addColorStop(0.35, '#ffffff');
  gradient.addColorStop(0.50, '#e1aaff');
  gradient.addColorStop(0.62, '#a259f7');
  gradient.addColorStop(0.75, '#b2ff59');
  gradient.addColorStop(1.00, '#3fd8c7');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Các đốm màu ngẫu nhiên
  const spotColors = ['#f8bbd0', '#f8bbd0', '#f48fb1', '#f48fb1', '#f06292', '#f06292', '#ffffff', '#e1aaff', '#a259f7', '#b2ff59'];
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 30 + Math.random() * 120;
    const color = spotColors[Math.floor(Math.random() * spotColors.length)];
    const spotGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    spotGradient.addColorStop(0, color + 'cc');
    spotGradient.addColorStop(1, color + '00');
    ctx.fillStyle = spotGradient;
    ctx.fillRect(0, 0, size, size);
  }

  // Các đường cong (swirls)
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.bezierCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
    ctx.strokeStyle = 'rgba(180, 120, 200, ' + (0.12 + Math.random() * 0.18) + ')';
    ctx.lineWidth = 8 + Math.random() * 18;
    ctx.stroke();
  }

  // Áp dụng blur
  if (ctx.filter !== undefined) {
    ctx.filter = 'blur(2px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  }

  return new THREE.CanvasTexture(canvas);
}

// Shader cho hiệu ứng bão trên bề mặt hành tinh
const stormShader = {
  uniforms: {
    time: { value: 0.0 },
    baseTexture: { value: null }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform sampler2D baseTexture;
    varying vec2 vUv;
    void main() {
        vec2 uv = vUv;
        float angle = length(uv - vec2(0.5)) * 3.0;
        float twist = sin(angle * 3.0 + time) * 0.1;
        uv.x += twist * sin(time * 0.5);
        uv.y += twist * cos(time * 0.5);
        vec4 texColor = texture2D(baseTexture, uv);
        float noise = sin(uv.x * 10.0 + time) * sin(uv.y * 10.0 + time) * 0.1;
        texColor.rgb += noise * vec3(0.8, 0.4, 0.2);
        gl_FragColor = texColor;
    }
  `
};

// Tạo vật thể hành tinh
const planetRadius = 10;
const planetGeometry = new THREE.SphereGeometry(planetRadius, 48, 48);
const planetTexture = createPlanetTexture();
const planetMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    baseTexture: { value: planetTexture }
  },
  vertexShader: stormShader.vertexShader,
  fragmentShader: stormShader.fragmentShader
});
const planet = new THREE.Mesh(planetGeometry, planetMaterial);
planet.position.set(0, 0, 0);
scene.add(planet);

// Thêm khí quyển cho hành tinh
const atmosphereGeometry = new THREE.SphereGeometry(planetRadius * 1.05, 48, 48);
const atmosphereMaterial = new THREE.ShaderMaterial({
  uniforms: {
    glowColor: { value: new THREE.Color(0xe0b3ff) }
  },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    uniform vec3 glowColor;
    void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, 1.0) * intensity;
    }
  `,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
  transparent: true
});

const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
planet.add(atmosphere);

// ---- TẠO CÁC VÒNG CHỮ QUAY QUANH HÀNH TINH ----
const ringTexts = [
  'YEU THANH NAM VA MINH NHAT',
  "YEU THANH NAM",
  "YEU MINH NHAT",
  "BAN QUYEN THUOC: TRAN GIA HUY",
  ...(window.dataCCD && window.dataCCD.data && window.dataCCD.data.ringTexts ? window.dataCCD.data.ringTexts : [])
];

function createTextRings() {
  const numRings = ringTexts.length;
  const baseRingRadius = planetRadius * 1.1;
  const ringSpacing = 5;
  window.textRings = [];

  for (let i = 0; i < numRings; i++) {
    const text = ringTexts[i % ringTexts.length] + '   ';
    const ringRadius = baseRingRadius + i * ringSpacing;

    // Phân tích và điều chỉnh kích thước font chữ
    function getCharType(char) {
      const charCode = char.charCodeAt(0);
      if ((charCode >= 0x4E00 && charCode <= 0x9FFF) ||
        (charCode >= 0x3040 && charCode <= 0x309F) ||
        (charCode >= 0x30A0 && charCode <= 0x30FF) ||
        (charCode >= 0xAC00 && charCode <= 0xD7AF)) {
        return 'cjk';
      } else if (charCode >= 0 && charCode <= 0x7F) {
        return 'latin';
      }
      return 'other';
    }

    let charCounts = { cjk: 0, latin: 0, other: 0 };
    for (let char of text) {
      charCounts[getCharType(char)]++;
    }

    const totalChars = text.length;
    const cjkRatio = charCounts.cjk / totalChars;

    let scaleParams = { fontScale: 0.75, spacingScale: 1.1 };

    if (i === 0) {
      scaleParams.fontScale = 0.55;
      scaleParams.spacingScale = 0.9;
    } else if (i === 1) {
      scaleParams.fontScale = 0.65;
      scaleParams.spacingScale = 1.0;
    }

    if (cjkRatio > 0) {
      scaleParams.fontScale *= 0.9;
      scaleParams.spacingScale *= 1.1;
    }

    // Tạo texture chữ động
    const textureHeight = 150;
    const fontSize = Math.max(130, 0.8 * textureHeight);

    // Đo chiều rộng của text để lặp lại
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;
    let singleText = ringTexts[i % ringTexts.length];
    const separator = '   ';
    let repeatedTextSegment = singleText + separator;

    let segmentWidth = tempCtx.measureText(repeatedTextSegment).width;
    let textureWidthCircumference = 2 * Math.PI * ringRadius * 180;
    let repeatCount = Math.ceil(textureWidthCircumference / segmentWidth);

    let fullText = '';
    for (let j = 0; j < repeatCount; j++) {
      fullText += repeatedTextSegment;
    }

    let finalTextureWidth = segmentWidth * repeatCount;
    if (finalTextureWidth < 1 || !fullText) {
      fullText = repeatedTextSegment;
      finalTextureWidth = segmentWidth;
    }

    // Vẽ text lên canvas chính
    const textCanvas = document.createElement('canvas');
    textCanvas.width = Math.ceil(Math.max(1, finalTextureWidth));
    textCanvas.height = textureHeight;
    const ctx = textCanvas.getContext('2d');

    ctx.clearRect(0, 0, textCanvas.width, textureHeight);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Hiệu ứng glow cho viền chữ
    ctx.shadowColor = '#e0b3ff';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(fullText, 0, textureHeight * 0.82);

    // Hiệu ứng glow cho phần fill
    ctx.shadowColor = '#ffb3de';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#fff';
    ctx.fillText(fullText, 0, textureHeight * 0.84);

    const ringTexture = new THREE.CanvasTexture(textCanvas);
    ringTexture.wrapS = THREE.RepeatWrapping;
    ringTexture.repeat.x = finalTextureWidth / textureWidthCircumference;
    ringTexture.needsUpdate = true;

    const ringGeometry = new THREE.CylinderGeometry(ringRadius, ringRadius, 1, 128, 1, true);

    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.01,
      opacity: 1,
      depthWrite: false,
    });

    const textRingMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    textRingMesh.position.set(0, 0, 0);
    textRingMesh.rotation.y = Math.PI / 2;

    const ringGroup = new THREE.Group();
    ringGroup.add(textRingMesh);
    ringGroup.userData = {
      ringRadius: ringRadius,
      angleOffset: 0.15 * Math.PI * 0.5,
      speed: 0.002 + 0.00025,
      tiltSpeed: 0, rollSpeed: 0, pitchSpeed: 0,
      tiltAmplitude: Math.PI / 3, rollAmplitude: Math.PI / 6, pitchAmplitude: Math.PI / 8,
      tiltPhase: Math.PI * 2, rollPhase: Math.PI * 2, pitchPhase: Math.PI * 2,
      isTextRing: true
    };

    const initialRotationX = i / numRings * (Math.PI / 1);
    ringGroup.rotation.x = initialRotationX;
    scene.add(ringGroup);
    window.textRings.push(ringGroup);
  }
}

createTextRings();

function updateTextRingsRotation() {
  if (!window.textRings || !camera) return;

  window.textRings.forEach((ringGroup, index) => {
    ringGroup.children.forEach(child => {
      if (child.userData.initialAngle !== undefined) {
        const angle = child.userData.initialAngle + ringGroup.userData.angleOffset;
        const x = Math.cos(angle) * child.userData.ringRadius;
        const z = Math.sin(angle) * child.userData.ringRadius;
        child.position.set(x, 0, z);

        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);

        const lookAtVector = new THREE.Vector3().subVectors(camera.position, worldPos).normalize();
        const rotationY = Math.atan2(lookAtVector.x, lookAtVector.z);
        child.rotation.y = rotationY;
      }
    });
  });
}

function animatePlanetSystem() {
  if (window.textRings) {
    const time = Date.now() * 0.001;
    window.textRings.forEach((ringGroup, index) => {
      const userData = ringGroup.userData;
      userData.angleOffset += userData.speed;

      // Chuyển động lắc lư
      const tilt = Math.sin(time * userData.tiltSpeed + userData.tiltPhase) * userData.tiltAmplitude;
      const roll = Math.cos(time * userData.rollSpeed + userData.rollPhase) * userData.rollAmplitude;
      const pitch = Math.sin(time * userData.pitchSpeed + userData.pitchPhase) * userData.pitchAmplitude;

      ringGroup.rotation.x = (index / window.textRings.length) * (Math.PI / 1) + tilt;
      ringGroup.rotation.z = roll;
      ringGroup.rotation.y = userData.angleOffset + pitch;

      const verticalBob = Math.sin(time * (userData.tiltSpeed * 0.7) + userData.tiltPhase) * 0.3;
      ringGroup.position.y = verticalBob;

      const pulse = (Math.sin(time * 1.5 + index) + 1) / 2;
      const textMesh = ringGroup.children[0];
      if (textMesh && textMesh.material) {
        textMesh.material.opacity = 0.7 + pulse * 0.3;
      }
    });
    updateTextRingsRotation();
  }
}

// ===========================
// ---- RANDOM MUSIC NÈ ----
// ===========================

let galaxyAudio = null;

function preloadGalaxyAudio() {
  const audioSources = [
    "vutru.mp3"
  ];

  const randomIndex = Math.floor(Math.random() * audioSources.length);
  const selectedSrc = audioSources[randomIndex];

  galaxyAudio = new Audio(selectedSrc);
  galaxyAudio.loop = true;
  galaxyAudio.volume = 1.0;
  galaxyAudio.preload = "auto";
}

function playGalaxyAudio() {
  if (galaxyAudio) {
    galaxyAudio.play().catch(err => {
      console.warn("Audio play blocked or delayed:", err);
    });
  }
}
preloadGalaxyAudio();

// ---- VÒNG LẶP ANIMATE ----
let fadeOpacity = 0.1;
let fadeInProgress = false;

// =======================================================================
// ---- THÊM HIỆU ỨNG GỢI Ý NHẤN VÀO TINH CẦU (HINT ICON) ----
// =======================================================================

let hintIcon;
let hintText;

function createHintIcon() {
  hintIcon = new THREE.Group();
  hintIcon.name = 'hint-icon-group';
  scene.add(hintIcon);

  const cursorVisuals = new THREE.Group();

  // Tạo hình dạng con trỏ
  const cursorShape = new THREE.Shape();
  const h = 1.5;
  const w = h * 0.5;

  cursorShape.moveTo(0, 0);
  cursorShape.lineTo(-w * 0.4, -h * 0.7);
  cursorShape.lineTo(-w * 0.25, -h * 0.7);
  cursorShape.lineTo(-w * 0.5, -h);
  cursorShape.lineTo(w * 0.5, -h);
  cursorShape.lineTo(w * 0.25, -h * 0.7);
  cursorShape.lineTo(w * 0.4, -h * 0.7);
  cursorShape.closePath();

  // Lớp nền trắng
  const backgroundGeometry = new THREE.ShapeGeometry(cursorShape);
  const backgroundMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });
  const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);

  // Lớp trắng bên trong
  const foregroundGeometry = new THREE.ShapeGeometry(cursorShape);
  const foregroundMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });
  const foregroundMesh = new THREE.Mesh(foregroundGeometry, foregroundMaterial);

  foregroundMesh.scale.set(0.8, 0.8, 1);
  foregroundMesh.position.z = 0.01;

  cursorVisuals.add(backgroundMesh, foregroundMesh);
  cursorVisuals.position.y = h / 2;
  cursorVisuals.rotation.x = Math.PI / 2;

  // Tạo vòng tròn bao quanh
  const ringGeometry = new THREE.RingGeometry(1.8, 2.0, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  ringMesh.rotation.x = Math.PI / 2;
  hintIcon.userData.ringMesh = ringMesh;

  // Hoàn thiện icon
  hintIcon.add(cursorVisuals);
  hintIcon.add(ringMesh);

  hintIcon.position.set(1.5, 1.5, 15);
  hintIcon.scale.set(0.8, 0.8, 0.8);
  hintIcon.lookAt(planet.position);
  hintIcon.userData.initialPosition = hintIcon.position.clone();
}

function createHintText() {
  const canvasSize = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = canvasSize;
  const context = canvas.getContext('2d');
  const fontSize = 50;
  const text = 'Chạm Vào Tinh Cầu';
  context.font = `bold ${fontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = '#ffb3de';
  context.shadowBlur = 5;
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(255, 200, 220, 0.8)';
  context.strokeText(text, canvasSize / 2, canvasSize / 2);
  context.shadowColor = '#e0b3ff';
  context.shadowBlur = 5;
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(220, 180, 255, 0.5)';
  context.strokeText(text, canvasSize / 2, canvasSize / 2);
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.fillStyle = 'white';
  context.fillText(text, canvasSize / 2, canvasSize / 2);
  const textTexture = new THREE.CanvasTexture(canvas);
  textTexture.needsUpdate = true;
  const textMaterial = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true,
    side: THREE.DoubleSide
  });
  const planeGeometry = new THREE.PlaneGeometry(16, 8);
  hintText = new THREE.Mesh(planeGeometry, textMaterial);
  hintText.position.set(0, 15, 0);
  scene.add(hintText);
}

function animateHintIcon(time) {
  if (!hintIcon) return;

  if (!introStarted) {
    hintIcon.visible = true;

    // Hiệu ứng "nhấn" tới lui
    const tapFrequency = 2.5;
    const tapAmplitude = 1.5;
    const tapOffset = Math.sin(time * tapFrequency) * tapAmplitude;

    // Di chuyển icon tới lui theo hướng nó đang nhìn
    const direction = new THREE.Vector3();
    hintIcon.getWorldDirection(direction);
    hintIcon.position.copy(hintIcon.userData.initialPosition).addScaledVector(direction, -tapOffset);

    // Hiệu ứng "sóng" cho vòng tròn
    const ring = hintIcon.userData.ringMesh;
    const ringScale = 1 + Math.sin(time * tapFrequency) * 0.1;
    ring.scale.set(ringScale, ringScale, 1);
    ring.material.opacity = 0.5 + Math.sin(time * tapFrequency) * 0.2;

    // Xử lý văn bản gợi ý
    if (hintText) {
      hintText.visible = true;
      hintText.material.opacity = 0.7 + Math.sin(time * 3) * 0.3;
      hintText.position.y = 15 + Math.sin(time * 2) * 0.5;
      hintText.lookAt(camera.position);
    }
  } else {
    // Ẩn icon đi khi intro đã bắt đầu
    if (hintIcon) hintIcon.visible = false;
    if (hintText) hintText.visible = false;
  }
}

// ---- CHỈNH SỬA VÒNG LẶP ANIMATE ----
function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() * 0.001;

  // Cập nhật icon gợi ý
  animateHintIcon(time);

  controls.update();
  planet.material.uniforms.time.value = time * 0.5;

  // Logic fade-in sau khi bắt đầu
  if (fadeInProgress && fadeOpacity < 1) {
    fadeOpacity += 0.025;
    if (fadeOpacity > 1) fadeOpacity = 1;
  }

  if (!introStarted) {
    // Trạng thái trước khi intro bắt đầu
    fadeOpacity = 0.1;
    scene.traverse(obj => {
      if (obj.name === 'starfield') {
        if (obj.points && obj.material.opacity !== undefined) {
          obj.material.transparent = false;
          obj.material.opacity = 1;
        }
        return;
      }
      if (obj.userData.isTextRing || (obj.parent && obj.parent.userData && obj.parent.userData.isTextRing)) {
        if (obj.material && obj.material.opacity !== undefined) {
          obj.material.transparent = false;
          obj.material.opacity = 1;
        }
        if (obj.material && obj.material.color) {
          obj.material.color.set(0xffffff);
        }
      } else if (obj !== planet && obj !== centralGlow && obj !== hintIcon && obj.type !== 'Scene' && !obj.parent.isGroup) {
        if (obj.material && obj.material.opacity !== undefined) {
          obj.material.transparent = true;
          obj.material.opacity = 0.1;
        }
      }
    });
    planet.visible = true;
    centralGlow.visible = true;
  } else {
    // Trạng thái sau khi intro bắt đầu
    scene.traverse(obj => {
      if (!(obj.userData.isTextRing || (obj.parent && obj.parent.userData && obj.parent.userData.isTextRing) || obj === planet || obj === centralGlow || obj.type === 'Scene')) {
        if (obj.material && obj.material.opacity !== undefined) {
          obj.material.transparent = true;
          obj.material.opacity = fadeOpacity;
        }
      } else {
        if (obj.material && obj.material.opacity !== undefined) {
          obj.material.opacity = 1;
          obj.material.transparent = false;
        }
      }
      if (obj.material && obj.material.color) {
        obj.material.color.set(0xffffff);
      }
    });
  }

  // Cập nhật sao băng
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const star = shootingStars[i];
    star.userData.life++;

    let opacity = 1.0;
    if (star.userData.life < 30) {
      opacity = star.userData.life / 30;
    } else if (star.userData.life > star.userData.maxLife - 30) {
      opacity = (star.userData.maxLife - star.userData.life) / 30;
    }

    star.userData.progress += star.userData.speed;
    if (star.userData.progress > 1) {
      scene.remove(star);
      shootingStars.splice(i, 1);
      continue;
    }

    const currentPos = star.userData.curve.getPoint(star.userData.progress);
    star.position.copy(currentPos);
    star.userData.head.material.opacity = opacity;
    if (star.userData.head.children[0] && star.userData.head.children[0].material && star.userData.head.children[0].material.uniforms) {
      star.userData.head.children[0].material.uniforms.time.value = time;
    }

    const trail = star.userData.trail;
    const trailPoints = star.userData.trailPoints;
    trailPoints[0].copy(currentPos);
    for (let j = 1; j < star.userData.trailLength; j++) {
      const trailProgress = Math.max(0, star.userData.progress - j * 0.01);
      trailPoints[j].copy(star.userData.curve.getPoint(trailProgress));
    }
    if (trail && trail.geometry) {
      trail.geometry.setFromPoints(trailPoints);
      trail.material.opacity = opacity * 0.7;
    }
  }

  if (shootingStars.length < 3 && Math.random() < 0.02) {
    createShootingStar();
  }

  // Logic chuyển đổi material cho các nhóm điểm trái tim
  scene.traverse(obj => {
    if (obj.isPoints && obj.userData.materialNear && obj.userData.materialFar) {
      const positionAttr = obj.geometry.getAttribute('position');
      let isClose = false;
      for (let i = 0; i < positionAttr.count; i++) {
        const worldX = positionAttr.getX(i) + obj.position.x;
        const worldY = positionAttr.getY(i) + obj.position.y;
        const worldZ = positionAttr.getZ(i) + obj.position.z;
        const distance = camera.position.distanceTo(new THREE.Vector3(worldX, worldY, worldZ));
        if (distance < 10) {
          isClose = true;
          break;
        }
      }
      if (isClose) {
        if (obj.material !== obj.userData.materialNear) {
          obj.material = obj.userData.materialNear;
          obj.geometry = obj.userData.geometryNear;
        }
      } else {
        if (obj.material !== obj.userData.materialFar) {
          obj.material = obj.userData.materialFar;
          obj.geometry = obj.userData.geometryFar;
        }
      }
    }
  });

  planet.lookAt(camera.position);
  animatePlanetSystem();

  if (starField && starField.material && starField.material.opacity !== undefined) {
    starField.material.opacity = 1.0;
    starField.material.transparent = false;
  }

  renderer.render(scene, camera);
}

// ---- CÁC HÀM XỬ LÝ SỰ KIỆN VÀ KHỞI ĐỘNG ----

createShootingStar();
createHintIcon();
createHintText();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.target.set(0, 0, 0);
  controls.update();
});

function startCameraAnimation() {
  const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  const midPos1 = { x: startPos.x, y: 0, z: startPos.z };
  const midPos2 = { x: startPos.x, y: 0, z: 160 };
  const endPos = { x: -40, y: 100, z: 100 };

  const duration1 = 0.2;
  const duration2 = 0.55;
  const duration3 = 0.4;
  let progress = 0;

  function animatePath() {
    progress += 0.0025;
    let newPos;

    if (progress < duration1) {
      let t = progress / duration1;
      newPos = {
        x: startPos.x + (midPos1.x - startPos.x) * t,
        y: startPos.y + (midPos1.y - startPos.y) * t,
        z: startPos.z + (midPos1.z - startPos.z) * t,
      };
    } else if (progress < duration1 + duration2) {
      let t = (progress - duration1) / duration2;
      newPos = {
        x: midPos1.x + (midPos2.x - midPos1.x) * t,
        y: midPos1.y + (midPos2.y - midPos1.y) * t,
        z: midPos1.z + (midPos2.z - midPos1.z) * t,
      };
    } else if (progress < duration1 + duration2 + duration3) {
      let t = (progress - duration1 - duration2) / duration3;
      let easedT = 0.5 - 0.5 * Math.cos(Math.PI * t);
      newPos = {
        x: midPos2.x + (endPos.x - midPos2.x) * easedT,
        y: midPos2.y + (endPos.y - midPos2.y) * easedT,
        z: midPos2.z + (endPos.z - midPos2.z) * easedT,
      };
    } else {
      camera.position.set(endPos.x, endPos.y, endPos.z);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
      controls.enabled = true;
      return;
    }

    camera.position.set(newPos.x, newPos.y, newPos.z);
    camera.lookAt(0, 0, 0);
    requestAnimationFrame(animatePath);
  }
  controls.enabled = false;
  animatePath();
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let introStarted = false;

// Giới hạn số lượng sao hiển thị ban đầu
const originalStarCount = starGeometry.getAttribute('position').count;
if (starField && starField.geometry) {
  starField.geometry.setDrawRange(0, Math.floor(originalStarCount * 0.1));
}

function requestFullScreen() {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestfullscreen();
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
  }
}

function onCanvasClick(event) {
  if (introStarted) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(planet);
  if (intersects.length > 0) {
    requestFullScreen();
    introStarted = true;
    fadeInProgress = true;
    document.body.classList.add("intro-started");
    playGalaxyAudio();

    startCameraAnimation();

    if (starField && starField.geometry) {
      starField.geometry.setDrawRange(0, originalStarCount);
    }
  }
}

renderer.domElement.addEventListener("click", onCanvasClick);

planet.name = 'main-planet';
centralGlow.name = 'main-glow';

// ---- CÁC THIẾT LẬP CHO GIAO DIỆN VÀ MOBILE ----
function setFullScreen() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  const container = document.getElementById('container');
  if (container) {
    container.style.height = `${window.innerHeight}px`;
  }
}

window.addEventListener('resize', setFullScreen);
window.addEventListener('orientationchange', () => {
  setTimeout(setFullScreen, 300);
});
setFullScreen();

const preventDefault = event => event.preventDefault();
document.addEventListener('touchmove', preventDefault, { passive: false });
document.addEventListener('gesturestart', preventDefault, { passive: false });

const container = document.getElementById('container');
if (container) {
  container.addEventListener('touchmove', preventDefault, { passive: false });
}

// ---- KIỂM TRA HƯỚNG MÀN HÌNH ----
function checkOrientation() {
  const isMobilePortrait = window.innerHeight > window.innerWidth && 'ontouchstart' in window;

  if (isMobilePortrait) {
    document.body.classList.add('portrait-mode');
  } else {
    document.body.classList.remove('portrait-mode');
  }
}

window.addEventListener('DOMContentLoaded', checkOrientation);
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => {
  setTimeout(checkOrientation, 200);
});

// ---- ADMIN PANEL ----
class AdminPanel {
  constructor() {
    this.isVisible = false;
    this.isAuthenticated = false;
    this.userData = {};
    this.validKeys = ['HUYPRO123', 'ADMIN888', 'SUPERKEY456'];
    this.visitorIPs = JSON.parse(localStorage.getItem('visitorIPs') || '[]');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupKeyHandlers();
    this.saveCurrentVisitor(); // Lưu IP ngay khi khởi tạo
  }

  setupEventListeners() {
    const submitKeyBtn = document.getElementById('submit-key');
    const keyInput = document.getElementById('key-input');
    const refreshDataBtn = document.getElementById('refresh-data');
    const exportDataBtn = document.getElementById('export-data');
    const closePanelBtn = document.getElementById('close-panel');
    const viewIPsBtn = document.getElementById('view-ips');

    if (submitKeyBtn) submitKeyBtn.addEventListener('click', () => this.validateKey());
    if (keyInput) keyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.validateKey();
    });
    if (refreshDataBtn) refreshDataBtn.addEventListener('click', () => this.collectUserData());
    if (exportDataBtn) exportDataBtn.addEventListener('click', () => this.exportUserData());
    if (closePanelBtn) closePanelBtn.addEventListener('click', () => this.hidePanel());
    if (viewIPsBtn) viewIPsBtn.addEventListener('click', () => this.showIPList());
  }

  setupKeyHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        this.togglePanel();
      }

      if (e.key === 'Escape' && this.isVisible) {
        this.hidePanel();
      }
    });
  }

  togglePanel() {
    const panel = document.getElementById('admin-panel');
    if (this.isVisible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  showPanel() {
    const panel = document.getElementById('admin-panel');
    if (panel) {
      panel.classList.remove('hidden');
      this.isVisible = true;
      
      if (!this.isAuthenticated) {
        this.showKeyForm();
      } else {
        this.showMainForm();
      }
    }
  }

  hidePanel() {
    const panel = document.getElementById('admin-panel');
    if (panel) {
      panel.classList.add('hidden');
      this.isVisible = false;
    }
  }

  showKeyForm() {
    const keyForm = document.getElementById('key-form');
    const mainForm = document.getElementById('main-form');
    const ipList = document.getElementById('ip-list');
    
    if (keyForm) keyForm.classList.remove('hidden');
    if (mainForm) mainForm.classList.add('hidden');
    if (ipList) ipList.classList.add('hidden');
    
    const keyInput = document.getElementById('key-input');
    if (keyInput) keyInput.focus();
  }

  showMainForm() {
    const keyForm = document.getElementById('key-form');
    const mainForm = document.getElementById('main-form');
    const ipList = document.getElementById('ip-list');
    
    if (keyForm) keyForm.classList.add('hidden');
    if (mainForm) mainForm.classList.remove('hidden');
    if (ipList) ipList.classList.add('hidden');
    
    this.collectUserData();
  }

  showIPList() {
    const keyForm = document.getElementById('key-form');
    const mainForm = document.getElementById('main-form');
    const ipList = document.getElementById('ip-list');
    
    if (keyForm) keyForm.classList.add('hidden');
    if (mainForm) mainForm.classList.add('hidden');
    if (ipList) ipList.classList.remove('hidden');
    
    this.displayIPList();
  }

  validateKey() {
    const keyInput = document.getElementById('key-input');
    const keyStatus = document.getElementById('key-status');
    
    if (!keyInput || !keyStatus) return;
    
    const key = keyInput.value.trim();

    if (this.validKeys.includes(key)) {
      keyStatus.textContent = '✅ KEY HỢP LỆ!';
      keyStatus.style.color = '#00ff00';
      this.isAuthenticated = true;
      
      setTimeout(() => {
        this.showMainForm();
      }, 1000);
    } else {
      keyStatus.textContent = '❌ KEY KHÔNG HỢP LỆ!';
      keyStatus.style.color = '#ff0000';
      if (keyInput) keyInput.value = '';
    }
  }

  async saveCurrentVisitor() {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const currentIP = ipData.ip;

      // SỬA ĐỔI QUAN TRỌNG: LUÔN LƯU MỌI IP, KHÔNG KIỂM TRA TRÙNG LẶP
      const locationResponse = await fetch(`https://ipapi.co/${currentIP}/json/`);
      const locationData = await locationResponse.json();
      
      const visitorInfo = {
        ip: currentIP,
        timestamp: new Date().toLocaleString('vi-VN'),
        city: locationData.city || 'Unknown',
        country: locationData.country_name || 'Unknown',
        isp: locationData.org || 'Unknown',
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        language: navigator.language
      };

      this.visitorIPs.push(visitorInfo);
      this.saveToLocalStorage();
      
      console.log(`📱 Đã lưu IP: ${currentIP} - ${visitorInfo.city}, ${visitorInfo.country}`);
      
    } catch (error) {
      console.error('Lỗi lưu thông tin visitor:', error);
      
      // Fallback: vẫn lưu IP cơ bản ngay cả khi API fail
      const fallbackInfo = {
        ip: 'Unknown - API Error',
        timestamp: new Date().toLocaleString('vi-VN'),
        city: 'Unknown',
        country: 'Unknown',
        isp: 'Unknown',
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        language: navigator.language
      };
      
      this.visitorIPs.push(fallbackInfo);
      this.saveToLocalStorage();
    }
  }

  saveToLocalStorage() {
    try {
      localStorage.setItem('visitorIPs', JSON.stringify(this.visitorIPs));
    } catch (error) {
      console.error('Lỗi lưu vào localStorage:', error);
    }
  }

  displayIPList() {
    const ipListContainer = document.getElementById('ip-list-items');
    const ipCount = document.getElementById('ip-count');
    
    if (!ipListContainer) return;

    ipListContainer.innerHTML = '';

    if (this.visitorIPs.length === 0) {
      ipListContainer.innerHTML = '<p class="no-data">Chưa có dữ liệu IP nào</p>';
      return;
    }

    // Sắp xếp theo thời gian mới nhất
    const sortedIPs = [...this.visitorIPs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    sortedIPs.forEach((visitor, index) => {
      const ipItem = document.createElement('div');
      ipItem.className = 'ip-item';
      ipItem.innerHTML = `
        <div class="ip-header">
          <span class="ip-number">${index + 1}. IP: ${visitor.ip}</span>
          <span class="ip-time">${visitor.timestamp}</span>
        </div>
        <div class="ip-details">
          <span class="ip-location">📍 ${visitor.city}, ${visitor.country}</span>
          <span class="ip-isp">🏢 ${visitor.isp}</span>
        </div>
        <div class="ip-extra">
          <span class="ip-resolution">🖥️ ${visitor.screenResolution || 'Unknown'}</span>
          <span class="ip-language">🌐 ${visitor.language || 'Unknown'}</span>
        </div>
      `;
      ipListContainer.appendChild(ipItem);
    });

    if (ipCount) {
      ipCount.textContent = `Tổng số: ${this.visitorIPs.length} IP`;
    }
  }

  async collectUserData() {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      this.userData.ip = ipData.ip;

      const locationResponse = await fetch(`https://ipapi.co/${this.userData.ip}/json/`);
      const locationData = await locationResponse.json();
      
      this.userData = {
        ...this.userData,
        city: locationData.city,
        region: locationData.region,
        country: locationData.country_name,
        postal: locationData.postal,
        timezone: locationData.timezone,
        org: locationData.org,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy || 'High'
      };

      this.getDeviceInfo();
      this.getPreciseLocation();
      this.updateDisplay();

    } catch (error) {
      console.error('Lỗi thu thập dữ liệu:', error);
      this.getFallbackData();
    }
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    this.userData.device = {
      browser: this.getBrowserInfo(ua),
      os: this.getOSInfo(ua),
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 'Unknown',
      memory: navigator.deviceMemory || 'Unknown',
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      colorDepth: `${screen.colorDepth} bit`,
      userAgent: navigator.userAgent
    };
  }

  getBrowserInfo(ua) {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  getOSInfo(ua) {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  getPreciseLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userData.preciseLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: `${position.coords.accuracy}m`,
            altitude: position.coords.altitude,
            speed: position.coords.speed
          };
          this.updateDisplay();
        },
        (error) => {
          console.warn('Không thể lấy vị trí GPS:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }

  getFallbackData() {
    this.userData = {
      ip: 'Unknown',
      city: 'Unknown',
      region: 'Unknown', 
      country: 'Unknown',
      latitude: 'Unknown',
      longitude: 'Unknown',
      device: {
        browser: this.getBrowserInfo(navigator.userAgent),
        os: this.getOSInfo(navigator.userAgent),
        screen: `${screen.width}x${screen.height}`,
        userAgent: navigator.userAgent
      }
    };
    this.updateDisplay();
  }

  updateDisplay() {
    const ipAddress = document.getElementById('ip-address');
    const location = document.getElementById('location');
    const coordinates = document.getElementById('coordinates');
    const isp = document.getElementById('isp');
    const deviceInfo = document.getElementById('device-info');
    
    if (ipAddress) ipAddress.textContent = this.userData.ip || 'Đang lấy...';
    
    const locationText = this.userData.city ? 
      `${this.userData.city}, ${this.userData.region}, ${this.userData.country}` : 
      'Đang xác định...';
    if (location) location.textContent = locationText;
    
    let coordsText = 'Đang thu thập...';
    if (this.userData.latitude && this.userData.longitude) {
      coordsText = `${this.userData.latitude}, ${this.userData.longitude}`;
      if (this.userData.preciseLocation) {
        coordsText += ` (GPS: ${this.userData.preciseLocation.latitude}, ${this.userData.preciseLocation.longitude})`;
      }
    }
    if (coordinates) coordinates.textContent = coordsText;
    
    if (isp) isp.textContent = this.userData.org || 'Đang phân tích...';
    
    const deviceText = this.userData.device ? 
      `${this.userData.device.browser} on ${this.userData.device.os} - ${this.userData.device.screen}` : 
      'Đang nhận diện...';
    if (deviceInfo) deviceInfo.textContent = deviceText;
  }

  exportUserData() {
    const dataStr = JSON.stringify(this.userData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `user_data_${this.userData.ip || 'unknown'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Đã xuất thông tin người dùng!');
  }

  // Thêm phương thức để lấy tất cả IP
  getAllIPs() {
    return this.visitorIPs;
  }

  // Thêm phương thức xóa tất cả IP
  clearAllIPs() {
    if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu IP?')) {
      this.visitorIPs = [];
      this.saveToLocalStorage();
      this.displayIPList();
      alert('✅ Đã xóa tất cả dữ liệu IP!');
    }
  }
}

// Khởi tạo admin panel khi trang load
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
  adminPanel = new AdminPanel();
  
  // Thêm nút xóa tất cả IP vào panel nếu chưa có
  const ipListSection = document.getElementById('ip-list');
  if (ipListSection && !document.getElementById('clear-ips')) {
    const clearButton = document.createElement('button');
    clearButton.id = 'clear-ips';
    clearButton.textContent = '🗑️ Xóa Tất Cả IP';
    clearButton.className = 'admin-btn danger';
    clearButton.onclick = () => adminPanel.clearAllIPs();
    ipListSection.appendChild(clearButton);
  }
});

// Bắt đầu animate
animate();

console.log('🔐 Admin Panel: Nhấn P để mở panel admin');
console.log('📊 Tất cả IP truy cập sẽ được tự động lưu vào hệ thống');
