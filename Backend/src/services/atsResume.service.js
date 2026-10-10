const puppeteer = require("puppeteer")

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function buildAtsResumeHtml({ resume, jobTitle, matchedKeywords }) {
    const resumeContent = String(resume)
        .split(/\r?\n/)
        .map((line) => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<div class="spacer"></div>')
        .join("")
    const keywordContent = matchedKeywords.length
        ? `<section><h2>Role keywords already present in your resume</h2><p>${matchedKeywords.map(escapeHtml).join(" · ")}</p></section>`
        : ""

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ATS Resume - ${escapeHtml(jobTitle)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { color: #172033; font: 10.5pt Arial, sans-serif; line-height: 1.45; }
    h1 { margin: 0 0 5mm; font-size: 18pt; }
    h2 { margin: 7mm 0 2mm; font-size: 11pt; text-transform: uppercase; }
    .target-role { margin-bottom: 7mm; color: #475569; font-size: 10pt; }
    .resume-content p { margin: 0 0 2mm; white-space: pre-wrap; }
    .resume-content .spacer { height: 2mm; }
    section { border-top: 1px solid #cbd5e1; margin-top: 7mm; padding-top: 1mm; }
  </style>
</head>
<body>
  <h1>Resume</h1>
  <div class="target-role">Target role: ${escapeHtml(jobTitle)}</div>
  <div class="resume-content">${resumeContent}</div>
  ${keywordContent}
</body>
</html>`
}

async function generateAtsResumePdf(options) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    })

    try {
        const page = await browser.newPage()
        await page.setContent(buildAtsResumeHtml(options), { waitUntil: "domcontentloaded" })
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "18mm", right: "18mm", bottom: "18mm", left: "18mm" }
        })
        return Buffer.from(pdf)
    } finally {
        await browser.close()
    }
}

module.exports = { buildAtsResumeHtml, generateAtsResumePdf }
