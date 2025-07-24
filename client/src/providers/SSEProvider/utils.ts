

export type SSEEvent = {
    id?: string;
    event?: string;
    data?: { message: string, type: string, createdAt: string };
};

/**
 * 解析 decodeSSEMessage
 * @param sseValue
 */
export function decodeSSEMessage(sseValue: Uint8Array<ArrayBufferLike>) {
    const chunk = new TextDecoder().decode(sseValue);
    const lines = chunk.split('\n');

    let eventBuffer: SSEEvent = {};


    for (const line of lines) {

        if (line.startsWith('id: ')) {
            const match = line.match(/^(\w+):\s?(.*)$/);
            if (match) eventBuffer.id = match[2];
        }
        if (line.startsWith('event: ')) {
            const match = line.match(/^(\w+):\s?(.*)$/);
            if (match) eventBuffer.event = match[2];
        }
        if (line.startsWith('data: ')) {
            const match = line.match(/^(\w+):\s?(.*)$/);
            if (match) eventBuffer.data = JSON.parse(match[2]);
        }
    }
    return eventBuffer;
}
