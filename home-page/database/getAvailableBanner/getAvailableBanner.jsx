/**
 * 将已启用的 Banner 配置转换为 Swiper 所需的展示数据。
 */
function didFetch(content) {
    const domain = 'https://jepa8c.aliwork.com';

    function resolveGradientBackground(value) {
        var color = String(value || '').trim();
        var hexMatch = color.match(/^#?([0-9a-fA-F]{6})$/);
        var red = 24;
        var green = 35;
        var blue = 52;

        if (hexMatch) {
            var hex = hexMatch[1];
            red = parseInt(hex.slice(0, 2), 16);
            green = parseInt(hex.slice(2, 4), 16);
            blue = parseInt(hex.slice(4, 6), 16);
        }

        return 'linear-gradient(to top, rgba(' + red + ', ' + green + ', '
            + blue + ', 0.88) 0%, rgba(' + red + ', ' + green + ', '
            + blue + ', 0.42) 32%, rgba(' + red + ', ' + green + ', '
            + blue + ', 0) 60%)';
    }

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
            var imageList = [];

            try {
                imageList = JSON.parse(item.formData.imagefield_0Qbn7EcV || '[]');
            } catch (error) {
                console.error('首页 Banner 图片数据解析失败：', item.formInstId, error);
            }

            const image = Array.isArray(imageList) ? (imageList[0] || {}) : {};

            let src = image.downloadUrl || image.url || image.previewUrl || '';
            if (src && !/^https?:\/\//i.test(src)) {
                src = domain + src;
            }

            // 普通文本字段作为 Banner 跳转参数与删除自动化的唯一关联键。
            const spuId = String(item.formData.textField_mtl0x4j7 || '');
            const gradientBackground = resolveGradientBackground(
                item.formData.textField_mtl49htj
            );

            return {
                src: src,
                spuId: spuId,
                remark: String(item.formData.textField_mtl49hth || '').trim(),
                gradientBackground: gradientBackground
            };
        })
        .filter(function (item) {
            return item.src;
        });
}
