
// 格式化日期函數：顯示 月/日 時:分:秒
export function formatDateTime(date) {
    const month = date.getMonth() + 1 // getMonth() 返回 0-11
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')

    return `${month}/${day} ${hours}:${minutes}:${seconds}`
}
