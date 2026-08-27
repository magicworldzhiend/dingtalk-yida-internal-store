/**
 * 将已启用的 Banner 配置转换为 Swiper 所需的 { src, link } 数组。
 */
function didFetch(content) {
    const domain = 'https://jepa8c.aliwork.com';

    return (content.data || [])
        .filter(function (item) {
            return item.formData.radiofield_9aVrQD8v === '启用';
        })
        .sort(function (a, b) {
            return Number(a.formData.numberfield_4BCfVwCO || 0)
                - Number(b.formData.numberfield_4BCfVwCO || 0);
        })
        .map(function (item) {
            // 轮播图字段以宜搭图片对象数组的 JSON 字符串持久化。
            const imageList = JSON.parse(
                item.formData.imagefield_0Qbn7EcV || '[]'
            );
            const image = imageList[0] || {};

            let src = image.downloadUrl || image.url || image.previewUrl || '';
            if (src && !/^https?:\/\//i.test(src)) {
                src = domain + src;
            }

            // 关联字段保存为 JSON 字符串；解析后读取首个关联 SPU 的实例 ID。
            const relationList = JSON.parse(
                item.formData.associationFormField_mt7zpx6h_id || '[]'
            );
            const spuInstanceId = (relationList[0] && relationList[0].instanceId) || '';

            return {
                src: src,
                link: spuInstanceId ? '/detail?spuId=' + spuInstanceId : ''
            };
        })
        .filter(function (item) {
            return item.src;
        });
}
