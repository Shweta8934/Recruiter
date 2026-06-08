import { fromBuffer } from "pdf2pic";
import fs from "fs";
import os from "os";

async function run() {
  try {
    // We need a dummy PDF to test pdf2pic
    const dummyPdfBase64 = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1LBSKUrnCtRTcCxR0lRLzy/KSVGzVDXUVDfUVDXWVDW0VDYAUAA2QCf0KZW5kc3RyZWFtCmVuZG9iagoKMyAwIG9iago0MgplbmRvYmoKCjUgMCBvYmoKPDwvTGVuZ3RoIDYgMCBSL0ZpbHRlci9GbGF0ZURlY29kZS9MZW5ndGgxIDcwMjwvS2lkcyBbXSA+PgplbmRvYmoKCjYgMCBvYmoKNTY2CmVuZG9iagoKMSAwIG9iago8PC9UeXBlL1BhZ2UvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDQgMCBSPj4+Pi9NZWRpYUJveFswIDAgNTk1IDg0Ml0vQ29udGVudHMgMiAwIFIvUGFyZW50IDcgMCBSPj4KZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iagoKNyAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1sxIDAgUl0+PgplbmRvYmoKCjggMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDcgMCBSPj4KZW5kb2JqCgo5IDAgb2JqCjw8L1Byb2R1Y2VyKEdob3N0c2NyaXB0IDkuMjcpL0NyZWF0aW9uRGF0ZShEOjIwMjAwNDEzMTQ1MzM1KzAzJzAwJyk+PgplbmRvYmoKCnhyZWYKMCAxMAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAyMDkgMDAwMDAgbiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTMyIDAwMDAwIG4gCjAwMDAwMDAzMDUgMDAwMDAgbiAKMDAwMDAwMDE1MyAwMDAwMCBuIAowMDAwMDAwMTg4IDAwMDAwIG4gCjAwMDAwMDAzOTMgMDAwMDAgbiAKMDAwMDAwMDQ1MCAwMDAwMCBuIAowMDAwMDAwNDk1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSAxMC9Sb290IDggMCBSL0luZm8gOSAwIFIvSUQgWzw2YjZmZjE5ZTE5ZmUzODdjZjM3MmIwMTkxYzRjMmUyYT48NmI2ZmYxOWUxOWZlMzg3Y2YzNzJiMDE5MWM0YzJlMmE+XT4+CnN0YXJ0eHJlZgo1OTUKJSVFT0YK";
    const pdfBuffer = Buffer.from(dummyPdfBase64, "base64");

    const options = {
      density: 150,
      saveFilename: "scanned_resume_test",
      savePath: os.tmpdir(),
      format: "jpeg",
      width: 1024,
      height: 1448
    };
    const convert = fromBuffer(pdfBuffer, options);
    const result = await convert(1, { responseType: "base64" });
    const base64Image = result.base64;
  } catch (e) {
    console.error(e);
  }
}
run();
