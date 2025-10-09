const { spawn } = require('child_process');
const { findPorts } = require('./port-finder');
const path = require('path');

async function startServers() {
  try {
    console.log('🔍 Finding available ports...');
    
    // Find available ports
    const ports = await findPorts();
    
    console.log(`✅ Found available ports:`);
    console.log(`   Backend: ${ports.backend}`);
    console.log(`   Frontend: ${ports.frontend}`);
    
    // Set environment variables for the ports
    process.env.BACKEND_PORT = ports.backend;
    process.env.FRONTEND_PORT = ports.frontend;
    
    console.log('\n🚀 Starting servers...');
    
    // Start backend server
    console.log(`📡 Starting backend on port ${ports.backend}...`);
    const backendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'backend'),
      env: { ...process.env, PORT: ports.backend },
      stdio: 'inherit',
      shell: true
    });
    
    // Wait a moment for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start frontend server
    console.log(`🌐 Starting frontend on port ${ports.frontend}...`);
    const frontendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      env: { ...process.env, PORT: ports.frontend },
      stdio: 'inherit',
      shell: true
    });
    
    // Wait a moment for frontend to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🎉 Both servers started successfully!');
    console.log(`\n📋 Access your application:`);
    console.log(`   Frontend: http://localhost:${ports.frontend}`);
    console.log(`   Backend API: http://localhost:${ports.backend}`);
    console.log(`   Health Check: http://localhost:${ports.backend}/api/health`);
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down servers...');
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });
    
    // Keep the script running
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error starting servers:', error);
    process.exit(1);
  }
}

// Start the servers
startServers();
