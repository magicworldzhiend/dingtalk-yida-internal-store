/**
 * 仅保留待支付订单总数，避免将订单明细数据写入首页页面状态。
 */
function didFetch(content) {
    return {
        totalCount: Number(content.totalCount || 0)
    };
}
