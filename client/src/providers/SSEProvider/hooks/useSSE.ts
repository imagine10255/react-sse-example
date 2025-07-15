import {useContext} from "react";
import {SSEContext} from "@/providers/SSEProvider/sseContext";

/**
 * SSE
 */
export const useSSE = () => {
    const context = useContext(SSEContext);
    if (context === undefined) {
        throw new Error('useSSE must be used within a SSEProvider');
    }
    return context;
};
