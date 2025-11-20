import { GoogleGenAI } from "@google/genai";
import { CertificateInfo } from "../types";

// Initialize with process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeCertificate = async (info: CertificateInfo, chainLength: number) => {
  try {
    const prompt = `
      Analyze this X.509 Certificate context:
      Common Name: ${info.commonName}
      Issuer: ${info.issuer}
      Organization: ${info.organization}
      Validity: ${info.validFrom} to ${info.validTo}
      Chain Length: ${chainLength}

      Task:
      1. Provide a security assessment (short paragraph).
      2. Suggest a clean, technical filename based on the Common Name (e.g., wlc.overlords.radio).
      3. Create a short README content explaining the files in the generated tarball.

      Return JSON:
      {
        "assessment": "string",
        "suggestedFilename": "string",
        "readmeContent": "string"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback if API fails
    return {
      assessment: "Analysis unavailable. Please verify certificate manually.",
      suggestedFilename: info.commonName.replace(/\*/g, 'wildcard').replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase(),
      readmeContent: "Certificate Bundle\n\nContains:\n- .crt: Certificate\n- .prv: Private Key\n- .ca: Certificate Authority Chain"
    };
  }
};
