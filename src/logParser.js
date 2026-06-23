let roundStartWatermark = 0;
let lastAbsoluteTotal = 0;
let interimTokens = 0;
let dayBaseline = 0;

module.exports = {
    resetTurn: () => {
        roundStartWatermark = lastAbsoluteTotal; 
        interimTokens = 0;
    },
    setWatermark: (val) => { lastAbsoluteTotal = val; roundStartWatermark = val; },
    setDayBaseline: (val) => { dayBaseline = val; },
    getRoundTokens: () => Math.max(0, lastAbsoluteTotal - roundStartWatermark),
    getLiveDayTotal: () => dayBaseline + lastAbsoluteTotal,
    parse: (line, isColdStart) => {
        if (!line) return null;
        const hasUsage = line.includes('"usage"');
        
        if (hasUsage) {
            const inputMatch = line.match(/"input_tokens":\s*(\d+)/);
            const outputMatch = line.match(/"output_tokens":\s*(\d+)/);
            const cacheMatch = line.match(/"cache_read_input_tokens":\s*(\d+)/);
            const input = inputMatch ? parseInt(inputMatch[1], 10) : 0;
            const output = outputMatch ? parseInt(outputMatch[1], 10) : 0;
            const cache = cacheMatch ? parseInt(cacheMatch[1], 10) : 0;
            lastAbsoluteTotal = input + output + cache;
            interimTokens = Math.max(0, lastAbsoluteTotal - roundStartWatermark);
        }
        
        const currentRoundTokens = Math.max(interimTokens, lastAbsoluteTotal - roundStartWatermark);
        const liveDayTotal = dayBaseline + lastAbsoluteTotal;
        
        let detailText = '多维内核深度思考';
        if (line.includes('"tool_use"') || line.includes('"tool_result"') || line.includes('"stdout"')) {
            detailText = '正在执行沙箱工具';
        }
        const textMatches = line.match(/"(?:text|content|thought|argument|name|stdout|stderr)":"((?:[^"\\]|\\.)*)"/g);
        if (textMatches) {
            textMatches.forEach(m => {
                const payloadLen = m.length - 12;
                if (payloadLen > 0) interimTokens += Math.ceil(payloadLen / 3);
            });
        } else if (line.length > 20) {
            interimTokens += Math.ceil(line.length / 5);
        }
        
        // 【核心单向累加】：严格只做加法，任何中间层波折一律不得回滚降低
        const finalInterim = Math.max(interimTokens, lastAbsoluteTotal - roundStartWatermark);
        return { action: 'send', state: 'working', detail: detailText, tokens: String(finalInterim), dayTokens: String(liveDayTotal) };
    }
};