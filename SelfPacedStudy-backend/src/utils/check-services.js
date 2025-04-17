// Check system time
function checkSystemTime() {
  const systemTime = new Date();
  const year = systemTime.getFullYear();
  
  console.log(`Current system time: ${systemTime.toISOString()}`);
  
  // Check if system time is a future year
  if (year > 2024) {
    console.log(`⚠️ Warning: System time may be incorrect (year ${year})`);
    console.log('This may cause lecture unlock functionality to malfunction, recommend ensuring system time is correctly set');
  } else {
    console.log(`✅ System time normal (year ${year})`);
  }
}

// Check Ollama service
async function checkOllamaService() {
  try {
    const response = await fetch('http://localhost:11434/api/version');
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Ollama service available (version: ${data.version})`);
      return true;
    }
    console.log('❌ Ollama service unavailable');
    return false;
  } catch (error) {
    console.log('❌ Ollama service unavailable');
    console.log('❌ Ollama service unavailable');
    console.log(`  Error details: ${error.message}`);
    return false;
  }
}

// Check Ollama models
async function checkOllamaModels() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      const models = data.models ? data.models.map(m => m.name) : [];
      
      // Check required models
      const requiredModels = ['llama2', 'nomic-embed-text'];
      const missingModels = requiredModels.filter(model => !models.includes(model));
      
      if (missingModels.length === 0) {
        console.log('✅ All required Ollama models are installed');
      } else {
        console.log('⚠️ Missing the following models: ' + missingModels.join(', '));
        console.log('Please use the following commands to install the missing models:');
        missingModels.forEach(model => {
          console.log(`  ollama pull ${model}`);
        });
      }
    } else {
      console.log('❌ Unable to check Ollama models');
    }
  } catch (error) {
    console.log('❌ Unable to check Ollama models');
    console.log(`  Error details: ${error.message}`);
  }
}

// Main function
async function main() {
  console.log('========== Service Availability Check ==========');
  
  // Check system time
  checkSystemTime();
  
  // Check Ollama service
  console.log('Checking Ollama service...');
  const ollamaAvailable = await checkOllamaService();
  
  // If Ollama service is available, check models
  if (ollamaAvailable) {
    console.log('Checking Ollama models...');
    await checkOllamaModels();
  }
  
  console.log('======================================');
}

// Execute main function
main().catch(error => {
  console.error('Error occurred during service check:', error);
  process.exit(1);
}); 