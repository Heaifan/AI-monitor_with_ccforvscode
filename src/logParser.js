let watermark = 0;
let lastAbsoluteTotal = 0;
let interimTokens = 0;

module.exports = {
    resetTurn: () => { interimTokens = 0; },
    setWatermark: (val) => { watermark = val; lastAbsoluteTotal = val; },
    parse: (line, isColdStart) => {
        if (!line) return null;
        
        const hasUsage = line.includes('"usage"');
        const hasEndTurn = line.includes('"stop_reason":"end_turn"');
        
        // 1. 若当前行包含确凿用量，先无条件提取并更新大盘绝对值
        if (hasUsage) {
            const inputMatch = line.match(/"input_tokens":\s*(\d+)/);
            const outputMatch = line.match(/"output_tokens":\s*(\d+)/);
            const cacheMatch = line.match(/"cache_read_input_tokens":\s*(\d+)/);
            const input = inputMatch ? parseInt(inputMatch[1], 10) : 0;
            const output = outputMatch ? parseInt(outputMatch[1], 10) : 0;
            const cache = cacheMatch ? parseInt(cacheMatch[1], 10) : 0;
            
            lastAbsoluteTotal = input + output + cache;
            interimTokens = Math.max(0, lastAbsoluteTotal - watermark);
        }
        
        // 2. 【核心时序修复】：若当前行判定为回合完工（无论是否复合包含 usage）
        // 必须死锁在水位线提升之前，精准换算出当前 Turn 的物理净增量
        if (hasEndTurn) {
            const finalDelta = Math.max(0, lastAbsoluteTotal - watermark);
            watermark = lastAbsoluteTotal; // 换算完毕后，水位线指针才允许安全后移
            interimTokens = 0;
            return { action: 'send', state: 'done', tokens: String(finalDelta), dayTokens: String(lastAbsoluteTotal) };
        }
        
        // 3. 若只是中途的标准计价行（非完工状态）
        if (hasUsage) {
            return { action: 'send', state: 'working', detail: '多维内核深度思考', tokens: String(interimTokens), dayTokens: String(lastAbsoluteTotal) };
        }
        
        // 4. 流式文本负载动态高频内插追溯
        if (line.includes('"text"') || line.includes('"content"') || line.includes('"thought"')) {
            const textMatches = line.match(/"(?:text|content|thought|argument)":"((?:[^"\\]|\\.)*)"/g);
            if (textMatches) {
                textMatches.forEach(m => {
                    const payloadLen = m.length - 12;
                    if (payloadLen > 0) interimTokens += Math.ceil(payloadLen / 3);
                });
            }
            return { action: 'send', state: 'working', detail: '多维内核深度思考', tokens: String(interimTokens), dayTokens: String(watermark + interimTokens) };
        }
        
        return null;
    }
};