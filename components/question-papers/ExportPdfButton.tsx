"use client";

import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { questionPapersActions } from "@/store/slices/questionPapersSlice";

// Global cache for parsed colors to avoid redundant canvas rendering
const colorCache = new Map<string, string>();
let canvasEl: HTMLCanvasElement | null = null;
let canvasCtx: CanvasRenderingContext2D | null = null;

function convertModernColorToRgb(colorStr: string): string {
  const trimmed = colorStr.trim();
  if (!trimmed) return colorStr;

  // Only attempt to convert if it has oklch, oklab, lch, or lab functions
  const hasModernColor =
    trimmed.includes("oklch(") ||
    trimmed.includes("oklab(") ||
    trimmed.includes("lch(") ||
    trimmed.includes("lab(");

  if (!hasModernColor) {
    return colorStr;
  }

  // Skip strings containing css variables since Canvas context cannot resolve them
  if (trimmed.includes("var(")) {
    return colorStr;
  }

  if (colorCache.has(trimmed)) {
    return colorCache.get(trimmed)!;
  }

  try {
    if (typeof document !== "undefined") {
      if (!canvasEl) {
        canvasEl = document.createElement("canvas");
        canvasEl.width = 1;
        canvasEl.height = 1;
        canvasCtx = canvasEl.getContext("2d", { willReadFrequently: true });
      }

      if (canvasCtx) {
        // Clear pixel first
        canvasCtx.clearRect(0, 0, 1, 1);
        
        // Use a fallback-detection approach: set to a known transparent color, then assign the target
        canvasCtx.fillStyle = "rgba(0, 0, 0, 0)";
        canvasCtx.fillStyle = trimmed;
        canvasCtx.fillRect(0, 0, 1, 1);
        
        const imgData = canvasCtx.getImageData(0, 0, 1, 1);
        const [r, g, b, a] = imgData.data;

        // If parsed color is completely transparent (indicating parse failure or actual transparent),
        // let's double check. If a color is valid, it should either have alpha > 0 or be transparent black.
        if (a === 0 && !trimmed.toLowerCase().includes("transparent") && !trimmed.includes("/ 0")) {
          // Parse failed, return original color
          return colorStr;
        }

        let converted: string;
        if (a === 255) {
          converted = `rgb(${r}, ${g}, ${b})`;
        } else {
          converted = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
        }

        colorCache.set(trimmed, converted);
        return converted;
      }
    }
  } catch (e) {
    console.warn("[Color Convert Error] Failed to convert color:", trimmed, e);
  }

  return colorStr;
}

