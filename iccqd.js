/**
 * cron "0 0 * * *"
 * export iccck="token1 token2 token3"
*/
const axios = require('axios');
const qs = require('querystring');

class LvcchongOrder {
    constructor() {
        this.config = {
            baseURL: 'https://appapi.lvcchong.com',
            timeout: 10000,
            retryCount: 3,
            retryDelay: 2000
        };
        
        // 从环境变量获取配置
        this.token = process.env.iccck || '';
        this.productId = process.env.LVC_PRODUCT_ID || '855';
        this.price = process.env.LVC_PRICE || '2000';
        this.quantity = process.env.LVC_QUANTITY || '1';
    }

    // 延迟函数
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 创建请求头
    createHeaders() {
        return {
            'Host': 'appapi.lvcchong.com',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
            'token': this.token,
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.62(0x18003e33) NetType/4G Language/zh_CN miniProgram/wx0132aa93a8b214ae',
            'Referer': 'https://h5.lvcchong.com/',
            'Origin': 'https://h5.lvcchong.com',
        };
    }

    // 创建请求体
    createBody() {
        return qs.stringify({
            id: this.productId,
            price: this.price,
            purchaseNumber: this.quantity,
            orderSource: 3,
            channelName: '微信小程序'
        });
    }

    // 带重试机制的请求
    async requestWithRetry(url, data, config, retries = this.config.retryCount) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.post(url, data, config);
                return response;
            } catch (error) {
                if (i === retries - 1) throw error;
                console.log(`请求失败，${this.config.retryDelay/1000}秒后重试 (${i+1}/${retries})`);
                await this.sleep(this.config.retryDelay);
            }
        }
    }

    // 创建订单
    async createOrder() {
        // 验证token
        if (!this.token) {
            throw new Error('未找到环境变量 iccck，请先在青龙面板中设置该变量');
        }

        const url = `${this.config.baseURL}/appBaseApi/scoreUser/score/createScoreOrder`;
        const headers = this.createHeaders();
        const data = this.createBody();

        console.log('开始创建订单...');
        console.log('商品ID:', this.productId);
        console.log('价格:', this.price);
        console.log('数量:', this.quantity);

        try {
            const response = await this.requestWithRetry(url, data, {
                headers: headers,
                timeout: this.config.timeout
            });

            console.log('✅ 订单创建成功');
            console.log('响应状态:', response.status);
            
            if (response.data) {
                console.log('响应数据:', JSON.stringify(response.data, null, 2));
            }
            
            return response.data;
        } catch (error) {
            console.error('❌ 订单创建失败');
            
            if (error.response) {
                console.error('错误状态码:', error.response.status);
                console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
            } else if (error.request) {
                console.error('无响应 received:', error.message);
            } else {
                console.error('请求错误:', error.message);
            }
            
            throw error;
        }
    }
}

// 执行脚本
(async () => {
    try {
        const order = new LvcchongOrder();
        await order.createOrder();
    } catch (error) {
        console.error('脚本执行失败:', error.message);
        process.exit(1);
    }
})();