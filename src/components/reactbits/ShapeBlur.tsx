import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
varying vec2 v_texcoord;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_texcoord = uv;
}
`

// Rewritten to use pixel-accurate coordinates so the rounded rect
// always matches the container's actual dimensions regardless of
// aspect ratio or viewport size.
const fragmentShader = /* glsl */ `
varying vec2 v_texcoord;

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_borderSize;
uniform float u_circleSize;
uniform float u_circleEdge;
uniform float u_cornerRadius; // in pixels

void main() {
    // Work in pixel coordinates (origin bottom-left)
    vec2 px = gl_FragCoord.xy;
    vec2 res = u_resolution;

    // Signed distance to a rounded rectangle that exactly fills the container.
    // The rect spans from (0,0) to (res.x, res.y).
    vec2 half_size = res * 0.5;
    float r = u_cornerRadius * u_pixelRatio;
    vec2 d = abs(px - half_size) - half_size + r;
    float sdfRect = (min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r) / min(res.x, res.y);

    // Mouse interaction — circle of influence
    vec2 mousePixel = u_mouse * u_pixelRatio;
    // Flip y: mouse is top-left origin, gl_FragCoord is bottom-left
    mousePixel.y = res.y - mousePixel.y;
    float distToMouse = length(px - mousePixel) / min(res.x, res.y);
    float sdfCircle = 1.0 - smoothstep(u_circleSize - u_circleEdge, u_circleSize + u_circleEdge, distToMouse);

    // Stroke the rounded rect border with mouse-reactive edge blur
    float bw = u_borderSize * 0.5;
    float afwidth = length(vec2(dFdx(sdfRect), dFdy(sdfRect))) * 0.7071;
    float edge = sdfCircle * 0.02 + afwidth;
    float stroke = smoothstep(-bw - edge, -bw + edge, sdfRect) - smoothstep(bw - edge, bw + edge, sdfRect);
    stroke = clamp(stroke * 4.0, 0.0, 1.0);

    gl_FragColor = vec4(vec3(1.0), stroke);
}
`

interface ShapeBlurProps {
  className?: string
  borderSize?: number
  circleSize?: number
  circleEdge?: number
  cornerRadius?: number
}

export default function ShapeBlur({
  className = '',
  borderSize = 0.015,
  circleSize = 0.25,
  circleEdge = 0.2,
  cornerRadius = 28,
}: ShapeBlurProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let active = true
    let animationFrameId: number
    let lastTime = 0

    const vMouse = new THREE.Vector2()
    const vMouseDamp = new THREE.Vector2()
    const vResolution = new THREE.Vector2()

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera()
    camera.position.z = 1

    const renderer = new THREE.WebGLRenderer({ alpha: true })
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const geo = new THREE.PlaneGeometry(1, 1)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_mouse: { value: vMouseDamp },
        u_resolution: { value: vResolution },
        u_pixelRatio: { value: 1 },
        u_borderSize: { value: borderSize },
        u_circleSize: { value: circleSize },
        u_circleEdge: { value: circleEdge },
        u_cornerRadius: { value: cornerRadius },
      },
      transparent: true,
    })

    const quad = new THREE.Mesh(geo, material)
    scene.add(quad)

    const onPointerMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect()
      vMouse.set(e.clientX - rect.left, e.clientY - rect.top)
    }

    document.addEventListener('mousemove', onPointerMove)
    document.addEventListener('pointermove', onPointerMove)

    const resize = () => {
      if (!active) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      const dpr = Math.min(window.devicePixelRatio, 2)

      renderer.setSize(w, h)
      renderer.setPixelRatio(dpr)

      camera.left = -w / 2
      camera.right = w / 2
      camera.top = h / 2
      camera.bottom = -h / 2
      camera.updateProjectionMatrix()

      quad.scale.set(w, h, 1)
      vResolution.set(w * dpr, h * dpr)
      material.uniforms.u_pixelRatio.value = dpr
    }

    resize()
    window.addEventListener('resize', resize)

    const ro = new ResizeObserver(() => {
      if (!active) return
      resize()
    })
    ro.observe(mount)

    const update = () => {
      if (!active) return
      const time = performance.now() * 0.001
      const dt = time - lastTime
      lastTime = time

      for (const k of ['x', 'y'] as const) {
        vMouseDamp[k] = THREE.MathUtils.damp(vMouseDamp[k], vMouse[k], 8, dt)
      }

      renderer.render(scene, camera)
      animationFrameId = requestAnimationFrame(update)
    }
    update()

    return () => {
      active = false
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
      ro.disconnect()
      document.removeEventListener('mousemove', onPointerMove)
      document.removeEventListener('pointermove', onPointerMove)
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
      renderer.forceContextLoss()
    }
  }, [borderSize, circleSize, circleEdge, cornerRadius])

  return <div className={className} ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
