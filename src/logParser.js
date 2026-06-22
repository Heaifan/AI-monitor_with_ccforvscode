let watermark = 0;
let lastAbsoluteTotal = 0;

module.exports = {
    resetTurn: () => {},
    setWatermark: (val) => { watermark = val; },
    parse: (line, isColdStart) => {
        if (!line) return null;
        if (line.includes('"stop_reason":"end_turn"')) {
            watermark = lastAbsoluteTotal; // 锁死当前绝对值作为下一轮的起步水位线
            return { action: 'send', state: 'done', tokens: String(lastAbsoluteTotal - watermark), dayTokens: String(lastAbsoluteTotal) };
        }
        if (line.includes('"usage"')) {
            const inputMatch = line.match(/"input_tokens":\s*(\d+)/);
            const outputMatch = line.match(/"output_tokens":\s*(\d+)/);
            const cacheMatch = line.match(/"cache_read_input_tokens":\s*(\d+)/);
            const input = inputMatch ? parseInt(inputMatch[1], 10) : 0;
            const output = outputMatch ? parseInt(outputMatch[1], 10) : 0;
            const cache = cacheMatch ? parseInt(cacheMatch[1], 10) : 0;
            
            lastAbsoluteTotal = input + output + cache;
            const turnDelta = Math.max(0, lastAbsoluteTotal - watermark); // 核心：时域差分净增量
            
            return {
                action: 'send', state: 'working', detail: '多维内核深度思考',
                tokens: String(turnDelta), dayTokens: String(lastAbsoluteTotal)
            };
        }
        return null;
    }
};