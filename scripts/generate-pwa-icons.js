const fs = require("fs")
const path = require("path")

// Create a simple PNG file with proper dimensions
// This uses a minimal PNG structure with solid color
function createPNG(width, height, color = [26, 26, 26]) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(2, 9) // color type (2 = RGB)
  ihdr.writeUInt8(0, 10) // compression
  ihdr.writeUInt8(0, 11) // filter
  ihdr.writeUInt8(0, 12) // interlace

  const ihdrChunk = createChunk("IHDR", ihdr)

  // Create image data (solid color)
  const bytesPerPixel = 3 // RGB
  const rowBytes = width * bytesPerPixel + 1 // +1 for filter byte
  const imageData = Buffer.alloc(height * rowBytes)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes
    imageData.writeUInt8(0, rowOffset) // filter method (0 = none)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel
      imageData.writeUInt8(color[0], pixelOffset) // R
      imageData.writeUInt8(color[1], pixelOffset + 1) // G
      imageData.writeUInt8(color[2], pixelOffset + 2) // B
    }
  }

  // Compress the image data (we'll use a simple approach)
  const zlib = require("zlib")
  const compressedData = zlib.deflateSync(imageData, { level: 9 })
  const idatChunk = createChunk("IDAT", compressedData)

  // IEND chunk (image end)
  const iendChunk = createChunk("IEND", Buffer.alloc(0))

  // Combine all chunks
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeBuffer = Buffer.from(type, "ascii")
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(calculateCRC(crcData), 0)

  return Buffer.concat([length, typeBuffer, data, crc])
}

function calculateCRC(data) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Create icons directory
const iconsDir = path.join(__dirname, "..", "public", "icons")
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Generate icons
console.log("Generating PWA icons...")

const icon192 = createPNG(192, 192, [26, 26, 26])
fs.writeFileSync(path.join(iconsDir, "icon-192.png"), icon192)
console.log("✓ Created icon-192.png (192x192)")

const icon512 = createPNG(512, 512, [26, 26, 26])
fs.writeFileSync(path.join(iconsDir, "icon-512.png"), icon512)
console.log("✓ Created icon-512.png (512x512)")

console.log("\nDone! Icons created in public/icons/")
