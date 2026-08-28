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

            // 新记录保存为关联对象数组；历史记录仍可能是 _id 的双层 JSON 字符串。
            let relationValue = item.formData.associationFormField_mt7zpx6h
                || item.formData.associationFormField_mt7zpx6h_id
                || [];

            try {
                if (typeof relationValue === 'string') {
                    relationValue = JSON.parse(relationValue);
                }

                if (typeof relationValue === 'string') {
                    relationValue = JSON.parse(relationValue);
                }
            } catch (error) {
                relationValue = [];
            }

            const relationList = Array.isArray(relationValue) ? relationValue : [];
            // 关联对象的 title 是 Banner 配置时写入的业务 SPU_ID。
            const spuId = String((relationList[0] && relationList[0].title) || '');

            return {
                src: src,
                spuId: spuId
            };
        })
        .filter(function (item) {
            return item.src;
        });
}
