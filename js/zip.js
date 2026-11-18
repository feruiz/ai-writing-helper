// A minimal zip writer: files stored without compression, which is plenty for
// a couple of text files and needs no library. Names and contents are UTF-8.

const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// files: { "folder/name.txt": "text" }  ->  Uint8Array of the .zip
export function zip(files, date = new Date()) {
  const enc = new TextEncoder();
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const parts = [];
  const central = [];
  let offset = 0;
  const push = (...chunks) => chunks.forEach((c) => { parts.push(c); offset += c.length; });
  const header = (size, fields) => {
    const h = new DataView(new ArrayBuffer(size));
    fields.forEach(([at, bytes, value]) => (bytes === 2 ? h.setUint16(at, value, true) : h.setUint32(at, value, true)));
    return new Uint8Array(h.buffer);
  };
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name);
    const data = typeof content === "string" ? enc.encode(content) : content;
    const crc = crc32(data);
    // version 20, UTF-8 names (bit 11), method 0 (stored)
    const common = [[4, 2, 20], [6, 2, 0x0800], [8, 2, 0], [10, 2, time], [12, 2, day], [14, 4, crc], [18, 4, data.length], [22, 4, data.length], [26, 2, nameBytes.length]];
    central.push({ nameBytes, crc, size: data.length, at: offset });
    push(header(30, [[0, 4, 0x04034b50], ...common]), nameBytes, data);
  }
  const start = offset;
  for (const { nameBytes, crc, size, at } of central) {
    push(header(46, [[0, 4, 0x02014b50], [4, 2, 20], [6, 2, 20], [8, 2, 0x0800], [10, 2, 0], [12, 2, time], [14, 2, day], [16, 4, crc], [20, 4, size], [24, 4, size], [28, 2, nameBytes.length], [42, 4, at]]), nameBytes);
  }
  push(header(22, [[0, 4, 0x06054b50], [8, 2, central.length], [10, 2, central.length], [12, 4, offset - start], [16, 4, start]]));
  const out = new Uint8Array(offset);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
