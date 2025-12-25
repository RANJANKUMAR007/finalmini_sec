import CryptoJS from 'crypto-js';

// Generate a random encryption key (256 bits)
export const generateEncryptionKey = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Generate a random IV (128 bits for AES)
export const generateIV = () => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Encrypt text with AES-256
export const encryptText = (plaintext, key) => {
  const iv = generateIV();
  const keyWordArray = CryptoJS.enc.Hex.parse(key);
  const ivWordArray = CryptoJS.enc.Hex.parse(iv);
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: iv
  };
};

// Decrypt text with AES-256
export const decryptText = (ciphertext, key, iv) => {
  try {
    const keyWordArray = CryptoJS.enc.Hex.parse(key);
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(ciphertext)
    });
    
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

// Hash PIN for secure comparison
export const hashPin = (pin) => {
  return CryptoJS.SHA256(pin).toString();
};
