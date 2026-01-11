import type { StreamStep } from "../types/ChatTypes";

export const parseStreamChunk = (chunk: string): StreamStep[] => {
    const steps: StreamStep[] = [];
    const lines = chunk.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('step:')) {
            const stepMatch = line.match(/step:\s*(\S+)/);
            if (stepMatch) {
                const stepName = stepMatch[1];
                if (i + 1 < lines.length) {
                    const contentLine = lines[i + 1].trim();
                    if (contentLine.startsWith('Content:')) {
                        const content = contentLine.substring('Content:'.length).trim();
                        steps.push({
                            step: stepName,
                            content: content,
                            rawContent: line + '\n' + contentLine
                        });
                        i++;
                    }
                }
            }
        }
    }

    return steps;
};

export const parseContent = (contentStr: string): string => {
    try {
        const cleanContent = contentStr.replace(/Some Previous Info: No Info\s*/g, '').trim();
        let jsonStr = cleanContent;

        try {
            jsonStr = jsonStr.replace(/\{'/g, '{"').replace(/':/g, '":').replace(/,\s*'/g, ', "').replace(/'\}/g, '"}');
            jsonStr = jsonStr.replace(/\['/g, '["').replace(/'\]/g, '"]');

            const parsed = JSON.parse(jsonStr);

            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].text) {
                return parsed[0].text;
            }
        } catch (e) {
            console.log("JSON parse failed, trying manual extraction");
        }

        const textMatch = cleanContent.match(/'text':\s*'((?:[^'\\]|\\.)*)'/s);
        if (textMatch) {
            return textMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"');
        }

        const textMatch2 = cleanContent.match(/"text":\s*"((?:[^"\\]|\\.)*)"/s);
        if (textMatch2) {
            return textMatch2[1]
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"');
        }

        return cleanContent;
    } catch (error) {
        console.error("Error parsing content:", error);
        return contentStr;
    }
};

export const shouldShowContent = (stepName: string): boolean => {
    const hideContentSteps = ['semantic_guardrail', 'llm_guardrail', 'assembler'];
    return !hideContentSteps.includes(stepName);
};