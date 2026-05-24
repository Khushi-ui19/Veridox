package com.veridox.dto;

public class ChatRequest {
    private String question;
    private String contractId;
    private String conversationId;

    public ChatRequest() {}

    public ChatRequest(String question, String contractId, String conversationId) {
        this.question = question;
        this.contractId = contractId;
        this.conversationId = conversationId;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getContractId() {
        return contractId;
    }

    public void setContractId(String contractId) {
        this.contractId = contractId;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }
}
