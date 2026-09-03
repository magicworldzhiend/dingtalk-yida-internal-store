/**
 * Banner 渐变主色选择器。
 * 颜色实际持久化到同一弹窗内的只读文本组件 textField_mtl4dxuh。
 */
function render(me, state, data, ctx) {
    var color = String(this.state.bannerGradientColor || '#182334');

    return (
        <div class="banner-color-picker">
            <input
                class="banner-color-picker-input"
                type="color"
                value={color}
                aria-label="选择 Banner 渐变主色"
                onChange={(event) => {
                    var nextColor = event.target.value.toUpperCase();

                    this.applyBannerGradientColor(nextColor);
                }}
            />
            <span class="banner-color-picker-value">{color}</span>
        </div>
    );
}
