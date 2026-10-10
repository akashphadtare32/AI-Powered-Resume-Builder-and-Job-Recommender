const test = require("node:test")
const assert = require("node:assert/strict")
const { buildAtsResumeHtml } = require("../src/services/atsResume.service")

test("ATS resume template preserves source content and escapes markup", () => {
    const html = buildAtsResumeHtml({
        resume: "Developer\nReact & Node.js\n<script>do not run</script>",
        jobTitle: "Full Stack Developer",
        matchedKeywords: ["React", "Node.js"]
    })

    assert.ok(html.includes("Developer"))
    assert.ok(html.includes("React &amp; Node.js"))
    assert.ok(html.includes("&lt;script&gt;do not run&lt;/script&gt;"))
    assert.ok(html.includes("Role keywords already present in your resume"))
    assert.ok(!html.includes("<script>do not run</script>"))
    assert.ok(!html.includes("Led execution of projects"))
})
