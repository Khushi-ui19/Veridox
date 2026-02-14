package com.RiskAnalyzerProject.ContractRiskAnalyzer.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.Data;

@Data
@Document(collection = "contracts")
public class Contract {
    @Id
    private String id;
    private String ownerUsername;
    private String filename;
    private String uploadDate;
    private String rawText; //Extract-> text from pdf
    private String analysisJson; //Return->Json String by AI
    private String jurisdiction;
    private String contractType;
    private String status;
    private Long fileSize;   // Size in bytes
    private Integer pageCount;
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getExtractedText() {
        return this.rawText;
    }

    }
