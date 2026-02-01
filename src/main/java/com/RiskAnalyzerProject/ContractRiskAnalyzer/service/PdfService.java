package com.RiskAnalyzerProject.ContractRiskAnalyzer.service;

import java.io.IOException;
import java.awt.image.BufferedImage;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;

@Service
public class PdfService {
    private ITesseract tesseract;
    // This runs ONLY when the first user uploads a file, not when the server starts.
    private ITesseract getTesseract() {
        if (tesseract == null) {
            tesseract = new Tesseract();

            // Logic to find the folder
            String projectPath = System.getProperty("user.dir");
            String tessDataPath = projectPath + File.separator + "tessdata";

            System.out.println("⚠️ Initializing Tesseract (First Time Load)...");
            System.out.println("📂 TessData Path: " + tessDataPath);

            tesseract.setDatapath(tessDataPath);
            tesseract.setLanguage("eng");
        }
        return tesseract;
    }
    public String Text(MultipartFile file) throws IOException{
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
        PDFTextStripper stripper = new PDFTextStripper();
        String text =  stripper.getText(document);
        if(text != null && !text.trim().isEmpty()){
            return text;
            }
            return extractTextUsingOCR(document);
    }
    }

    private String extractTextUsingOCR(PDDocument document) throws IOException {
        PDFRenderer pdfRenderer = new PDFRenderer(document);
        StringBuilder out = new StringBuilder();

        // Initialize Tesseract
        ITesseract tesseract = new Tesseract();

        String projectPath = System.getProperty("user.dir");
        String tessDataPath = projectPath + File.separator + "tessdata";
        System.out.println("OCR: Looking for tessdata at -> " + tessDataPath);
        tesseract.setDatapath(tessDataPath);
        // OPTIONAL: Set the path to your tessdata folder if not in default system path
        // tesseract.setDatapath("C:/Program Files/Tesseract-OCR/tessdata");


        tesseract.setLanguage("eng"); // Set language to English

        try {
            // Loop through all pages
            for (int page = 0; page < document.getNumberOfPages(); page++) {
                // Render page as an image (300 DPI is good for OCR)
                BufferedImage bim = pdfRenderer.renderImageWithDPI(page, 150, ImageType.RGB);

                // Perform OCR on the image
                String result = tesseract.doOCR(bim);
                out.append(result);
                bim.flush();
                bim = null;
            }
        } catch (TesseractException e) {
            System.err.println("OCR Failed. Checked path: " + tessDataPath);
            throw new IOException("OCR processing failed", e);
        }

        return out.toString();
    }
}
