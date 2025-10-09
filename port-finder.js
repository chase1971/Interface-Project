const net = require('net');

/**
 * Find an available port starting from a given port
 * @param {number} startPort - The port to start searching from
 * @param {number} maxAttempts - Maximum number of ports to try
 * @returns {Promise<number>} - The first available port found
 */
function findAvailablePort(startPort = 3000, maxAttempts = 100) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;

    function tryPort(port) {
      if (attempts >= maxAttempts) {
        reject(new Error(`No available ports found after ${maxAttempts} attempts`));
        return;
      }

      const server = net.createServer();
      
      server.listen(port, (err) => {
        if (err) {
          // Port is in use, try next one
          attempts++;
          currentPort++;
          tryPort(currentPort);
        } else {
          // Port is available
          server.close(() => {
            resolve(port);
          });
        }
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // Port is in use, try next one
          attempts++;
          currentPort++;
          tryPort(currentPort);
        } else {
          reject(err);
        }
      });
    }

    tryPort(currentPort);
  });
}

/**
 * Find available ports for both backend and frontend
 * @returns {Promise<{backend: number, frontend: number}>}
 */
async function findPorts() {
  try {
    // Find backend port (prefer 5000, but find any available)
    const backendPort = await findAvailablePort(5000, 50);
    
    // Find frontend port (prefer 3000, but find any available)
    const frontendPort = await findAvailablePort(3000, 50);
    
    return {
      backend: backendPort,
      frontend: frontendPort
    };
  } catch (error) {
    console.error('Error finding available ports:', error);
    throw error;
  }
}

module.exports = {
  findAvailablePort,
  findPorts
};
