/**
 * Service availability check script
 * Check if key services are available before starting the app
 */

/**
 * Check if Ollama service is available
 */
async function checkOllamaService(): Promise<boolean> {
  try {
    console.log('Checking Ollama service...');
    const response = await fetch('http://127.0.0.1:11434/api/version', {
      method: 'GET',
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Ollama service available (version: ${data.version})`);
      return true;
    } else {
      console.error(`❌ Ollama service response abnormal: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Ollama service connection failed:', error);
    return false;
  }
}

/**
 * Check if models are downloaded
 */
async function checkOllamaModels(): Promise<boolean> {
  try {
    console.log('Checking Ollama models...');
    const response = await fetch('http://127.0.0.1:11434/api/tags', {
      method: 'GET',
    });
    
    if (response.ok) {
      const data = await response.json();
      const models = data.models || [];
      const requiredModels = ['llama2', 'nomic-embed-text'];
      
      const missingModels = requiredModels.filter(
        model => !models.some((m: any) => m.name === model)
      );
      
      if (missingModels.length === 0) {
        console.log(`✅ All required models are installed: ${requiredModels.join(', ')}`);
        return true;
      } else {
        console.warn(`⚠️ Missing the following models: ${missingModels.join(', ')}`);
        console.log('Please use the following commands to install missing models:');
        missingModels.forEach(model => {
          console.log(`  ollama pull ${model}`);
        });
        return false;
      }
    } else {
      console.error(`❌ Unable to get model list: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Model check failed:', error);
    return false;
  }
}

/**
 * Main check function
 */
async function checkServices(): Promise<void> {
  console.log('========== Service Availability Check ==========');
  
  const ollamaAvailable = await checkOllamaService();
  
  if (ollamaAvailable) {
    await checkOllamaModels();
  } else {
    console.log('Please ensure Ollama service is running:');
    console.log('  Command: ollama serve');
  }
  
  console.log('======================================');
}

// Run checks
checkServices().catch(error => {
  console.error('Service check failed:', error);
  process.exit(1);
});

export default checkServices; 