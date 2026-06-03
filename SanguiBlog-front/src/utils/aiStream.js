const parseSseBlocks = (buffer, onEvent) => {
    const parts = buffer.split(/\r?\n\r?\n/);
    const rest = parts.pop() ?? '';

    parts.forEach((block) => {
        if (!block.trim()) return;

        let event = 'message';
        const dataLines = [];

        block.split(/\r?\n/).forEach((line) => {
            if (line.startsWith('event:')) {
                event = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trimStart());
            }
        });

        if (!dataLines.length) return;

        const rawData = dataLines.join('\n');
        let data = rawData;
        try {
            data = JSON.parse(rawData);
        } catch {
            // Keep raw text payload when the block is not valid JSON.
        }

        onEvent(event, data);
    });

    return rest;
};

export const consumeSseStream = async ({ reader, onChunk, onComplete, onError, timeoutMs = 0 }) => {
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let terminalState = null;
    let terminalError = null;
    let timeoutTimerId = null;

    const buildTimeoutError = () => {
        const error = new Error('AI 服务响应超时，请稍后再试');
        error.code = 'AI_STREAM_TIMEOUT';
        return error;
    };

    const buildTerminalError = () => {
        const error = new Error(terminalError?.message || 'AI 服务调用失败，请稍后再试。');
        if (terminalError) {
            error.payload = terminalError;
        }
        return error;
    };

    const clearStreamTimeout = () => {
        if (timeoutTimerId !== null) {
            globalThis.clearTimeout(timeoutTimerId);
            timeoutTimerId = null;
        }
    };

    const handleEvent = (event, data) => {
        if (terminalState) return;

        if (event === 'chunk') {
            onChunk?.(data?.text || '');
            return;
        }

        if (event === 'complete') {
            terminalState = 'complete';
            clearStreamTimeout();
            onComplete?.(data);
            void reader.cancel?.();
            return;
        }

        if (event === 'error') {
            terminalState = 'error';
            clearStreamTimeout();
            terminalError = typeof data === 'object' && data !== null
                ? data
                : { message: data || 'AI 服务调用失败，请稍后再试。' };
            onError?.(terminalError);
            void reader.cancel?.();
        }
    };

    try {
        while (true) {
            let readResult;
            if (timeoutMs > 0) {
                readResult = await Promise.race([
                    reader.read(),
                    new Promise((_, reject) => {
                        timeoutTimerId = globalThis.setTimeout(() => {
                            timeoutTimerId = null;
                            reject(buildTimeoutError());
                        }, timeoutMs);
                    })
                ]);
            } else {
                readResult = await reader.read();
            }
            clearStreamTimeout();

            const { value, done } = readResult;
            buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
            buffer = parseSseBlocks(buffer, handleEvent);

            if (terminalState === 'complete') {
                return;
            }

            if (terminalState === 'error') {
                throw buildTerminalError();
            }

            if (done) {
                if (buffer.trim()) {
                    parseSseBlocks(`${buffer}\n\n`, handleEvent);
                    buffer = '';
                }

                if (terminalState === 'complete') {
                    return;
                }

                if (terminalState === 'error') {
                    throw buildTerminalError();
                }

                return;
            }
        }
    } catch (error) {
        clearStreamTimeout();
        if (terminalState === 'complete') {
            return;
        }

        if (error?.code === 'AI_STREAM_TIMEOUT') {
            void reader.cancel?.();
        }

        throw error;
    }
};

export { parseSseBlocks };
