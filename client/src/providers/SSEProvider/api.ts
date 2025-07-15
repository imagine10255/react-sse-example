import {baseApiUrl} from "@/providers/SSEProvider/config";

export const api = {
    sse: `${baseApiUrl}/sse`,
    notifyUser: `${baseApiUrl}/notifyUser`,
    trigger: `${baseApiUrl}/trigger`,
    users: `${baseApiUrl}/users`,
}
