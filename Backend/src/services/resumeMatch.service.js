const stopWords = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is",
    "it", "of", "on", "or", "our", "the", "their", "this", "to", "with", "will", "you",
    "about", "across", "ability", "candidate", "experience", "including", "looking", "position",
    "provide", "required", "requirements", "responsibilities", "role", "skills", "strong", "team",
    "work", "working"
])

function normalizeText(value) {
    return String(value || "").toLowerCase()
        .replace(/[^a-z0-9+#.]+/g, " ")
        .replace(/\.+(?=\s|$)/g, "")
        .replace(/\s+/g, " ")
        .trim()
}

function getTokens(value) {
    return normalizeText(value).split(" ").filter((token) => token && !stopWords.has(token))
}

function getTermCounts(tokens) {
    const counts = new Map()
    tokens.forEach((token, index) => {
        counts.set(token, (counts.get(token) || 0) + 1)
        if (index < tokens.length - 1) {
            const bigram = `${token} ${tokens[index + 1]}`
            counts.set(bigram, (counts.get(bigram) || 0) + 1)
        }
    })
    return counts
}

function extractKeywords(value, limit = 12) {
    const tokens = normalizeText(value).split(" ").filter(Boolean)
    const scores = new Map()
    const addScore = (term, score) => scores.set(term, (scores.get(term) || 0) + score)

    tokens.forEach((token, index) => {
        if (token.length >= 3 && !stopWords.has(token)) {
            addScore(token, 1)
        }
        const nextToken = tokens[index + 1]
        if (token.length >= 3 && nextToken?.length >= 3
            && !stopWords.has(token) && !stopWords.has(nextToken)) {
            addScore(`${token} ${nextToken}`, 1.5)
        }
    })

    return [...scores.entries()]
        .sort(([leftTerm, leftScore], [rightTerm, rightScore]) => (
            rightScore - leftScore || leftTerm.localeCompare(rightTerm)
        ))
        .slice(0, limit)
        .map(([term]) => term)
}

function hasWholePhrase(normalizedText, phrase) {
    const normalizedPhrase = normalizeText(phrase)
    return normalizedPhrase && normalizedText.includes(` ${normalizedPhrase} `)
}

function cosineSimilarity(leftCounts, rightCounts) {
    const terms = new Set([...leftCounts.keys(), ...rightCounts.keys()])
    let dotProduct = 0
    let leftMagnitude = 0
    let rightMagnitude = 0

    for (const term of terms) {
        const documentsWithTerm = Number(leftCounts.has(term)) + Number(rightCounts.has(term))
        const inverseDocumentFrequency = Math.log(3 / (documentsWithTerm + 1)) + 1
        const leftWeight = (leftCounts.get(term) || 0) * inverseDocumentFrequency
        const rightWeight = (rightCounts.get(term) || 0) * inverseDocumentFrequency

        dotProduct += leftWeight * rightWeight
        leftMagnitude += leftWeight ** 2
        rightMagnitude += rightWeight ** 2
    }

    if (!leftMagnitude || !rightMagnitude) return 0
    return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude))
}

function scoreResumeForJob({ resumeText, job }) {
    const jobText = [job.title, job.description, ...(job.requiredSkills || [])].join(" ")
    const resumeTokens = getTokens(resumeText)
    const jobTokens = getTokens(jobText)
    const resumeCounts = getTermCounts(resumeTokens)
    const jobCounts = getTermCounts(jobTokens)
    const cosineScore = Math.round(cosineSimilarity(resumeCounts, jobCounts) * 100)
    const normalizedResume = ` ${normalizeText(resumeText)} `
    const requiredSkills = job.requiredSkills || []
    const matchedSkills = requiredSkills.filter((skill) => hasWholePhrase(normalizedResume, skill))
    const matchedSkillSet = new Set(matchedSkills.map(normalizeText))
    const missingSkills = requiredSkills.filter((skill) => !matchedSkillSet.has(normalizeText(skill)))
    const keywordScore = requiredSkills.length
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0
    const fitScore = Math.round(cosineScore * 0.6 + keywordScore * 0.4)
    const jobKeywords = [...new Map([
        ...requiredSkills,
        ...extractKeywords([job.title, job.description].join(" "))
    ].filter((keyword) => normalizeText(keyword))
        .map((keyword) => [normalizeText(keyword), keyword])).values()]
    const resumeKeywords = extractKeywords(resumeText, 18)
    const matchedKeywords = jobKeywords.filter((keyword) => hasWholePhrase(normalizedResume, keyword))
    const matchedKeywordSet = new Set(matchedKeywords.map(normalizeText))
    const missingKeywords = jobKeywords.filter((keyword) => !matchedKeywordSet.has(normalizeText(keyword)))

    return {
        fitScore,
        cosineScore,
        keywordScore,
        matchedSkills,
        missingSkills,
        keywords: { job: jobKeywords, resume: resumeKeywords, matched: matchedKeywords, missing: missingKeywords }
    }
}

module.exports = { extractKeywords, scoreResumeForJob }
