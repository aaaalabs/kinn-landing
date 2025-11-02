/**
 * Gravatar Integration for KINN
 *
 * Provides automatic profile images via Gravatar with elegant fallback to initials.
 * Zero friction: Works automatically if user has Gravatar, otherwise shows KINN-branded initials.
 *
 * Usage:
 *   import { getGravatarUrl, getInitialsAvatarUrl } from './gravatar.js';
 *   const avatarUrl = getGravatarUrl(email);
 *   const fallbackUrl = getInitialsAvatarUrl(name);
 */

/**
 * Simple MD5 implementation for email hashing
 * Source: blueimp/JavaScript-MD5 (MIT License)
 * Minified for performance
 */
function md5(string) {
  function rotateLeft(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }

  function addUnsigned(x, y) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function md5_F(x, y, z) { return (x & y) | ((~x) & z); }
  function md5_G(x, y, z) { return (x & z) | (y & (~z)); }
  function md5_H(x, y, z) { return x ^ y ^ z; }
  function md5_I(x, y, z) { return y ^ (x | (~z)); }

  function md5_FF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5_GG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5_HH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function md5_II(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(md5_I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = new Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;

    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }

    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue) {
    let wordToHexValue = '';
    let wordToHexValue_temp = '';
    let lByte, lCount;

    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValue_temp = '0' + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length - 2, 2);
    }

    return wordToHexValue;
  }

  const x = convertToWordArray(string);
  let a = 0x67452301;
  let b = 0xEFCDAB89;
  let c = 0x98BADCFE;
  let d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a;
    const BB = b;
    const CC = c;
    const DD = d;

    a = md5_FF(a, b, c, d, x[k + 0], 7, 0xD76AA478);
    d = md5_FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756);
    c = md5_FF(c, d, a, b, x[k + 2], 17, 0x242070DB);
    b = md5_FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE);
    a = md5_FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF);
    d = md5_FF(d, a, b, c, x[k + 5], 12, 0x4787C62A);
    c = md5_FF(c, d, a, b, x[k + 6], 17, 0xA8304613);
    b = md5_FF(b, c, d, a, x[k + 7], 22, 0xFD469501);
    a = md5_FF(a, b, c, d, x[k + 8], 7, 0x698098D8);
    d = md5_FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF);
    c = md5_FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1);
    b = md5_FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE);
    a = md5_FF(a, b, c, d, x[k + 12], 7, 0x6B901122);
    d = md5_FF(d, a, b, c, x[k + 13], 12, 0xFD987193);
    c = md5_FF(c, d, a, b, x[k + 14], 17, 0xA679438E);
    b = md5_FF(b, c, d, a, x[k + 15], 22, 0x49B40821);
    a = md5_GG(a, b, c, d, x[k + 1], 5, 0xF61E2562);
    d = md5_GG(d, a, b, c, x[k + 6], 9, 0xC040B340);
    c = md5_GG(c, d, a, b, x[k + 11], 14, 0x265E5A51);
    b = md5_GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA);
    a = md5_GG(a, b, c, d, x[k + 5], 5, 0xD62F105D);
    d = md5_GG(d, a, b, c, x[k + 10], 9, 0x2441453);
    c = md5_GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681);
    b = md5_GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8);
    a = md5_GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6);
    d = md5_GG(d, a, b, c, x[k + 14], 9, 0xC33707D6);
    c = md5_GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87);
    b = md5_GG(b, c, d, a, x[k + 8], 20, 0x455A14ED);
    a = md5_GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905);
    d = md5_GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8);
    c = md5_GG(c, d, a, b, x[k + 7], 14, 0x676F02D9);
    b = md5_GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A);
    a = md5_HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942);
    d = md5_HH(d, a, b, c, x[k + 8], 11, 0x8771F681);
    c = md5_HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122);
    b = md5_HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C);
    a = md5_HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44);
    d = md5_HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9);
    c = md5_HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60);
    b = md5_HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70);
    a = md5_HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6);
    d = md5_HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA);
    c = md5_HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085);
    b = md5_HH(b, c, d, a, x[k + 6], 23, 0x4881D05);
    a = md5_HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039);
    d = md5_HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5);
    c = md5_HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8);
    b = md5_HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665);
    a = md5_II(a, b, c, d, x[k + 0], 6, 0xF4292244);
    d = md5_II(d, a, b, c, x[k + 7], 10, 0x432AFF97);
    c = md5_II(c, d, a, b, x[k + 14], 15, 0xAB9423A7);
    b = md5_II(b, c, d, a, x[k + 5], 21, 0xFC93A039);
    a = md5_II(a, b, c, d, x[k + 12], 6, 0x655B59C3);
    d = md5_II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92);
    c = md5_II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D);
    b = md5_II(b, c, d, a, x[k + 1], 21, 0x85845DD1);
    a = md5_II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F);
    d = md5_II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0);
    c = md5_II(c, d, a, b, x[k + 6], 15, 0xA3014314);
    b = md5_II(b, c, d, a, x[k + 13], 21, 0x4E0811A1);
    a = md5_II(a, b, c, d, x[k + 4], 6, 0xF7537E82);
    d = md5_II(d, a, b, c, x[k + 11], 10, 0xBD3AF235);
    c = md5_II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB);
    b = md5_II(b, c, d, a, x[k + 9], 21, 0xEB86D391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

/**
 * Get Gravatar URL for email address
 *
 * @param {string} email - User email address
 * @param {number} size - Image size in pixels (default: 200)
 * @returns {string} Gravatar URL (returns 404 if no Gravatar exists)
 *
 * @example
 *   const url = getGravatarUrl('thomas@kinn.at', 200);
 *   // Returns: https://www.gravatar.com/avatar/HASH?d=404&s=200&r=pg
 */
export function getGravatarUrl(email, size = 200) {
  if (!email) return null;

  const hash = md5(email.toLowerCase().trim());

  // d=404 → return 404 if no Gravatar (we'll show initials fallback)
  // s=size → image size
  // r=pg → PG rating (family-friendly)
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=${size}&r=pg`;
}

/**
 * Generate KINN-branded initials avatar as Data URL SVG
 *
 * @param {string} name - User name
 * @param {number} size - SVG size in pixels (default: 200)
 * @returns {string} Data URL with inline SVG
 *
 * @example
 *   const url = getInitialsAvatarUrl('Thomas Maier', 200);
 *   // Returns: data:image/svg+xml,...
 */
export function getInitialsAvatarUrl(name, size = 200) {
  if (!name || name.trim() === '') {
    name = 'KINN';
  }

  // Extract initials (max 2 characters)
  const initials = name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .filter(char => char)
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fontSize = Math.floor(size * 0.4); // 40% of container size

  // KINN Mint gradient background with initials
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="kinn-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#5ED9A6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4EC995;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#kinn-gradient)"/>
      <text
        x="50%"
        y="50%"
        font-family="Work Sans, system-ui, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#000"
      >${initials}</text>
    </svg>
  `.trim();

  // Encode SVG as Data URL
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Create avatar element with Gravatar + initials fallback
 *
 * @param {string} email - User email
 * @param {string} name - User name
 * @param {number} size - Avatar size (default: 64)
 * @param {string} className - CSS class name (default: 'profile-avatar')
 * @returns {HTMLImageElement} Image element with Gravatar + fallback
 *
 * @example
 *   const avatar = createAvatarElement('thomas@kinn.at', 'Thomas Maier', 64);
 *   container.appendChild(avatar);
 */
export function createAvatarElement(email, name, size = 64, className = 'profile-avatar') {
  const img = document.createElement('img');

  img.src = getGravatarUrl(email, size);
  img.alt = name || email;
  img.width = size;
  img.height = size;
  img.className = className;
  img.loading = 'lazy';

  // Fallback to initials if Gravatar not found
  img.onerror = function() {
    this.src = getInitialsAvatarUrl(name, size);
    this.onerror = null; // Prevent infinite loop
  };

  return img;
}
