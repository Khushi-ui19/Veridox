package com.veridox.service;

import com.veridox.model.Contract;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class PdfReportService {

    public byte[] generateContractReport(Contract contract) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Font.NORMAL, Color.BLUE);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
            Font riskHighFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, java.awt.Color.RED);

            // Title
            Paragraph title = new Paragraph("Contract Risk Analysis Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph("\n"));

            // Meta Info
            document.add(new Paragraph("Filename: " + contract.getFilename(), bodyFont));
            document.add(new Paragraph("Date: " + contract.getUploadDate(), bodyFont));
            document.add(new Paragraph("Contract ID: " + contract.getId(), bodyFont));
            document.add(new Paragraph("-----------------------------------------------------------------------------"));
            document.add(new Paragraph("\n"));

            // Parse JSON Analysis
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = null;
            if (contract.getAnalysisJson() != null) {
                try {
                    root = mapper.readTree(contract.getAnalysisJson());
                } catch (Exception e) {
                    document.add(new Paragraph("Error parsing analysis data.", riskHighFont));
                }
            }

            if (root != null) {
                // 1. Executive Summary
                document.add(new Paragraph("Executive Summary", headerFont));
                String summary = root.path("summary").asText("No summary available.");
                document.add(new Paragraph(summary, bodyFont));
                document.add(new Paragraph("\n"));

                // 2. Risk Score
                document.add(new Paragraph("Risk Assessment", headerFont));
                String level = root.path("risk_level").asText("Unknown");
                int score = root.path("risk_score").asInt(0);
                document.add(new Paragraph("Risk Level: " + level, bodyFont));
                document.add(new Paragraph("Risk Score: " + score + "/100", bodyFont));
                document.add(new Paragraph("\n"));

                // 3. Key Risks
                document.add(new Paragraph("Key Risks Identified", headerFont));
                JsonNode risks = root.path("key_risks");
                if (risks.isArray() && risks.size() > 0) {
                    com.lowagie.text.List list = new com.lowagie.text.List(com.lowagie.text.List.UNORDERED);
                    for (JsonNode risk : risks) {
                        String severity = risk.path("severity").asText("Medium");
                        String clause = risk.path("clause").asText("Unknown Clause");
                        String explanation = risk.path("risk_explanation").asText("");

                        ListItem item = new ListItem();
                        item.add(new Chunk("[" + severity.toUpperCase() + "] " + clause + "\n", headerFont));
                        item.add(new Chunk("Explanation: " + explanation, bodyFont));
                        list.add(item);
                    }
                    document.add(list);
                } else {
                    document.add(new Paragraph("No significant risks identified.", bodyFont));
                }
                document.add(new Paragraph("\n"));

                // 4. Recommendations
                document.add(new Paragraph("Recommendations", headerFont));
                JsonNode recommendations = root.path("recommendations");
                if (recommendations.isArray() && recommendations.size() > 0) {
                    com.lowagie.text.List recList = new com.lowagie.text.List(com.lowagie.text.List.ORDERED);
                    for (JsonNode rec : recommendations) {
                        recList.add(new ListItem(rec.asText(), bodyFont));
                    }
                    document.add(recList);
                } else {
                    document.add(new Paragraph("No specific recommendations.", bodyFont));
                }
            } else {
                document.add(new Paragraph("Analysis data is missing or corrupted.", riskHighFont));
            }

            document.close();
            return out.toByteArray();
        }
    }
}