package com.RiskAnalyzerProject.ContractRiskAnalyzer.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

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
    private Integer analysisProgress;
    private Long fileSize;   // Size in bytes
    private Integer pageCount;

    public Contract() {}

    public Contract(String id, String ownerUsername, String filename, String uploadDate, String rawText, String analysisJson, String jurisdiction, String contractType, String status, Integer analysisProgress, Long fileSize, Integer pageCount) {
        this.id = id;
        this.ownerUsername = ownerUsername;
        this.filename = filename;
        this.uploadDate = uploadDate;
        this.rawText = rawText;
        this.analysisJson = analysisJson;
        this.jurisdiction = jurisdiction;
        this.contractType = contractType;
        this.status = status;
        this.analysisProgress = analysisProgress;
        this.fileSize = fileSize;
        this.pageCount = pageCount;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getOwnerUsername() {
        return ownerUsername;
    }

    public void setOwnerUsername(String ownerUsername) {
        this.ownerUsername = ownerUsername;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getUploadDate() {
        return uploadDate;
    }

    public void setUploadDate(String uploadDate) {
        this.uploadDate = uploadDate;
    }

    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }

    public String getAnalysisJson() {
        return analysisJson;
    }

    public void setAnalysisJson(String analysisJson) {
        this.analysisJson = analysisJson;
    }

    public String getJurisdiction() {
        return jurisdiction;
    }

    public void setJurisdiction(String jurisdiction) {
        this.jurisdiction = jurisdiction;
    }

    public String getContractType() {
        return contractType;
    }

    public void setContractType(String contractType) {
        this.contractType = contractType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getAnalysisProgress() {
        return analysisProgress;
    }

    public void setAnalysisProgress(Integer analysisProgress) {
        this.analysisProgress = analysisProgress;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public Integer getPageCount() {
        return pageCount;
    }

    public void setPageCount(Integer pageCount) {
        this.pageCount = pageCount;
    }

    public String getExtractedText() {
        return this.rawText;
    }
}
