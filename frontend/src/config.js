// API Configuration with Auto-Discovery
// This allows the app to automatically find the active backend server

// List of possible backend servers (update IPs as needed)
const POSSIBLE_SERVERS = [
  'http://localhost:5000',        // If running on the same machine
  'http://10.0.0.6:5000',         // Desktop IP (update with your actual IP)
  'http://192.168.1.100:5000',    // Laptop IP (update with your actual IP)
];

// Timeout for each server check (in milliseconds)
const SERVER_CHECK_TIMEOUT = 2000;

// Cached active server to avoid repeated discovery
let cachedActiveServer = null;

/**
 * Attempts to connect to a server's health endpoint
 * @param {string} serverUrl - The server URL to test
 * @returns {Promise<boolean>} - True if server is reachable
 */
async function checkServerHealth(serverUrl) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERVER_CHECK_TIMEOUT);
    
    const response = await fetch(`${serverUrl}/api/health`, {
      signal: controller.signal,
      method: 'GET',
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Finds the first available backend server from the list
 * @returns {Promise<string>} - The URL of the active server
 */
async function findActiveServer() {
  // Return cached server if available
  if (cachedActiveServer) {
    // Verify cached server is still alive
    const isAlive = await checkServerHealth(cachedActiveServer);
    if (isAlive) {
      return cachedActiveServer;
    }
    // Cache invalid, clear it
    cachedActiveServer = null;
  }

  // Check if we're on localhost - prioritize localhost backend
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    const localhostServer = 'http://localhost:5000';
    const isAlive = await checkServerHealth(localhostServer);
    if (isAlive) {
      cachedActiveServer = localhostServer;
      return localhostServer;
    }
  }

  // Try all possible servers
  for (const serverUrl of POSSIBLE_SERVERS) {
    if (serverUrl === 'http://localhost:5000' && isLocalhost) {
      continue; // Already checked above
    }
    
    const isAlive = await checkServerHealth(serverUrl);
    if (isAlive) {
      cachedActiveServer = serverUrl;
      console.log(`✅ Found active server: ${serverUrl}`);
      return serverUrl;
    }
  }

  // No server found
  throw new Error('No backend server found. Please ensure the backend is running.');
}

/**
 * Gets the API base URL (discovers it if needed)
 * @returns {Promise<string>} - The base URL for API calls
 */
export async function getApiBaseUrl() {
  return await findActiveServer();
}

/**
 * Clears the cached server (useful for forcing rediscovery)
 */
export function clearServerCache() {
  cachedActiveServer = null;
}

// Export for manual configuration if needed
export { POSSIBLE_SERVERS };

