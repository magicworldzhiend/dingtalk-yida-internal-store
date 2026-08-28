/**
 * 将 SKU 查询响应标准化为分页对象，供页面 JS 判断 SKU 是否已全部加载。
 */
function didFetch(content) {
    return {
        // SKU 顶层记录内包含规格明细子表，分页按顶层记录计算。
        data: Array.isArray(content.data) ? content.data : [],
        totalCount: Number(content.totalCount || 0),
        currentPage: Number(content.currentPage || 1)
    };
}
