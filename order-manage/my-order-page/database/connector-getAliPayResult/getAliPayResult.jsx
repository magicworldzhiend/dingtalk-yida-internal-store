function fit(response) {
    // 接口返回值会默认增加一层包裹，解析时需注意
    const content = (response.content !== undefined) ? response.content : response;
    // 连接器服务的返回值
    const serviceReturnValue = (content && content.serviceReturnValue !== undefined) ? content.serviceReturnValue : content;

    const error = {
        message: response.errorMsg ||
            (response.errors && response.errors[0] && response.errors[0].msg) ||
            response.content || '远程数据源请求出错，success is false',
    };
    let success = true;
    if (response.success !== undefined) {
        success = response.success;
    } else if (response.hasError !== undefined) {
        success = !response.hasError;
    }
    return {
        content: serviceReturnValue || content,
        success,
        error,
    };
}