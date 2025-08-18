const fetch = require('node-fetch');
const logger = require('../utils/logger');

class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'tinyllama:latest';
    this.temperature = parseFloat(process.env.OLLAMA_TEMPERATURE) || 0.7;
    this.maxTokens = parseInt(process.env.OLLAMA_MAX_TOKENS) || 1024;
    
    // Centralized timeout configuration with proper hierarchy
    this.timeouts = {
      healthCheck: parseInt(process.env.OLLAMA_HEALTH_CHECK_TIMEOUT_MS) || 5000,
      serviceRequest: parseInt(process.env.OLLAMA_SERVICE_TIMEOUT_MS) || 120000,
      modelLoading: parseInt(process.env.OLLAMA_MODEL_LOADING_TIMEOUT_MS) || 60000,
      modelPull: parseInt(process.env.OLLAMA_MODEL_PULL_TIMEOUT_MS) || 600000
    };
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES) || 3,
      baseDelay: parseInt(process.env.OLLAMA_RETRY_BASE_DELAY_MS) || 1000,
      maxDelay: parseInt(process.env.OLLAMA_RETRY_MAX_DELAY_MS) || 10000
    };
    
    // Lightweight CPU-optimized models for fallback
    this.fallbackModels = [
      'tinyllama:latest',
      'tinyllama',
      'phi3:mini',
      'qwen2:0.5b',
      'gemma2:2b'
    ];
    
    // Cache for model availability
    this.modelCache = new Map();
    this.lastModelCheck = 0;
    this.modelCheckInterval = 5 * 60 * 1000; // 5 minutes

    // Circuit breaker state
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.circuitResetTimeout = 60 * 1000; // 1 minute
    this.failureThreshold = 5; // Number of failures to open the circuit
    
    // Initialize on startup
    this.initializeService();
  }

  /**
   * Initialize service on startup
   */
  async initializeService() {
    try {
      logger.info('Initializing Ollama service...');
      
      // Wait for service to be available with retries
      const isAvailable = await this.waitForService();
      if (!isAvailable) {
        logger.warn('Ollama service not available during initialization');
        return;
      }
      
      // Check and setup models
      await this.ensureModelAvailability();
      
      logger.info('Ollama service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Ollama service:', error.message);
    }
  }

  /**
   * Wait for Ollama service to become available with retries
   */
  async waitForService(maxWaitTime = 30000) {
    const startTime = Date.now();
    let attempt = 0;
    
    while (Date.now() - startTime < maxWaitTime) {
      attempt++;
      try {
        const isAvailable = await this.isAvailable();
        if (isAvailable) {
          logger.info(`Ollama service available after ${attempt} attempts`);
          return true;
        }
      } catch (error) {
        logger.debug(`Service check attempt ${attempt} failed:`, error.message);
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
        this.retryConfig.maxDelay
      ) + Math.random() * 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    logger.warn(`Ollama service not available after ${maxWaitTime}ms`);
    return false;
  }

  /**
   * Check if Ollama service is available with proper timeout
   */
  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeouts.healthCheck);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.debug(`Ollama service returned ${response.status}: ${response.statusText}`);
        logger.warn('Ollama service is NOT available.');
        return false;
      }
      logger.info('Ollama service is available.');
      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.debug('Ollama health check timed out');
      } else {
        logger.debug('Ollama service not available:', error.message);
      }
      return false;
    }
  }

  /**
   * Ensure at least one model is available, install fallback if needed
   */
  async ensureModelAvailability() {
    try {
      const models = await this.getAvailableModels();
      
      if (models.length === 0) {
        logger.info('No models found, attempting to install lightweight fallback model');
        
        // Try to install the first available fallback model
        for (const fallbackModel of this.fallbackModels) {
          try {
            logger.info(`Attempting to install fallback model: ${fallbackModel}`);
            await this.pullModel(fallbackModel);

            // Update default model to the successfully installed one
            this.model = fallbackModel;
            logger.info(`Successfully installed and set fallback model: ${fallbackModel}`);
            break;
          } catch (error) {
            logger.warn(`Failed to install ${fallbackModel}:`, error.message);
            continue;
          }
        }
      } else {
        // Check if configured model exists, use first available if not
        const modelExists = models.some(m => m.name.startsWith(this.model));
        if (!modelExists) {
          // If the configured model doesn't exist, try to pull it.
          try {
            logger.info(`Configured model '${this.model}' not found, attempting to pull it.`);
            await this.pullModel(this.model);
            logger.info(`Successfully pulled and set model: ${this.model}`);
          } catch (error) {
            logger.warn(`Failed to pull configured model '${this.model}'. Falling back to first available model.`);
            const firstModel = models[0]?.name || this.fallbackModels[0];
            logger.info(`Using fallback model: '${firstModel}'`);
            this.model = firstModel;
          }
        }
        
        logger.info(`Using model: ${this.model} (${models.length} models available)`);
      }
      
      // Cache the results
      this.modelCache.set('available', models);
      this.lastModelCheck = Date.now();
      
    } catch (error) {
      logger.error('Error ensuring model availability:', error.message);
      throw error;
    }
  }

  /**
   * Handle circuit breaker logic
   */
  _handleCircuitBreaker() {
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.circuitResetTimeout) {
        logger.info('Circuit breaker moving to HALF_OPEN state');
        this.circuitState = 'HALF_OPEN';
        this.failureCount = 0;
      } else {
        throw new Error('Ollama service is temporarily unavailable due to repeated failures (circuit breaker open).');
      }
    }
  }

  /**
   * Record a success in the circuit breaker
   */
  _recordSuccess() {
    if (this.circuitState === 'HALF_OPEN') {
      logger.info('Circuit breaker moving to CLOSED state');
      this.circuitState = 'CLOSED';
    }
    this.failureCount = 0;
  }

  /**
   * Record a failure in the circuit breaker
   */
  _recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      logger.warn(`Circuit breaker moving to OPEN state after ${this.failureCount} failures`);
      this.circuitState = 'OPEN';
    }
  }

  /**
   * Generate a response using Ollama with retry logic and proper timeout handling
   * @param {string} prompt - The prompt to send to the model
   * @param {object} options - Additional options
   */
  async generateResponse(prompt, options = {}) {
    this._handleCircuitBreaker();

    const maxRetries = options.maxRetries || this.retryConfig.maxRetries;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this._attemptGeneration(prompt, options, attempt);
        this._recordSuccess();
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this._shouldNotRetry(error)) {
          this._recordFailure();
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = this._calculateRetryDelay(attempt);
          logger.warn(`Generation attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error(`All ${maxRetries} generation attempts failed`);
    this._recordFailure();
    throw lastError;
  }

  /**
   * Single attempt at generating a response
   */
  async _attemptGeneration(prompt, options, attempt) {
    // Check service availability
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new Error('Ollama service is not available. Please ensure Ollama is running and accessible.');
    }

    const requestBody = {
      model: options.model || this.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: options.temperature || this.temperature,
        num_predict: options.maxTokens || this.maxTokens,
        top_p: options.topP || 0.9,
        top_k: options.topK || 40
      }
    };

    logger.info(`Generating response with Ollama model: ${requestBody.model} (attempt ${attempt})`);
    logger.debug('Ollama request body:', JSON.stringify(requestBody, null, 2));
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeouts.serviceRequest);
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        logger.warn(`Ollama responded with status ${response.status}:`, errorBody);
        // Handle model not found with auto-installation
        if (response.status === 404 && !options._autoInstallAttempted) {
          logger.warn(`Model ${requestBody.model} not found. Attempting auto-installation...`);
          try {
            await this.pullModel(requestBody.model);
            // Wait for model to be ready
            await new Promise(resolve => setTimeout(resolve, 3000));
            return await this._attemptGeneration(prompt, { ...options, _autoInstallAttempted: true }, attempt);
          } catch (pullErr) {
            logger.warn('Auto-installation failed:', pullErr.message);
            // Try fallback model
            if (!options._fallbackAttempted) {
              const fallbackModel = await this._getFallbackModel();
              if (fallbackModel) {
                logger.info(`Trying fallback model: ${fallbackModel}`);
                return await this._attemptGeneration(prompt, {
                  ...options,
                  model: fallbackModel,
                  _fallbackAttempted: true
                }, attempt);
              }
            }
          }
        }
        
        // Enhanced error handling
        const errorMessage = await this._getErrorMessage(response);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Ollama model error: ${data.error}`);
      }

      logger.info(`Successfully generated response from Ollama (attempt ${attempt})`);
      
      return {
        response: data.response,
        model: requestBody.model,
        promptTokens: data.prompt_eval_count || 0,
        responseTokens: data.eval_count || 0,
        totalDuration: data.total_duration || 0,
        attempt: attempt
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeouts.serviceRequest/1000}s. The model may be loading or the service is overloaded.`);
      }
      
      throw error;
    }
  }

  /**
   * Determine if an error should not be retried
   */
  _shouldNotRetry(error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('model') && message.includes('not found') ||
      message.includes('invalid') ||
      message.includes('malformed') ||
      message.includes('unauthorized')
    );
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  _calculateRetryDelay(attempt) {
    const baseDelay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, this.retryConfig.maxDelay);
  }

  /**
   * Get appropriate error message based on response
   */
  async _getErrorMessage(response) {
    try {
      const errorData = await response.json();
      if (errorData.error) {
        return `Ollama error: ${errorData.error}`;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    
    switch (response.status) {
      case 404:
        return `Model not found. Please ensure the model is installed in Ollama.`;
      case 500:
        return `Ollama server error. The model may be loading or corrupted.`;
      case 503:
        return `Ollama service unavailable. Please check if Ollama is running.`;
      case 429:
        return `Ollama service is overloaded. Please try again later.`;
      default:
        return `Ollama API error: ${response.status} ${response.statusText}`;
    }
  }

  /**
   * Get a fallback model that's available
   */
  async _getFallbackModel() {
    try {
      const models = await this.getAvailableModels();
      if (models.length > 0) {
        return models[0].name;
      }
      
      // Try to install a lightweight fallback
      for (const fallback of this.fallbackModels) {
        try {
          await this.pullModel(fallback);
          return fallback;
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.warn('Could not determine fallback model:', error.message);
    }
    
    return null;
  }

  /**
   * Generate a search response based on query and context
   * @param {string} query - User's search query
   * @param {Array} documentResults - Relevant documents found
   * @param {object} options - Additional options
   * @param {object} userSettings - User settings including external AI provider configuration
   */
  async generateSearchResponse(query, documentResults = [], options = {}, userSettings = {}) {
    try {
      let prompt;

      if (documentResults.length > 0) {
        // We have relevant documents, use them as context
        const context = documentResults
          .slice(0, 3) // Limit to top 3 results to avoid token limits
          .map(doc => `Document: ${doc.originalName}\nContent: ${doc.extractedText.substring(0, 500)}...`)
          .join('\n\n');

        prompt = `You are a System Administrator and IT Expert. Based on the following documentation, please answer the user's question.

