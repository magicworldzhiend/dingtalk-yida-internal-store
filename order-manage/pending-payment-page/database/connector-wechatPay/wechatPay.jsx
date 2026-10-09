/**
 * 保留微信支付服务业务响应，由待付款页按 action 校验并消费。
 * 不在数据源中转换或记录微信支付密钥、证书及原始敏感报文。
 */
function fit(response) {
    const content = response && response.content !== undefined ? response.content : response;
    return {
        content: content && content.serviceReturnValue !== undefined
            ? content.serviceReturnValue
            : content,
    };
}
