import ky, {type KyResponse, type AfterResponseHook, type NormalizedOptions} from 'ky';
import {
    createParser,
    type EventSourceParser
} from 'eventsource-parser';

export interface SSEOptions {
    onData: (data: string) => void;
    onEvent?: (event: any) => void;
    onCompleted?: (error?: Error) => void;
    onAborted?: () => void;
    onReconnectInterval?: (interval: number) => void;
}

export const createSSEHook = (options: SSEOptions): AfterResponseHook => {
    const hook: AfterResponseHook = async (request: Request, _options: NormalizedOptions, response: KyResponse) => {
        if (!response.ok || !response.body) {
            return;
        }

        let completed: boolean = false;
        const innerOnCompleted = (error?: Error): void => {
            if (completed) {
                return;
            }

            completed = true;
            options.onCompleted?.(error);
        };

        const isAborted: boolean = false;

        const reader: ReadableStreamDefaultReader<Uint8Array> = response.body.getReader();

        const decoder: TextDecoder = new TextDecoder('utf8');

        const parser: EventSourceParser = createParser({
            onEvent: (event) => {
                if (event.data) {
                    options.onEvent?.(event);
                    // 处理单 message 多 data字段的场景
                    const dataArray: string[] = event.data.split('\n');
                    for (const data of dataArray) {
                        options.onData(data);
                    }
                }
            }
        });

        const read = (): void => {
            if (isAborted) {
                return;
            }

            reader.read().then((result: ReadableStreamReadResult<Uint8Array>) => {
                if (result.done) {
                    innerOnCompleted();
                    return;
                }

                parser.feed(decoder.decode(result.value, {stream: true}));

                read();
            }).catch(error => {
                /**
                 * 判断是否是手动调用 abortController.abort() 而停止的请求
                 */
                if (request.signal.aborted) {
                    options.onAborted?.();
                    return;
                }

                innerOnCompleted(error as Error);
            });
        };

        read();

        return response;
    };

    return hook;
};

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    id?: string;
}

export interface ChatStreamOptions {
    /** 模型调用接口地址 */
    endpoint: string;
    /** 消息列表 */
    messages: ChatMessage[];
    /** 应用id */
    apiId: string;
    /** 流式返回更新回调 */
    onUpdate: (content: string) => void;
    /** 模型调用完成回调 */
    onComplete: () => void;
    /** 模型调用完成回调 */
    onError: (error: Error) => void;
    /** 中断控制 */
    signal?: AbortSignal;
}

export const sendChatStream = async (options: ChatStreamOptions): Promise<void> => {
    const {messages, onUpdate, onComplete, onError, signal} = options;

    let currentContent = '';

    // 创建一个 Promise 来等待流式输出完成
    return new Promise<void>((resolve, reject) => {
        const sseHook = createSSEHook({
            onData: (data: string) => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.choices?.[0]?.delta?.content) {
                        currentContent += parsed.choices[0].delta.content;
                        onUpdate(currentContent);
                    }
                } catch {
                    console.warn('Failed to parse SSE data:', data);
                }
            },
            onCompleted: (error?: Error) => {
                if (error) {
                    onError(error);
                    reject(error);
                } else {
                    onComplete();
                    resolve();
                }
            },
            onAborted: () => {
                console.log('Stream aborted');
                resolve();
            }
        });

        ky.post(options.endpoint, {
            json: {
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                enable_thinking: false
            },
            headers: {
                'X-App-Id': options.apiId,
                'Content-Type': 'application/json'
            },
            signal,
            hooks: {
                afterResponse: [sseHook]
            }
        }).catch(error => {
            if (!signal?.aborted) {
                onError(error as Error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
};