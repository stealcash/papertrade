import axios from 'axios';
import { Platform } from 'react-native';

// TODO: Change this to your computer's IP address if running on a physical device.
// Your current local IP: 'http://192.168.0.104:8000'
const DEV_API_URL = Platform.select({
    ios: 'http://192.168.0.104:8000',
    android: 'http://192.168.0.104:8000',
});

const apiClient = axios.create({
    baseURL: `${DEV_API_URL}/api/v1/`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

import * as SecureStore from 'expo-secure-store';

apiClient.interceptors.request.use(async (config) => {
    try {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error('Error fetching token', error);
    }
    return config;
});

export default apiClient;
