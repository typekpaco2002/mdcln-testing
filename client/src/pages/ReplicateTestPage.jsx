import { useState, useCallback } from "react";
import { useAuthStore } from "../store";

export default function ReplicateTestPage() {
  const { isAuthenticated, user } = useAuthStore();
  
  const [prompt, setPrompt] = useState("beautiful woman, photorealistic, high quality");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [aiModel, setAiModel] = useState("seedream");
  
  const [identityFiles, setIdentityFiles] = useState([]);
  const [identityPreviews, setIdentityPreviews] = useState([]);
  const [identityDragging, setIdentityDragging] = useState(false);
  
  const [referenceFile, setReferenceFile] = useState(null);
  const [referencePreview, setReferencePreview] = useState(null);
  const [referenceDragging, setReferenceDragging] = useState(false);

  const uploadToR2 = async (file) => {
    const formData = new FormData();
    formData.append("photo", file);
    
    console.log("[TEST] Uploading file:", file.name);
    
    const response = await fetch("/api/test-replicate/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    
    const data = await response.json();
    console.log("[TEST] Upload response:", data);
    if (!data.success) throw new Error(data.error || "Upload failed");
    return data.url;
  };

  const handleIdentityDrop = useCallback((e) => {
    e.preventDefault();
    setIdentityDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) {
      const newFiles = [...identityFiles, ...files].slice(0, 3);
      setIdentityFiles(newFiles);
      setIdentityPreviews(newFiles.map(f => URL.createObjectURL(f)));
    }
  }, [identityFiles]);

  const handleIdentitySelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) {
      const newFiles = [...identityFiles, ...files].slice(0, 3);
      setIdentityFiles(newFiles);
      setIdentityPreviews(newFiles.map(f => URL.createObjectURL(f)));
    }
  };

  const removeIdentityPhoto = (index) => {
    const newFiles = identityFiles.filter((_, i) => i !== index);
    setIdentityFiles(newFiles);
    setIdentityPreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const handleReferenceDrop = useCallback((e) => {
    e.preventDefault();
    setReferenceDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setReferenceFile(file);
      setReferencePreview(URL.createObjectURL(file));
    }
  }, []);

  const handleReferenceSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReferenceFile(file);
      setReferencePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerate = async () => {
    console.log("[TEST] Generate clicked");
    console.log("[TEST] Session:", isAuthenticated ? "present" : "missing");
    console.log("[TEST] User:", user?.email);
    console.log("[TEST] Identity files:", identityFiles.length);
    console.log("[TEST] Reference file:", referenceFile ? "yes" : "no");
    console.log("[TEST] Model:", aiModel);
    
    if (!isAuthenticated) {
      setError("Not logged in - please login first at /login");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus("Starting...");

    try {
      const identityUrls = [];
      for (let i = 0; i < identityFiles.length; i++) {
        setStatus(`Uploading identity photo ${i + 1}/${identityFiles.length}...`);
        const url = await uploadToR2(identityFiles[i]);
        identityUrls.push(url);
        console.log("[TEST] Uploaded identity", i + 1, url);
      }
      
      let referenceImageUrl = null;
      if (referenceFile) {
        setStatus("Uploading reference image...");
        referenceImageUrl = await uploadToR2(referenceFile);
        console.log("[TEST] Uploaded reference:", referenceImageUrl);
      }
      
      setStatus("Calling Replicate API (30-90 seconds)...");
      console.log("[TEST] Calling generate endpoint");

      const response = await fetch("/api/test-replicate/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          prompt,
          model: aiModel,
          imageUrl: referenceImageUrl,
          referenceUrls: identityUrls.length > 0 ? identityUrls : undefined,
        }),
      });

      console.log("[TEST] Response status:", response.status);
      const data = await response.json();
      console.log("[TEST] Response data:", data);
      
      if (data.success) {
        setResult(data);
        setStatus("Complete!");
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (err) {
      console.error("[TEST] Error:", err);
      setError(err.message || "Unknown error occurred");
      setStatus("Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Replicate API Test</h1>
          <p className="text-gray-400">Admin test page - {user?.email || "Not logged in"}</p>
        </div>

        {!isAuthenticated && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
            Not logged in! <a href="/login" className="underline">Login here</a> first.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">Configuration</h2>
            
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1">AI Model</label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white"
                data-testid="select-ai-model"
              >
                <option value="seedream">Seedream V4.5 (identity preservation)</option>
                <option value="flux-nsfw">Flux NSFW (text-to-image only)</option>
                <option value="sdxl">SDXL img2img (transform reference)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {aiModel === "seedream" && "Best for face cloning - preserves identity from photos"}
                {aiModel === "flux-nsfw" && "Text only - ignores reference images"}
                {aiModel === "sdxl" && "Transforms reference image based on prompt"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1">
                Identity Photos (up to 3)
              </label>
              <div
                onDrop={handleIdentityDrop}
                onDragOver={(e) => { e.preventDefault(); setIdentityDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIdentityDragging(false); }}
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  identityDragging 
                    ? "border-purple-500 bg-purple-500/10" 
                    : "border-gray-600 hover:border-gray-500"
                }`}
              >
                {identityPreviews.length > 0 ? (
                  <div className="flex gap-3 flex-wrap">
                    {identityPreviews.map((preview, i) => (
                      <div key={i} className="relative">
                        <img src={preview} alt={`Identity ${i+1}`} className="w-20 h-20 rounded object-cover" />
                        <button
                          type="button"
                          onClick={() => removeIdentityPhoto(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {identityFiles.length < 3 && (
                      <label className="w-20 h-20 border-2 border-dashed border-gray-600 rounded flex items-center justify-center cursor-pointer hover:border-gray-500">
                        <span className="text-gray-400 text-2xl">+</span>
                        <input type="file" accept="image/*" onChange={handleIdentitySelect} className="hidden" multiple />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-400 text-sm mb-2">Drag & drop photos here</p>
                    <label className="inline-block px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded cursor-pointer">
                      Browse
                      <input type="file" accept="image/*" onChange={handleIdentitySelect} className="hidden" multiple />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene..."
                rows={3}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white resize-none text-sm"
                data-testid="input-prompt"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-1">
                Reference Image (for pose/scene)
              </label>
              <div
                onDrop={handleReferenceDrop}
                onDragOver={(e) => { e.preventDefault(); setReferenceDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setReferenceDragging(false); }}
                className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                  referenceDragging 
                    ? "border-cyan-500 bg-cyan-500/10" 
                    : "border-gray-600 hover:border-gray-500"
                }`}
              >
                {referencePreview ? (
                  <div className="space-y-2">
                    <img src={referencePreview} alt="Reference" className="max-h-32 mx-auto rounded" />
                    <button
                      type="button"
                      onClick={() => { setReferenceFile(null); setReferencePreview(null); }}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <p className="text-gray-400 text-sm mb-2">Drag & drop reference</p>
                    <label className="inline-block px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded cursor-pointer">
                      Browse
                      <input type="file" accept="image/*" onChange={handleReferenceSelect} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !token}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              data-testid="button-generate"
            >
              {loading ? "Processing..." : "Generate Now"}
            </button>

            {status && (
              <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
                {status}
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white">Results</h2>
            
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                <strong>Error:</strong> {error}
              </div>
            )}

            {!result && !error && !loading && (
              <div className="text-gray-500 text-center py-12">
                <p>Generated images will appear here</p>
              </div>
            )}

            {loading && !result && (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">{status || "Processing..."}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                  Success! Model: {result.model}
                </div>
                
                {result.image && (
                  <div>
                    <img
                      src={result.image}
                      alt="Generated"
                      className="w-full rounded-lg border border-gray-600"
                    />
                    <a
                      href={result.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                    >
                      Open Full Size
                    </a>
                  </div>
                )}
                
                {result.output && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Raw Output:</p>
                    <pre className="p-3 bg-gray-700 rounded-lg text-xs text-gray-300 overflow-auto max-h-48">
                      {JSON.stringify(result.output, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
