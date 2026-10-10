const test = require("node:test")
const assert = require("node:assert/strict")
const { extractKeywords, scoreResumeForJob } = require("../src/services/resumeMatch.service")

test("resume scoring reports cosine fit, exact skill coverage, and gaps", () => {
    const result = scoreResumeForJob({
        resumeText: "Full Stack Developer experienced with React, Node.js and JavaScript building web applications.",
        job: {
            title: "Full Stack Developer",
            description: "Build and maintain full stack web applications.",
            requiredSkills: ["React", "Node.js", "PostgreSQL"]
        }
    })

    assert.equal(result.keywordScore, 67)
    assert.deepEqual(result.matchedSkills, ["React", "Node.js"])
    assert.deepEqual(result.missingSkills, ["PostgreSQL"])
    assert.ok(result.keywords.matched.includes("React"))
    assert.ok(result.keywords.matched.includes("Node.js"))
    assert.ok(result.keywords.missing.includes("PostgreSQL"))
    assert.ok(result.keywords.resume.includes("web applications"))
    assert.ok(result.cosineScore > 0)
    assert.equal(result.fitScore, Math.round(result.cosineScore * 0.6 + result.keywordScore * 0.4))
})

test("required skill matching avoids partial-word matches", () => {
    const result = scoreResumeForJob({
        resumeText: "Google Cloud engineer",
        job: {
            title: "Go Developer",
            description: "Build backend services.",
            requiredSkills: ["Go"]
        }
    })

    assert.equal(result.keywordScore, 0)
    assert.equal(result.cosineScore, 0)
    assert.deepEqual(result.matchedSkills, [])
    assert.deepEqual(result.missingSkills, ["Go"])
})

test("keyword extraction ranks repeated technical terms and ignores generic job language", () => {
    const keywords = extractKeywords(
        "Required skills include Python and cloud deployment. Python experience is preferred for cloud APIs."
    )

    assert.ok(keywords.includes("python"))
    assert.ok(keywords.includes("cloud"))
    assert.ok(!keywords.includes("experience"))
    assert.ok(!keywords.includes("required"))
})
