// src/cost/billingEngine.js
const RATES = {
    input: 0.000001,      // 标准输入 (Cache Miss): 1.0元/M
    cached: 0.0000001,    // 缓存命中 (Cache Hit 一折): 0.1元/M
    output: 0.000002      // 核心输出 (生成): 2.0元/M
};

module.exports = {
    computeLineTokens: (line) => {
        if (!line || !line.includes('"usage"')) return 0;
        const inM = line.match(/"input_tokens":\s*(\d+)/), outM = line.match(/"output_tokens":\s*(\d+)/), caM = line.match(/"cache_read_input_tokens":\s*(\d+)/);
        return (inM ? parseInt(inM[1],10) : 0) + (outM ? parseInt(outM[1],10) : 0) + (caM ? parseInt(caM[1],10) : 0);
    },
    computeLineCost: (line) => {
        if (!line || !line.includes('"usage"')) return 0;
        const inM = line.match(/"input_tokens":\s*(\d+)/);
        const outM = line.match(/"output_tokens":\s*(\d+)/);
        const caM = line.match(/"cache_read_input_tokens":\s*(\d+)/);
        return ((inM ? parseInt(inM[1],10) : 0) * RATES.input) + 
               ((caM ? parseInt(caM[1],10) : 0) * RATES.cached) + 
               ((outM ? parseInt(outM[1],10) : 0) * RATES.output);
    },
    getInterimCost: (tokens) => (tokens || 0) * RATES.output
};