Context from documentation:
${context}

User question: ${query}

Please provide a helpful answer based on the documentation above. If the documentation doesn't contain enough information to fully answer the question, mention what information is available and suggest what additional details might be needed.`;
      } else {
        // No relevant documents found, provide general IT assistance
        prompt = `You are a System Administrator and IT Expert. The user asked: "${query}"

I couldn't find any relevant documentation in the system for this query. However, I can provide general IT guidance based on my knowledge. Please provide a helpful response about this IT topic, and mention that this information is general guidance since no specific documentation was found in the system.`;
      }
      
      // Use external AI provider if enabled and API key is present
      if (userSettings.externalAiProviderEnabled && userSettings.externalAiApiKey) {
        logger.info('Using external AI provider for search response');
        // Construct the prompt for the external AI provider
        prompt = `${userSettings.externalAiSystemPrompt}\n\n${prompt}`;
        
        // Call the external AI provider API here
        // Replace this with your actual API call
        const externalAiResponse = await this.callExternalAiProvider(
          prompt,
          userSettings.externalAiApiKey,
          userSettings.externalAiProviderType || 'openai'
        );
        return externalAiResponse;
      } else {
        try {
          return await this.generateResponse(prompt, options);
        } catch (err) {
          // Surface error upward for route to supply fallback text
          throw err;
        }
      }
    } catch (error) {
      logger.error('Error generating search response:', error);
      throw error;
    }
  }

  /**
   * Generate document summary for pre-caching
   * @param {object} document - Document object with extracted text
   */
  async generateDocumentSummary(document) {
    try {
      const text = document.extractedText.substring(0, 2000); // Limit text length
      
      const prompt = `Please provide a concise summary of this IT documentation:

Document: ${document.originalName}
Content: ${text}

Summary should include:
1. Main topic/purpose
2. Key procedures or information
3. Important technical details
4. Who might find this useful

Keep the summary under 200 words.`;

      const response = await this.generateResponse(prompt, { maxTokens: 300 });
      
      return {
        summary: response.response,
        model: response.model,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating document summary:', error);
      throw error;
    }
  }

  /**
   * Generate potential questions for a document (for pre-caching)
   * @param {object} document - Document object with extracted text
   */
  async generatePotentialQuestions(document) {
    try {
      const text = document.extractedText.substring(0, 1500);
      
      const prompt = `Based on this IT documentation, generate 5 potential questions that users might ask:

Document: ${document.originalName}
Content: ${text}

Generate questions that:
1. are specific to the content
2. Would be commonly asked by IT staff
3. Can be answered by the documentation
4. Cover different aspects of the topic

Format as a numbered list.`;

      const response = await this.generateResponse(prompt, { maxTokens: 400 });
      
      // Parse the response to extract questions
      const questions = response.response
        .split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(q => q.length > 0);

      return {
        questions,
        model: response.model,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating potential questions:', error);
      throw error;
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error('Error fetching available models:', error);
      return [];
    }
  }

  /**
   * Pull a new model with proper timeout handling
   * @param {string} modelName - Name of the model to pull
   */
  async pullModel(modelName) {
    try {
      logger.info(`Pulling model: ${modelName}`);
      
      // Check if service is available first
      if (!await this.isAvailable()) {
        throw new Error('Ollama service is not available for model pulling');
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeouts.modelPull);
      
      try {
        const response = await fetch(`${this.baseUrl}/api/pull`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: modelName }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to pull model ${modelName}: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // Properly handle the streaming response
        for await (const chunk of response.body) {
          const chunkStr = new TextDecoder().decode(chunk);
          const lines = chunkStr.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.status) {
                logger.info(`Model pull progress: ${data.status}`);
              }
              if (data.error) {
                throw new Error(`Model pull error: ${data.error}`);
              }
            } catch (parseError) {
              // Ignore JSON parse errors for non-JSON lines
            }
          }
        }

        logger.info(`Successfully pulled model: ${modelName}`);
        
        // Invalidate model cache after successful pull
        this.modelCache.delete('available');
        this.lastModelCheck = 0;
        
        return true;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          throw new Error(`Model pull timed out after ${this.timeouts.modelPull/1000}s. Large models may take longer to download.`);
        }
        
        throw error;
      }
    } catch (error) {
      logger.error(`Error pulling model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Get health status of Ollama service
   */
  async getHealthStatus() {
    try {
      const startTime = Date.now();
      const isAvailable = await this.isAvailable();
      const responseTime = Date.now() - startTime;
      
      if (!isAvailable) {
        return {
          status: 'unhealthy',
          message: 'Ollama service is not responding',
          responseTime,
          timestamp: new Date().toISOString()
        };
      }
      
      // Get model information
      let models = [];
      let modelError = null;
      try {
        models = await this.getAvailableModels();
      } catch (error) {
        modelError = error.message;
      }
      
      return {
        status: 'healthy',
        message: 'Ollama service is running',
        responseTime,
        models: models.length,
        currentModel: this.model,
        modelError,
        timestamp: new Date().toISOString(),
        config: {
          baseUrl: this.baseUrl,
          timeouts: this.timeouts
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Re-rank documents for a query using the LLM (lightweight JSON scoring)
   * @param {string} query
   * @param {Array<{id:string, originalName:string, excerpt:string}>} docs
   * @returns {Promise<Object<string, number>>} mapping id->score(0-100)
   */
  async generateRelevanceScores(query, docs = []) {
    if (docs.length === 0) return {};
    try {
      const list = docs.map((d, i) => `DOC ${i+1} (id:${d.id}): ${d.originalName}\n${(d.excerpt||'').slice(0,280)}`).join('\n\n');
      const prompt = `You are ranking documents for relevance to a user query.\nQuery: "${query}"\nDocuments:\n${list}\n\nReturn a concise pure JSON object ONLY (no markdown) mapping document id to an integer relevance score 0-100 like: {"<id>": 87, "<id2>": 42}. Use higher scores for more relevant documents. If uncertain, give a moderate score.`;
      const response = await this.generateResponse(prompt, { maxTokens: 400 });
      const text = response.response.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return {};
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (err) {
      logger.warn('LLM re-ranking failed:', err.message);
      return {};
    }
  }
  
  /**
   * Call external AI provider API
   * @param {string} prompt - The prompt to send to the model
   * @param {string} apiKey - The API key for the external provider
   */
  async callExternalAiProvider(prompt, apiKey, providerType = 'openai') {
    logger.info(`Calling external AI provider API (provider=${providerType})`);

    let apiUrl;
    let requestBody;
    let headers = { 'Content-Type': 'application/json' };

    switch (providerType) {
      case 'openai':
        apiUrl = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;
        requestBody = {
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful IT assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 600
        };
        break;
      case 'google':
        apiUrl = (process.env.GOOGLE_GENAI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta/models') + `/${process.env.GOOGLE_GENAI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
        requestBody = { contents: [{ parts: [{ text: prompt }] }] };
        break;
      case 'anthropic':
        apiUrl = process.env.ANTHROPIC_API_BASE || 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        requestBody = {
          model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
          max_tokens: 600,
          temperature: 0.4,
          messages: [
            { role: 'user', content: prompt }
          ]
        };
        break;
      case 'azure-openai':
        // Azure deployment name required
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
        const azureBase = process.env.AZURE_OPENAI_API_BASE; // e.g. https://your-resource.openai.azure.com
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
        apiUrl = `${azureBase}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
        headers['api-key'] = apiKey;
        requestBody = {
          messages: [
            { role: 'system', content: 'You are a helpful IT assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 600
        };
        break;
      default:
        throw new Error(`Unsupported external AI provider type: ${providerType}`);
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`External AI provider API error: ${response.status} ${response.statusText} - ${text}`);
      }

      const data = await response.json();
      let content;
      switch (providerType) {
        case 'openai':
        case 'azure-openai':
          content = data.choices?.[0]?.message?.content || '';
          break;
        case 'google':
          content = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';
          break;
        case 'anthropic':
          content = data.content?.map(p => p.text).join('\n') || '';
          break;
      }

      return {
        response: content,
        model: providerType,
        promptTokens: data.usage?.prompt_tokens || 0,
        responseTokens: data.usage?.completion_tokens || 0,
        totalDuration: 0,
        attempt: 1
      };
    } catch (error) {
      logger.error('Error calling external AI provider API:', error.message);
      throw error;
    }
  }
}

module.exports = new OllamaService();
