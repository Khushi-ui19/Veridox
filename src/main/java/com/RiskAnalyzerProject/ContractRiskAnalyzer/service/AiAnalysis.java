package com.RiskAnalyzerProject.ContractRiskAnalyzer.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AiAnalysis {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    @Autowired
    public AiAnalysis(ChatModel chatModel, ChatMemory chatMemory) {
        this.chatMemory = chatMemory;
        this.chatClient = ChatClient.builder(chatModel).build();
    }

    @Cacheable(value = "contractAnalysis", key = "#contractText.hashCode()+ #jurisdiction + #contractType")
    public String AnalysisContract(String contractText, String jurisdiction, String contractType) {
        String safeText = contractText.length() > 60000
                ? contractText.substring(0, 60000) : contractText;
        String prompt = """
              ROLE:
                     You are a Senior Legal Document Analyst. Your goal is accuracy first, then risk analysis.
                
                CONTEXT:
                     The user has uploaded a document for review under **%s LAW**.
                     The user describes it as: **%s**.
                
                TASK 1: DOCUMENT CLASSIFICATION (CRITICAL)
                     Read the text. Is this actually a Legal Contract, Agreement, Policy, or Binding Term Sheet?
                     
                     **SCENARIO A: It is NOT a Contract (e.g., Certificate, Diploma, Invoice, Receipt, Resume, ID Card)**
                     - STOP analyzing risks.
                     - Set "risk_score": 0.
                     - Set "risk_level": "Safe".
                     - In "summary": Explicitly state "This document appears to be a [Document Type] and does not contain legal risks."
                     - Return empty lists for "key_risks", "missing_clauses", etc.
                
                     **SCENARIO B: It IS a Contract**
                     - Proceed with Strict Legal Risk Audit.
                     - Be paranoid and critical.
                     - Identify 3-5 distinct risks (Unlimited Liability, Auto-Renewal, etc.).
                
                TASK 2: OUTPUT FORMAT
                    You must output ONLY valid, raw JSON. 
                    - DO NOT use Markdown code blocks (```json).
                    - DO NOT include any text before the opening brace '{'.
                    
                    JSON Structure:
                        {
                          "summary": "High-level executive summary...",
                          "risk_score": 0-100 (Integer. 0 for Certificates/Safe docs),
                          "risk_level": "Low/Medium/High (Safe for Certificates)",
                          "key_risks": [
                                {
                                    "clause": "Quote the specific short text from contract",
                                    "severity": "High/Medium/Low",
                                    "risk_explanation": "Explain clearly why this is dangerous for the user."
                                }
                          ],
                          "missing_clauses": ["List of missing protective clauses"],
                          "recommendations": ["Specific actions to fix the risks"],
                          "comparison_notes": "How this compares to industry standards" 
                        }
                
                DOCUMENT TEXT:
                """.formatted(jurisdiction.toUpperCase(), contractType.toUpperCase()) + safeText;
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .temperature(0.4)
                .build();
        // Call the AI model
        return chatClient.prompt()
                .user(prompt)
                .options(options)
                .call()
                .content();

    }
    public String chatWithAI(String question , String contractText,String conversationId) {
        String prompt = question;
        if (contractText != null && !contractText.isEmpty()) {
            String safeText = contractText.length() > 15000
                    ? contractText.substring(0, 15000)
                    : contractText;
            prompt = """
              ROLE:
                    You are a strict Legal Contract Analyst.
                
                INSTRUCTIONS:
                    1. Answer the user's question using **ONLY** the contract text below.
                    2. **CITE YOUR SOURCES**: When you make a claim, mention the specific Clause (e.g., "According to Clause 4.2...").
                    3. If the answer is NOT in the text, say: "I cannot find that information in this specific contract." Do not guess.
                    4. Keep answers concise and direct.
                
                --- CONTRACT TEXT START ---
                %s
                --- CONTRACT TEXT END ---
                """.formatted(safeText);

        } else {
            prompt = """
                ROLE:
                    You are an expert AI Legal Assistant.
                
                INSTRUCTIONS:
                    1. Help the user with general legal concepts, definitions, and drafting advice.
                    2. **DISCLAIMER**: Always imply that you provide information, not legal advice.
                    3. Be professional, clear, and educational.
                    4. If asked about a specific document, ask the user to upload it first.
                """;
        }
        // 1. Retrieve full history
        List<Message> fullHistory = chatMemory.get(conversationId);
        int maxHistory = 20;
        List<Message> recentHistory;
        if (fullHistory.size() > maxHistory) {
            recentHistory = fullHistory.subList(fullHistory.size() - maxHistory, fullHistory.size());
        } else {
            recentHistory = fullHistory;
        }
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model("llama-3.3-70b-versatile")
                .temperature(0.5)
                .build();
        String response =  chatClient.prompt()
                .system(prompt)
                .messages(recentHistory)
                .user(question)
                .options(options)
                .call()
                .content();
        chatMemory.add(conversationId, new UserMessage(question));
        chatMemory.add(conversationId, new AssistantMessage(response));

        return response;
    }
}
