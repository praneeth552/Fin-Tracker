import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Android Emulator, localhost is 10.0.2.2
// For iOS Simulator, it's localhost
// For real device, use your machine's IP (e.g., 192.168.1.X)
export const API_URL = Platform.select({
    android: 'http://10.0.2.2:8080/api',
    ios: 'http://localhost:8080/api',
}) || 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
});

// Auth State
let authToken: string | null = null;
let authUserId: number | null = null;

// Add token to requests
api.interceptors.request.use(async (config) => {
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});

// Helper to handle errors
const handleApiError = (error: any) => {
    if (error.response) {
        console.error('API Error:', error.response.data);
        const msg = error.response.data.error || error.response.data.message || 'Server error';
        throw new Error(msg);
    } else if (error.request) {
        console.error('Network Error:', error.request);
        throw new Error('Network error. Is the backend running?');
    } else {
        console.error('Error:', error.message);
        throw error;
    }
};

// --- API Methods ---

export const Api = {
    // Auth Management
    setAuth: (token: string, userId: number) => {
        authToken = token;
        authUserId = userId;
    },

    clearAuth: () => {
        authToken = null;
        authUserId = null;
    },

    getUserId: () => {
        if (!authUserId) throw new Error("User not authenticated");
        return authUserId;
    },

    login: async (data: any) => {
        try {
            const response = await api.post('/auth/login', data);
            return response.data; // Returns { token, user: { id, name, ... } }
        } catch (error) { handleApiError(error); }
    },

    register: async (data: any) => {
        try {
            const response = await api.post('/auth/register', data);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    verify: async (data: { email: string; otp: string }) => {
        try {
            const response = await api.post('/auth/verify', data);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    recalculateBalance: async () => {
        try {
            const userId = Api.getUserId();
            const response = await api.post(`/auth/recalculate-balance?userId=${userId}`);
            return response.data;
        } catch (error) { console.error('Recalc failed (harmless):', error); }
    },

    // Transactions
    getTransactions: async (userId?: number) => {
        try {
            const id = userId || Api.getUserId();
            const response = await api.get(`/transactions?userId=${id}`);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    createTransaction: async (data: any) => {
        try {
            const userId = Api.getUserId();
            const response = await api.post(`/transactions?userId=${userId}`, {
                ...data,
                userId,
                source: 'MANUAL'
            });
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    updateTransaction: async (id: string | number, data: any) => {
        try {
            const response = await api.put(`/transactions/${id}`, data);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    deleteTransaction: async (id: string | number) => {
        try {
            await api.delete(`/transactions/${id}`);
        } catch (error) { handleApiError(error); }
    },

    // Categories
    getCategories: async () => {
        try {
            const userId = Api.getUserId();
            const response = await api.get(`/categories?userId=${userId}`);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    createCategory: async (data: any) => {
        try {
            const userId = Api.getUserId();
            const response = await api.post(`/categories?userId=${userId}`, data);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    deleteCategory: async (id: number) => {
        try {
            await api.delete(`/categories/${id}`);
        } catch (error) { handleApiError(error); }
    },

    // Dashboard
    getDashboardSummary: async (month?: number, year?: number) => {
        try {
            const userId = Api.getUserId();
            let url = `/dashboard/summary?userId=${userId}`;
            if (month) url += `&month=${month}`;
            if (year) url += `&year=${year}`;
            const response = await api.get(url);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    getSpendingByCategory: async (month?: number, year?: number) => {
        try {
            const userId = Api.getUserId();
            let url = `/dashboard/spending-by-category?userId=${userId}`;
            if (month) url += `&month=${month}`;
            if (year) url += `&year=${year}`;
            const response = await api.get(url);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    // Bank Accounts
    getBankAccounts: async () => {
        try {
            const userId = Api.getUserId();
            const response = await api.get(`/bank-accounts?userId=${userId}`);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    createBankAccount: async (data: any) => {
        try {
            const userId = Api.getUserId();
            const response = await api.post(`/bank-accounts?userId=${userId}`, data);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    updateBankAccount: async (id: string, data: any) => {
        try {
            const response = await api.put(`/bank-accounts/${id}`, data);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    deleteBankAccount: async (id: string) => {
        try {
            await api.delete(`/bank-accounts/${id}`);
        } catch (error) { handleApiError(error); }
    },

    // Users
    getUser: async () => {
        try {
            const userId = Api.getUserId();
            const response = await api.get(`/auth/user/${userId}`);
            // Backend returns {success: true, user: {...}}, extract user object
            return response.data.user || response.data;
        } catch (error) { handleApiError(error); }
    },

    updateUser: async (data: { balance?: number; income?: number; name?: string }) => {
        try {
            const userId = Api.getUserId();
            const response = await api.put(`/auth/user/${userId}`, data);
            return response.data.user || response.data;
        } catch (error) { handleApiError(error); }
    },

    // --- Action Items ---
    getActions: async () => {
        try {
            const userId = Api.getUserId();
            const response = await api.get(`/actions?userId=${userId}`);
            return response.data;
        } catch (error) { handleApiError(error); return []; }
    },

    createAction: async (data: { title: string; desc?: string }) => {
        try {
            const userId = Api.getUserId();
            const response = await api.post('/actions', { ...data, userId, description: data.desc });
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    updateAction: async (id: string | number, data: any) => {
        try {
            const response = await api.put(`/actions/${id}`, data);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    deleteAction: async (id: string | number) => {
        try {
            await api.delete(`/actions/${id}`);
            return true;
        } catch (error) { handleApiError(error); return false; }
    },

    // --- Budgets ---
    getBudgets: async () => {
        try {
            const userId = Api.getUserId();
            const response = await api.get(`/budgets?userId=${userId}`);
            return response.data;
        } catch (error) { handleApiError(error); return []; }
    },

    upsertBudget: async (data: { category: string; limit: number }) => {
        try {
            const userId = Api.getUserId();
            const response = await api.post(`/budgets?userId=${userId}`, data);
            return response.data;
        } catch (error) { handleApiError(error); }
    },

    // SMS Parsing
    parseSms: async (data: { message: string; sender?: string }) => {
        try {
            const userId = Api.getUserId();
            const response = await api.post(`/sms/parse-and-create?userId=${userId}`, data);
            return response.data;
        } catch (error) {
            console.log('SMS parse error:', error);
            return null;
        }
    }
};

export default api;
