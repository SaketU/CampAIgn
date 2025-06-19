// Types
export interface HealthResponse {
    status: string;
    message: string;
}

export interface AccountStatus {
    twitter: boolean;
    mailchimp: boolean;
    linkedin: boolean;
}

export interface PublishRequest {
    content: string;
    platforms: string[];
}

export interface PublishResponse {
    success: boolean;
    message: string;
    previewUrl?: string;
}

const API_BASE_URL = process.env.REACT_APP_CANVA_BACKEND_HOST || 'http://localhost:3001';

// Add Canva-specific headers
const getHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add Canva-specific headers if available
    const canvaBrandId = (window as any).canva?.brandId;
    const canvaUserId = (window as any).canva?.userId;

    if (canvaBrandId) {
        headers['X-Canva-Brand-Id'] = canvaBrandId;
    }
    if (canvaUserId) {
        headers['X-Canva-User-Id'] = canvaUserId;
    }

    return headers;
};

export const checkHealth = async (): Promise<HealthResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            headers: getHeaders(),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
};

export const getAccounts = async (): Promise<AccountStatus> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/accounts`, {
            method: 'GET',
            headers: getHeaders(),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to get accounts:', error);
        throw error;
    }
};

export const publishContent = async (data: PublishRequest): Promise<PublishResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/publish`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to publish content:', error);
        throw error;
    }
}; 