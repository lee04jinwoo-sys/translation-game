import { pipeline, env, FeatureExtractionPipeline, Tensor } from '@xenova/transformers';

// Disable local models to fetch directly from Hugging Face Hub
env.allowLocalModels = false;

// We'll use a singleton pattern for the pipeline
class PipelineSingleton {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: Promise<FeatureExtractionPipeline> | null = null;

  static async getInstance(modelName?: string, progress_callback?: (data: any) => void) {
    if (modelName && modelName !== this.model) {
      this.model = modelName;
      this.instance = null;
    }
    if (this.instance === null) {
      this.instance = pipeline(this.task as any, this.model, { progress_callback }) as Promise<FeatureExtractionPipeline>;
    }
    return this.instance;
  }
}

// Helper to compute cosine similarity manually since cos_sim is sometimes buggy in older versions
function cos_sim(arr1: number[] | Float32Array, arr2: number[] | Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < arr1.length; i++) {
    dotProduct += arr1[i] * arr2[i];
    normA += arr1[i] * arr1[i];
    normB += arr2[i] * arr2[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, action, modelName, text1, text2, refText, userText } = event.data;
  const act = action || type;

  if (act === 'load' || act === 'init' || act === 'switch_model') {
    const targetModel = modelName || PipelineSingleton.model;
    try {
      self.postMessage({ type: 'status', status: 'loading', progress: '0%', modelName: targetModel });
      await PipelineSingleton.getInstance(targetModel, (x) => {
        if (x && x.status === 'progress') {
          const pct = Math.round((x.loaded / x.total) * 100) || 0;
          self.postMessage({ type: 'status', status: 'loading', progress: `${pct}%`, modelName: targetModel });
        }
      });
      self.postMessage({ type: 'status', status: 'ready', modelName: targetModel });
    } catch (e: any) {
      self.postMessage({ type: 'status', status: 'error', error: e.message });
    }
  } else if (act === 'compare' || act === 'calculate_score') {
    try {
      const targetUserText = userText || text1;
      const targetRefText = refText || text2;
      const extractor = await PipelineSingleton.getInstance();
      const outputRef = await extractor(targetRefText, { pooling: 'mean', normalize: true }) as Tensor;
      const outputUser = await extractor(targetUserText, { pooling: 'mean', normalize: true }) as Tensor;
      
      // Calculate cosine similarity & scale to 0~100 integer score
      const rawScore = cos_sim(outputRef.data as Float32Array, outputUser.data as Float32Array);
      const score = Math.min(100, Math.max(0, Math.round(rawScore * 100)));
      
      self.postMessage({ type: 'score_result', status: 'result', score });
    } catch (e: any) {
      self.postMessage({ type: 'error', status: 'error', error: e.message });
    }
  }
});
