function didFetch(content) {
    const spuList = content.data || [];
    console.log('首页 SPU 原始数据', spuList[0]);
    console.log('SPU 数量', spuList.length);
    return spuList;
}