import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import type * as THREE from 'three';
import { HEART_CLIP_PATH, HEART_CURVES, HEART_START } from './heart-outline';
import { HEXAGON_CLIP_PATH, HEXAGON_CORNERS } from './hexagon-outline';

@Component({
  selector: 'app-cookie-3d',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<div #surface class="surface" role="img" aria-label="Anteprima tridimensionale del biscotto" [attr.aria-busy]="!ready && !error"><span *ngIf="!ready && !error" class="loading" role="status" aria-label="Preparazione anteprima 3D"></span><p *ngIf="error" role="alert">{{ error }}</p></div>',
  styles: [':host { display:block; width:100%; aspect-ratio:1; } .surface { width:100%; height:100%; position:relative; } .surface canvas { display:block; width:100%; height:100%; touch-action:none; cursor:grab; } .surface canvas:active { cursor:grabbing; } p { padding:24px; color:#a32e43; } .loading { position:absolute; top:calc(50% - 12px); left:calc(50% - 12px); width:24px; height:24px; border:2px solid #dce7df; border-top-color:#205a48; border-radius:50%; animation:spin .8s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } } @media(prefers-reduced-motion:reduce) { .loading { animation:none; } }']
})
export class Cookie3dComponent implements AfterViewInit, OnDestroy {
  @Input() source!: HTMLElement;
  @Input() shape = 'circle';
  @ViewChild('surface') surface!: ElementRef<HTMLDivElement>;
  private readonly zone = inject(NgZone);
  error = '';
  ready = false;
  private destroyed = false;
  private cleanup = () => {};
  private observer?: MutationObserver;
  private timer?: ReturnType<typeof setTimeout>;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => void this.initialize());
  }

  private async initialize(): Promise<void> {
    try {
      const [T, { OrbitControls }] = await Promise.all([
        import('three'), import('three/addons/controls/OrbitControls.js')
      ]);
      if (this.destroyed) return;
      const host = this.surface.nativeElement;
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'grab', visibility: 'hidden' });
      host.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(35, 1, 0.1, 30);
      camera.position.set(2.4, 1.1, 5.5);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.rotateSpeed = 0.7;
      controls.update();
      let prepared = false;
      const render = () => { if (!this.destroyed && prepared) renderer.render(scene, camera); };
      controls.addEventListener('change', render);
      scene.add(new T.HemisphereLight(0xffffff, 0xc4b8a5, 2.8));
      const light = new T.DirectionalLight(0xffffff, 1.2);
      light.position.set(-3, 4, 5);
      scene.add(light);
      const outline = this.outline(T);
      let resolveBase!: () => void;
      let rejectBase!: (error: unknown) => void;
      const baseReady = new Promise<void>((resolve, reject) => { resolveBase = resolve; rejectBase = reject; });
      const base = new T.TextureLoader().load('assets/cookie-texture.jpg', () => {
        if (!this.destroyed) { bump.image = base.image; bump.needsUpdate = true; }
        resolveBase();
      }, undefined, rejectBase);
      base.colorSpace = T.SRGBColorSpace;
      base.wrapS = base.wrapT = T.RepeatWrapping;
      const bump = base.clone();
      bump.colorSpace = T.NoColorSpace;
      const sideMaterial = new T.MeshStandardMaterial({ map: base, bumpMap: bump, bumpScale: 0.018, color: 0xf3e4cb, roughness: 1 });
      const backMaterial = new T.MeshStandardMaterial({ map: base, roughness: 1 });
      const faceMaterial = new T.MeshBasicMaterial({ toneMapped: false });
      const bodyGeometry = new T.ExtrudeGeometry(outline, { depth: 0.14, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.025, bevelSegments: 6, curveSegments: 64 });
      bodyGeometry.translate(0, 0, -0.07);
      const cookieBounds = this.source.querySelector('.cookie-shape')!.getBoundingClientRect();
      const worldHeight = 2.3 * cookieBounds.height / cookieBounds.width;
      const perimeter = outline.getSpacedPoints(256);
      const distances = [0];
      for (let i = 1; i < perimeter.length; i++) distances.push(distances[i - 1] + perimeter[i].distanceTo(perimeter[i - 1]));
      const total = distances[distances.length - 1];
      const position = bodyGeometry.attributes['position'];
      const normal = bodyGeometry.attributes['normal'];
      const uv = bodyGeometry.attributes['uv'];
      // Caps use the same normalized coordinates as CSS; the edge wraps by
      // contour distance rather than clamping world coordinates into stripes.
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i);
        if (Math.abs(normal.getZ(i)) > 0.99) {
          uv.setXY(i, x / 2.3 + 0.5, y / worldHeight + 0.5);
        } else {
          let closest = Infinity, distance = 0;
          for (let p = 1; p < perimeter.length; p++) {
            const a = perimeter[p - 1], b = perimeter[p];
            const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
            if (!lengthSquared) continue;
            const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
            const squared = (x - a.x - t * dx) ** 2 + (y - a.y - t * dy) ** 2;
            if (squared < closest) { closest = squared; distance = distances[p - 1] + t * Math.sqrt(lengthSquared); }
          }
          uv.setXY(i, distance / total * 3, (position.getZ(i) + 0.095) / 0.19);
        }
      }
      bodyGeometry.clearGroups();
      let groupStart = 0, groupMaterial = -1;
      for (let i = 0; i < position.count; i += 3) {
        const z = normal.getZ(i);
        const material = z > 0.99 ? 2 : z < -0.99 ? 0 : 1;
        if (material !== groupMaterial) {
          if (i) bodyGeometry.addGroup(groupStart, i - groupStart, groupMaterial);
          groupStart = i; groupMaterial = material;
        }
      }
      bodyGeometry.addGroup(groupStart, position.count - groupStart, groupMaterial);
      scene.add(new T.Mesh(bodyGeometry, [backMaterial, sideMaterial, faceMaterial]));
      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        render();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      let generation = 0;
      const update = async () => {
        const current = ++generation;
        try {
          await Promise.all([document.fonts.ready, baseReady]);
          await (base.image as HTMLImageElement).decode();
          if (this.destroyed) return;
          const crop = await this.surfaceTexture(base.image as HTMLImageElement);
          if (this.destroyed || current !== generation) return;
          const texture = new T.CanvasTexture(crop);
          texture.colorSpace = T.SRGBColorSpace;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          faceMaterial.map?.dispose();
          faceMaterial.map = texture;
          faceMaterial.needsUpdate = true;
          prepared = true;
          render();
          renderer.domElement.style.visibility = 'visible';
          if (!this.ready) this.zone.run(() => this.ready = true);
          renderer.domElement.dataset['ready'] = 'true';
          renderer.domElement.dataset['hasPhoto'] = String(!!this.source.querySelector('.cookie-image'));
        } catch {
          if (!this.destroyed) this.zone.run(() => this.error = 'Impossibile aggiornare la vista 3D. Torna alla vista 2D.');
        }
      };
      this.observer = new MutationObserver(() => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void update(), 180);
      });
      this.observer.observe(this.source, { subtree: true, attributes: true, characterData: true, childList: true });
      const sourceResize = new ResizeObserver(() => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void update(), 180);
      });
      sourceResize.observe(this.source);
      this.cleanup = () => {
        sourceResize.disconnect();
        resizeObserver.disconnect();
        controls.dispose();
        bodyGeometry.dispose();
        sideMaterial.dispose();
        backMaterial.dispose();
        faceMaterial.map?.dispose();
        faceMaterial.dispose();
        base.dispose();
        bump.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
      };
      resize();
      await update();
    } catch {
      if (!this.destroyed) this.zone.run(() => this.error = 'Vista 3D non disponibile su questo dispositivo. Usa la vista 2D.');
    }
  }

  private outline(T: typeof THREE): THREE.Shape {
    const shape = new T.Shape();
    const element = this.source.querySelector<HTMLElement>('.cookie-shape')!;
    const bounds = element.getBoundingClientRect();
    const width = 2.3, height = width * bounds.height / bounds.width;
    if (this.shape === 'circle') {
      shape.absarc(0, 0, 1.15, 0, Math.PI * 2, false);
    } else if (this.shape === 'heart') {
      const x = (value: number) => (value / 100 - 0.5) * width;
      const y = (value: number) => (0.5 - value / 100) * height;
      shape.moveTo(x(HEART_START[0]), y(HEART_START[1]));
      for (const [x1, y1, x2, y2, x3, y3] of HEART_CURVES) {
        shape.bezierCurveTo(x(x1), y(y1), x(x2), y(y2), x(x3), y(y3));
      }
      shape.closePath();
    } else if (this.shape === 'hexagon') {
      const x = (value: number) => (value / 100 - 0.5) * width;
      const y = (value: number) => (0.5 - value / 100) * height;
      shape.moveTo(x(HEXAGON_CORNERS[0].entry[0]), y(HEXAGON_CORNERS[0].entry[1]));
      for (let i = 0; i < HEXAGON_CORNERS.length; i++) {
        const { control, exit } = HEXAGON_CORNERS[i];
        shape.quadraticCurveTo(x(control[0]), y(control[1]), x(exit[0]), y(exit[1]));
        const next = HEXAGON_CORNERS[(i + 1) % HEXAGON_CORNERS.length].entry;
        shape.lineTo(x(next[0]), y(next[1]));
      }
      shape.closePath();
    } else {
      const x = width / 2, y = height / 2;
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) / bounds.width * width;
      shape.moveTo(-x + radius, -y);
      shape.lineTo(x - radius, -y); shape.quadraticCurveTo(x, -y, x, -y + radius);
      shape.lineTo(x, y - radius); shape.quadraticCurveTo(x, y, x - radius, y);
      shape.lineTo(-x + radius, y); shape.quadraticCurveTo(-x, y, -x, y - radius);
      shape.lineTo(-x, -y + radius); shape.quadraticCurveTo(-x, -y, -x + radius, -y);
      shape.closePath();
    }
    return shape;
  }

  private async surfaceTexture(baseImage: HTMLImageElement): Promise<HTMLCanvasElement> {
    const dimensions = this.source.getBoundingClientRect();
    const clone = this.source.cloneNode(true) as HTMLElement;
    clone.classList.remove('preview-source-hidden');
    clone.style.setProperty('--cookie-heart-clip', HEART_CLIP_PATH);
    clone.style.setProperty('--cookie-hexagon-clip', HEXAGON_CLIP_PATH);
    clone.querySelectorAll('[data-preview-control]').forEach(control => control.remove());
    Object.assign(clone.style, {
      position: 'relative', top: '0', left: '0', opacity: '1',
      width: dimensions.width + 'px', height: dimensions.height + 'px',
      maxHeight: 'none', maxWidth: 'none', margin: '0', pointerEvents: 'none',
      background: 'transparent'
    });
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelector<HTMLElement>('.cookie-shape')!.style.boxShadow = 'none';
    clone.querySelector<HTMLElement>('.cookie-shadow')?.style.setProperty('filter', 'none');
    const container = document.createElement('div');
    Object.assign(container.style, { position: 'fixed', top: '0', left: '-10000px', width: dimensions.width + 'px', pointerEvents: 'none' });
    container.appendChild(clone);
    document.body.appendChild(container);
    try {
      const bounds = clone.getBoundingClientRect();
      const cookie = clone.querySelector('.cookie-shape')!.getBoundingClientRect();
      const { toCanvas } = await import('html-to-image');
      const capture = () => toCanvas(clone, {
        pixelRatio: 2, style: { position: 'relative', left: '0', top: '0' }
      });
      let captured = await capture();
      const hasSurface = (image: HTMLCanvasElement) => {
        const scale = image.width / bounds.width;
        const x = Math.floor((cookie.left - bounds.left + cookie.width / 2) * scale);
        const y = Math.floor((cookie.top - bounds.top + cookie.height / 2) * scale);
        return image.getContext('2d')!.getImageData(x, y, 1, 1).data[3] > 0;
      };
      // A cold SVG rasterization can resolve before its foreignObject is painted.
      if (!hasSurface(captured)) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        captured = await capture();
      }
      if (!hasSurface(captured)) throw new Error('Cookie capture is empty');
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = Math.round(1024 * cookie.height / cookie.width);
      const scale = captured.width / bounds.width;
      const context = canvas.getContext('2d')!;
      // Opaque base prevents transparent capture pixels becoming black on the mesh.
      const cover = Math.max(canvas.width / baseImage.naturalWidth, canvas.height / baseImage.naturalHeight);
      const baseWidth = baseImage.naturalWidth * cover, baseHeight = baseImage.naturalHeight * cover;
      context.drawImage(baseImage, (canvas.width - baseWidth) / 2, (canvas.height - baseHeight) / 2, baseWidth, baseHeight);
      context.drawImage(captured,
        (cookie.left - bounds.left) * scale, (cookie.top - bounds.top) * scale,
        cookie.width * scale, cookie.height * scale,
        0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      container.remove();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.timer);
    this.observer?.disconnect();
    this.cleanup();
  }
}
