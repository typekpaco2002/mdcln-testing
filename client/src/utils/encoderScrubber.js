/**
 * Browser byte-level scrubber: replace FFmpeg/Lavf/codec signatures with device-like
 * strings so MediaInfo shows iPhone/Android, not FFmpeg. Mutates buffer in place, same length.
 */

const SAME_LENGTH_PAIRS = [
  ["FFmpeg", "iPhone"],
  ["libx264", "Apple H"],
  ["libx265", "Apple H"],
  ["Lavc59.", "Apple iPh"],
  ["Lavc60.", "Apple iPh"],
];

const PREFIX_REPLACEMENTS = [
  { prefix: "Lavf", overwriteLen: 14, replacement: "Apple iPhone 14" },
  { prefix: "Lavc", overwriteLen: 14, replacement: "Apple iPhone 14" },
];

const encoder = new TextEncoder();

function indexOfBytes(buffer, search, fromIndex = 0) {
  const n = search.length;
  if (n === 0 || fromIndex + n > buffer.length) return -1;
  for (let i = fromIndex; i <= buffer.length - n; i++) {
    let match = true;
    for (let j = 0; j < n; j++) {
      if (buffer[i + j] !== search[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

function overwrite(buffer, offset, bytes) {
  for (let i = 0; i < bytes.length && offset + i < buffer.length; i++) {
    buffer[offset + i] = bytes[i];
  }
}

/**
 * Mutates the buffer in place. Replace FFmpeg/Lavf/Lavc/libx264 signatures with device strings.
 * @param {Uint8Array} buffer - file bytes (mutated in place)
 */
export function scrubEncoderSignatures(buffer) {
  if (!buffer || buffer.length === 0) return;
  const encode = (s) => encoder.encode(s);

  for (const [searchStr, replaceStr] of SAME_LENGTH_PAIRS) {
    const search = encode(searchStr);
    const replace = encode(replaceStr);
    if (search.length !== replace.length) continue;
    let pos = 0;
    while ((pos = indexOfBytes(buffer, search, pos)) >= 0) {
      overwrite(buffer, pos, replace);
      pos += search.length;
    }
  }

  for (const { prefix, overwriteLen, replacement } of PREFIX_REPLACEMENTS) {
    const prefixBytes = encode(prefix);
    const replaceBytes = encode(replacement);
    if (replaceBytes.length !== overwriteLen) continue;
    let pos = 0;
    while ((pos = indexOfBytes(buffer, prefixBytes, pos)) >= 0) {
      if (pos + overwriteLen <= buffer.length) {
        overwrite(buffer, pos, replaceBytes);
      }
      pos += overwriteLen;
    }
  }
}