export function ExportPdfButton() {
  const [isGenerating, setIsGenerating] = useState(false);
  const dispatch = useDispatch();

  const handleDownload = async () => {

    setIsGenerating(true);
    const originalDisabledSheets: { el: HTMLStyleElement | HTMLLinkElement; disabled: boolean }[] = [];
    const tempStyleTags: HTMLStyleElement[] = [];
    const originalGetComputedStyle = window.getComputedStyle;

    try {
      // 1. Scan and sanitize all stylesheets to bypass html2canvas parsing crashes
      const stylesheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));

      
      for (let i = 0; i < stylesheets.length; i++) {
        const sheetEl = stylesheets[i];
        try {
          let cssText = "";
          let description = "";

          if (sheetEl.tagName === "STYLE") {
            cssText = sheetEl.textContent || "";
            description = `Inline <style> tag #${i}`;
          } else {
            const href = (sheetEl as HTMLLinkElement).href;
            description = `Linked stylesheet <link>: ${href}`;
            if (href) {
              await new Promise<void>((resolve) => {
                dispatch(questionPapersActions.fetchTextRequest({
                  url: href,
                  resolve: (text) => {
                    cssText = text;
                    resolve();
                  },
                  reject: () => resolve() // fail silently like before
                }));
              });
            }
          }

          const hasModernColors = 
            cssText.includes("lab(") || 
            cssText.includes("oklab(") || 
            cssText.includes("oklch(") || 
            cssText.includes("lch(");

          if (hasModernColors) {
            // Replace modern color spaces with standard RGB equivalents dynamically
            const cleanCssText = cssText
              .replace(/oklch\([^)]+\)/g, (match) => convertModernColorToRgb(match))
              .replace(/oklab\([^)]+\)/g, (match) => convertModernColorToRgb(match))
              .replace(/lch\([^)]+\)/g, (match) => convertModernColorToRgb(match))
              .replace(/lab\([^)]+\)/g, (match) => convertModernColorToRgb(match));

            // Create temporary stylesheet with clean CSS
            const style = document.createElement("style");
            style.textContent = cleanCssText;
            document.head.appendChild(style);
            tempStyleTags.push(style);

            // Record state and disable the incompatible sheet
            if (sheetEl.tagName === "STYLE") {
              const el = sheetEl as HTMLStyleElement;
              originalDisabledSheets.push({ el, disabled: el.disabled });
              el.disabled = true;
            } else {
              const el = sheetEl as HTMLLinkElement;
              originalDisabledSheets.push({ el, disabled: el.disabled });
              el.disabled = true;
            }
          }
        } catch (err) {
          console.warn(`[Diagnostics Warn] Failed processing ${sheetEl.tagName} element:`, err);
        }
      }

      // 2. Monkey-patch window.getComputedStyle to intercept and fix computed oklab/oklch/lab/lch values

      window.getComputedStyle = function (elt, pseudoElt) {
        const style = originalGetComputedStyle(elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            const val = Reflect.get(target, prop);
            
            // Intercept method calls like getPropertyValue
            if (prop === "getPropertyValue") {
              return function (propertyName: string) {
                const originalVal = target.getPropertyValue(propertyName);
                if (
                  typeof originalVal === "string" &&
                  (originalVal.includes("lab(") ||
                    originalVal.includes("oklab(") ||
                    originalVal.includes("oklch(") ||
                    originalVal.includes("lch("))
                ) {
                  return convertModernColorToRgb(originalVal);
                }
                return originalVal;
              };
            }

            // Bind native methods to target to prevent "Illegal invocation"
            if (typeof val === "function") {
              return val.bind(target);
            }

            // Intercept direct property access (e.g. style.backgroundColor)
            if (
              typeof val === "string" &&
              (val.includes("lab(") ||
                val.includes("oklab(") ||
                val.includes("oklch(") ||
                val.includes("lch("))
            ) {
              return convertModernColorToRgb(val);
            }
            return val;
          }
        });
      };


      // 3. Dynamically import html2pdf.js
      const html2pdf = (await import("html2pdf.js")).default;

      // 4. Select container
      const element = document.getElementById("printable-report-area");
      if (!element) {
        console.error("[DOM Error] #printable-report-area not found in document DOM!");
        toast.error("Printable report container not found");
        return;
      }

      // 5. Add temporary class for styling
      element.classList.add("pdf-print-mode");

      // 6. Configure options
      const opt = {
        margin: 15,
        filename: "candidate_test_report.pdf",
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          logging: true 
        },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };


      // 7. Generate and download PDF
      await html2pdf().set(opt).from(element).save();


      // 8. Cleanup temporary class
      element.classList.remove("pdf-print-mode");
    } catch (error) {
      console.error("[Critical Crash] PDF Generation process crashed:", error);
      toast.error("PDF generation failed. Please check browser developer tools console (F12) for error logs.");
    } finally {

      // 9. Restore original getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;

      // 10. Restore original stylesheets
      for (const item of originalDisabledSheets) {
        if (item.el.tagName === "STYLE") {
          (item.el as HTMLStyleElement).disabled = item.disabled;
        } else {
          (item.el as HTMLLinkElement).disabled = item.disabled;
        }
      }
      // 11. Remove temporary style tags
      for (const style of tempStyleTags) {
        style.remove();
      }

      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleDownload} disabled={isGenerating} className="gap-2">
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  );
}
