// src/cost/billingEngine.js
const DEEPSEEK_V4_FLASH_RATES = {
    cacheHitInputPerToken: 0.02 / 1_000_000,
    cacheMissInputPerToken: 1 / 1_000_000,
    outputPerToken: 2 / 1_000_000
};

function emptyUsage() {
    return {
        messageId: null,
        model: null,
        inputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0
    };
}

function computeUsageCost(usage) {
    const cacheMissInput = (usage.inputTokens || 0) + (usage.cacheCreationInputTokens || 0);
    return (usage.cacheReadInputTokens || 0) * DEEPSEEK_V4_FLASH_RATES.cacheHitInputPerToken +
        cacheMissInput * DEEPSEEK_V4_FLASH_RATES.cacheMissInputPerToken +
        (usage.outputTokens || 0) * DEEPSEEK_V4_FLASH_RATES.outputPerToken;
}

function normalizeUsage(rawUsage, messageId, model) {
    const usage = {
        ...emptyUsage(),
        messageId,
        model,
        inputTokens: rawUsage.input_tokens || 0,
        cacheReadInputTokens: rawUsage.cache_read_input_tokens || 0,
        cacheCreationInputTokens: rawUsage.cache_creation_input_tokens || 0,
        outputTokens: rawUsage.output_tokens || 0
    };
    usage.totalTokens = usage.inputTokens + usage.cacheReadInputTokens +
        usage.cacheCreationInputTokens + usage.outputTokens;
    usage.cost = computeUsageCost(usage);
    return usage;
}

function parseJsonUsage(line) {
    let row;
    try {
        row = JSON.parse(line);
    } catch (e) {
        return null;
    }

    const message = row.message || row.response || row;
    const usage = message.usage || row.usage;
    if (!usage) return null;

    return normalizeUsage(
        usage,
        message.id || row.message_id || row.uuid || null,
        message.model || row.model || null
    );
}

function parseRegexUsage(line) {
    if (!line || !line.includes('"usage"')) return null;

    const inputMatch = line.match(/"input_tokens":\s*(\d+)/);
    const outputMatch = line.match(/"output_tokens":\s*(\d+)/);
    const cacheReadMatch = line.match(/"cache_read_input_tokens":\s*(\d+)/);
    const cacheCreationMatch = line.match(/"cache_creation_input_tokens":\s*(\d+)/);
    const messageIdMatch = line.match(/"id":\s*"([^"]+)"/);
    const modelMatch = line.match(/"model":\s*"([^"]+)"/);

    if (!inputMatch && !outputMatch && !cacheReadMatch && !cacheCreationMatch) return null;

    return normalizeUsage({
        input_tokens: inputMatch ? parseInt(inputMatch[1], 10) : 0,
        output_tokens: outputMatch ? parseInt(outputMatch[1], 10) : 0,
        cache_read_input_tokens: cacheReadMatch ? parseInt(cacheReadMatch[1], 10) : 0,
        cache_creation_input_tokens: cacheCreationMatch ? parseInt(cacheCreationMatch[1], 10) : 0
    }, messageIdMatch ? messageIdMatch[1] : null, modelMatch ? modelMatch[1] : null);
}

function parseLineUsage(line) {
    if (!line || !line.includes('"usage"')) return null;
    return parseJsonUsage(line) || parseRegexUsage(line);
}

function sumUsages(usages) {
    const total = emptyUsage();
    usages.forEach((usage) => {
        total.inputTokens += usage.inputTokens || 0;
        total.cacheReadInputTokens += usage.cacheReadInputTokens || 0;
        total.cacheCreationInputTokens += usage.cacheCreationInputTokens || 0;
        total.outputTokens += usage.outputTokens || 0;
        total.totalTokens += usage.totalTokens || 0;
        total.cost += usage.cost || 0;
    });
    return total;
}

function computeUniqueUsage(lines) {
    const seen = new Map();
    (lines || []).forEach((line, index) => {
        const usage = parseLineUsage(line);
        if (!usage) return;
        const key = usage.messageId || `${index}:${usage.totalTokens}:${usage.cost}`;
        seen.set(key, usage);
    });
    return sumUsages([...seen.values()]);
}

module.exports = {
    rates: DEEPSEEK_V4_FLASH_RATES,
    parseLineUsage,
    computeUniqueUsage,
    computeLineTokens: (line) => {
        const usage = parseLineUsage(line);
        return usage ? usage.totalTokens : 0;
    },
    computeLineCost: (line) => {
        const usage = parseLineUsage(line);
        return usage ? usage.cost : 0;
    },
    getInterimCost: (tokens) => (tokens || 0) * DEEPSEEK_V4_FLASH_RATES.outputPerToken
};
