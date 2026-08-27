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
            const imageList = JSON.parse(
                item.formData.imagefield_0Qbn7EcV || '[]'
            );
            const image = imageList[0] || {};

            let src = image.downloadUrl || image.url || image.previewUrl || '';
            if (src && !/^https?:\/\//i.test(src)) {
                src = domain + src;
            }

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