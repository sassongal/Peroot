
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to access headers if needed, but we use listModels via fetch or if SDK supports it.
    // The node SDK doesn't expose listModels cleanly on the main class in all versions, 
    // but we can try a direct fetch which is safer for debugging "404"
    
    console.log("Checking API Key: " + (process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "Present" : "Missing"));
    
    // Using fetch to list models
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`);
    const data = await response.json();
    
    if (data.error) {
        console.error("Error listing models:", data.error);
    } else {
        console.log("Available Models:");
        data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
    }
  } catch (error) {
    console.error("Script failed:", error);
  }
}

listModels();
