function didFetch(content) {
    const skuList = content.data || [];
    console.log('首页 SKU 原始数据', skuList[0]);
    console.log('SKU 数量', skuList.length);
    return skuList;
}