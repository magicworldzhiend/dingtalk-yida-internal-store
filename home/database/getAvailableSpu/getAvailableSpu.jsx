/**
 * 将 SPU 查询响应标准化为分页对象，供页面 JS 累计多页数据。
 * 此处保留 totalCount/currentPage，不能只返回数组。
 */
function didFetch(content) {
    return {
        // data 是当前页记录，后续由页面 JS 合并至 homeLoadedSpuRecords。
        data: Array.isArray(content.data) ? content.data : [],
        totalCount: Number(content.totalCount || 0),
        currentPage: Number(content.currentPage || 1)
    };
}
