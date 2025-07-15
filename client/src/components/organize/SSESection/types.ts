
export interface ISSESectionProps {

}



/**
 * Login
 */
export interface ILoginForm {
    userId: string
}

/**
 * Message
 */
export interface IMessageForm {
    message: string
    eventType: 'notification'|'custom'
    selectedUserId: string
}
