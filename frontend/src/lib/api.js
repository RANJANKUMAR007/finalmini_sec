import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const apiClient = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Create a new secret
export const createSecret = async ({ encryptedData, iv, pinHash, expiryMinutes, oneTimeView }) => {
  const response = await apiClient.post('/secrets', {
    encrypted_data: encryptedData,
    iv: iv,
    pin_hash: pinHash || null,
    expiry_minutes: expiryMinutes,
    one_time_view: oneTimeView
  });
  return response.data;
};

// Get secret info (check if exists and requires PIN)
export const getSecretInfo = async (secretId) => {
  const response = await apiClient.get(`/secrets/${secretId}`);
  return response.data;
};

// View/fetch a secret with optional PIN
export const viewSecret = async (secretId, pinHash = null) => {
  const response = await apiClient.post(`/secrets/${secretId}/view`, 
    pinHash ? { pin_hash: pinHash } : {}
  );
  return response.data;
};

// Delete a secret
export const deleteSecret = async (secretId) => {
  const response = await apiClient.delete(`/secrets/${secretId}`);
  return response.data;
};

export default apiClient;
