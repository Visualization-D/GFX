function componentToHex(value: number) {
  return Math.round(value).toString(16).padStart(2, '0')
}

function toHex(color: number[]) {
  return `#${componentToHex(color[0])}${componentToHex(color[1])}${componentToHex(color[2])}`
}

export function extractPalette(source: HTMLImageElement | HTMLCanvasElement, count = 5) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0, 96, 96)
  const pixels = ctx.getImageData(0, 0, 96, 96).data
  const samples: number[][] = []
  for (let i = 0; i < pixels.length; i += 16) {
    if (pixels[i + 3] > 160) samples.push([pixels[i], pixels[i + 1], pixels[i + 2]])
  }
  if (!samples.length) throw new Error('No visible colors could be extracted from this seed.')

  const sorted = [...samples].sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]))
  let centers = Array.from({ length: count }, (_, index) => [...sorted[Math.floor((index + 0.5) / count * (sorted.length - 1))]])
  let groups: number[][][] = []
  for (let iteration = 0; iteration < 10; iteration += 1) {
    groups = Array.from({ length: count }, () => [])
    for (const sample of samples) {
      let closest = 0
      let distance = Number.POSITIVE_INFINITY
      centers.forEach((center, index) => {
        const next = (sample[0] - center[0]) ** 2 + (sample[1] - center[1]) ** 2 + (sample[2] - center[2]) ** 2
        if (next < distance) { closest = index; distance = next }
      })
      groups[closest].push(sample)
    }
    centers = centers.map((center, index) => {
      const group = groups[index]
      if (!group.length) return center
      return [0, 1, 2].map((channel) => group.reduce((sum, sample) => sum + sample[channel], 0) / group.length)
    })
  }
  return centers
    .map((center, index) => ({ color: toHex(center), population: groups[index]?.length ?? 0 }))
    .sort((a, b) => b.population - a.population)
    .map((entry) => entry.color)
}
